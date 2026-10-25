"use client";
import { useState } from "react";
import { z } from "zod";
import { useWorkspace } from "./provider";
import { useAction } from "./controls";
import { analysisReviews, type TrackingReview as Draft } from "@/lib/local/analysis-reviews";
import { formatTime } from "@/lib/video/time";
import { correctionSchema, parseTracking, trackingSchema, trackingCorrectionsSchema,
  validateCorrections, trackingCorrectionKey, trackingFrameIndex, visibleTrackingBox,
  type TrackingCorrection } from "@/features/analysis/tracking-results";
import type { Row } from "@/types/workspace";
import { TacticalProposals } from "./tactical-proposals";
import { tacticalReviewSchema, validateTacticalReview } from "@/features/analysis/tactical-proposals";

const backupSchema = z.object({ schema: z.literal("sesen.tracking-review.v1"),
  report: trackingSchema, corrections: trackingCorrectionsSchema, tactics: tacticalReviewSchema.optional() }).strict();
export type TrackingSelection = { scope: string; frame: number; track: number } | null;
export function TrackingReview({ scope, video, draft, loading, error, timeMs, selection,
  isAvailable, isVisible, onVisibility, onSeek, onSelect }: {
  scope: string; video: Row; draft: Draft | null; loading: boolean; error: string;
  timeMs: number; selection: TrackingSelection; isAvailable: boolean; isVisible: boolean;
  onVisibility: (value: boolean) => void; onSeek: (ms: number) => void;
  onSelect: (frame: number, track: number) => void;
}) {
  const w = useWorkspace(), action = useAction();
  const [filter, setFilter] = useState("");
  const report = draft?.report;
  const index = report ? trackingFrameIndex(report, timeMs) : -1;
  const frame = report?.frames[index];
  const selected = selection?.scope === scope ? selection : null;
  const selectedFrame = selected ? report?.frames[selected.frame] : null;
  const person = selectedFrame?.persons.find((p) => p.track_id === selected?.track);
  const correctionKey = selected && selectedFrame ? trackingCorrectionKey(selected.frame, selectedFrame.scene, selected.track) : "";
  const correction = draft?.corrections[correctionKey];
  const selectedBox = person ? visibleTrackingBox(correction?.box ?? person.box) : null;
  const isEditingFrame = isAvailable && selected?.frame === index;

  async function importFile(file: File) {
    if (file.size > 10 * 1024 * 1024) throw new Error("Tracking import exceeds 10 MB");
    const input: unknown = JSON.parse(await file.text());
    const backup = backupSchema.safeParse(input);
    const incoming = parseTracking(backup.success ? backup.data.report : input, {
      local_fingerprint: video.local_fingerprint, file_size_bytes: video.file_size_bytes,
      duration_ms: video.duration_ms, width: video.width, height: video.height,
    });
    const corrections = validateCorrections(incoming, backup.success ? backup.data.corrections : {});
    const tactics = backup.success && backup.data.tactics ? validateTacticalReview(incoming, corrections, backup.data.tactics) : undefined;
    await analysisReviews.transaction("rw", analysisReviews.tracking, async () => {
      const current = await analysisReviews.tracking.get(scope);
      if (current && JSON.stringify(current.report) !== JSON.stringify(incoming)) throw new Error(w.t("عينة مختلفة محفوظة؛ استخدم جلسة أخرى", "Different sample saved; use another session"));
      if (current && backup.success && (Object.keys(corrections).length || tactics)) throw new Error(w.t("لن نستبدل تصحيحات محفوظة", "Existing corrections will not be overwritten"));
      await analysisReviews.tracking.put({ key: scope, report: incoming, corrections: current?.corrections ?? corrections, tactics: current?.tactics ?? tactics });
    });
    onVisibility(true);
    onSeek(incoming.start_ms);
  }
  async function saveCorrection(input: TrackingCorrection | null) {
    if (!selected || !selectedFrame || !person || !report) throw new Error("Select a track sample");
    await analysisReviews.transaction("rw", analysisReviews.tracking, async () => {
      const current = await analysisReviews.tracking.get(scope);
      if (!current || current.report.source.sha256 !== report.source.sha256) throw new Error("Tracking source changed");
      const corrections = { ...current.corrections };
      if (input) corrections[correctionKey] = correctionSchema.parse(input);
      else delete corrections[correctionKey];
      validateCorrections(current.report, corrections);
      await analysisReviews.tracking.put({ ...current, corrections, tactics: undefined });
    });
  }
  function download() {
    if (!draft) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify({ schema: "sesen.tracking-review.v1", report: draft.report, corrections: draft.corrections, tactics: draft.tactics })], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = "sesen-tracking-review.json"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  if (loading) return <p role="status">{w.t("تحميل عينة التتبّع…", "Loading tracking sample…")}</p>;
  return <section data-slot="tracking-review" className="local-analysis-review tracking-review">
    <header><h3>{w.t("تتبّع الأشخاص وتصحيح الإطارات", "Person tracks and frame corrections")}</h3>
      <p>{w.t("الأرقام مؤقتة داخل المشهد، وليست هويات لاعبين. لا نمد المربعات عبر الاختفاء أو قطع الكاميرا.", "IDs are scene-local tracklets, not players. Boxes are not extended through missing observations or camera cuts.")}</p></header>
    {(error || action.error) && <p role="alert">{error || action.error}</p>}
    <div className="toolbar"><label>{w.t("استيراد عينة تتبّع أو مراجعتها", "Import tracking sample or review")}
      <input type="file" accept=".json,application/json" disabled={action.busy || !video.local_fingerprint}
        onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) void action.run(() => importFile(file)); }} /></label>
      <button type="button" disabled={!draft || action.busy} onClick={download}>{w.t("تصدير تصحيحات التتبّع", "Export tracking corrections")}</button>
      <label><input type="checkbox" checked={isVisible} disabled={!draft || !isAvailable} onChange={(e) => onVisibility(e.target.checked)} />{w.t("إظهار مربعات التتبّع", "Show track boxes")}</label></div>
    {!report ? <p className="notice">{w.t("استورد نتائج تجربة ByteTrack المحلية المرتبطة بهذا الفيديو. هذا لا يشغّل نموذجًا داخل المتصفح.", "Import the source-bound local ByteTrack sample. This does not launch a model in the browser.")}</p> : <>
      <p>{report.engine.name} · {report.frames.length} {w.t("إطارات عينة", "sample frames")} · <span dir="ltr">{formatTime(report.start_ms)}–{formatTime(report.end_ms)}</span></p>
      <details><summary>{w.t("حدود التتبّع والتوقيت", "Tracking and timing limitations")}</summary><p>{w.t("الأزمنة عينات اسمية من الفيديو وليست أزمنة المباراة أو PTS مؤكدة؛ درجات النموذج ليست نسبة دقة.", "Times are nominal video samples, not game clock or verified decoded PTS; model scores are not accuracy.")}</p><ul>{report.engine.limitations.map((line, i) => <li key={i}>{line}</li>)}</ul></details>
      <div className="toolbar"><button type="button" disabled={!isAvailable} onClick={() => onSeek(report.frames[Math.max(0, index - 1)]!.video_ms)}>{w.t("الإطار السابق", "Previous sample")}</button>
        <button type="button" disabled={!isAvailable} onClick={() => onSeek(report.frames[Math.min(report.frames.length - 1, index + 1)]!.video_ms)}>{w.t("الإطار التالي", "Next sample")}</button>
        <button type="button" disabled={!isAvailable} onClick={() => onSeek(report.start_ms)}>{w.t("بداية العينة", "Sample start")}</button></div>
      <label>{w.t("إطار العينة", "Sample frame")}<input type="range" min={0} max={report.frames.length - 1} value={Math.max(0, index)} disabled={!isAvailable}
        onChange={(e) => onSeek(report.frames[Number(e.target.value)]!.video_ms)} /></label>
      <p role="status">{frame ? `${w.t("إطار", "Frame")} ${index + 1} · ${frame.persons.length} ${w.t("اقتراحات مرصودة", "observed proposals")}` : w.t("خارج فترة العينة؛ لا توجد مربعات للعرض", "Outside sample interval; no boxes displayed")}</p>
      <label>{w.t("فلتر رقم المسار", "Track ID filter")}<input value={filter} onChange={(e) => setFilter(e.target.value)} maxLength={20} /></label>
      <div className="toolbar">{frame?.persons.filter((p) => String(p.track_id).includes(filter)).map((p) => <button type="button" key={p.track_id} onClick={() => onSelect(index, p.track_id)}
        aria-pressed={selected?.frame === index && selected.track === p.track_id}>{w.t("مسار", "Track")} {frame.scene}:{p.track_id}</button>)}</div>
      {selected && selectedFrame && person && selectedBox && <form className="tracking-correction" key={`${correctionKey}:${JSON.stringify(correction)}`} onSubmit={(e) => {
        e.preventDefault(); const form = new FormData(e.currentTarget);
        const box = ["x1", "y1", "x2", "y2"].map((key) => Number(form.get(key)));
        void action.run(() => saveCorrection(correctionSchema.parse({ frame_index: selected.frame, scene: selectedFrame.scene, track_id: selected.track, box, note: String(form.get("note") ?? "") })));
      }}>
        <h4>{w.t("تصحيح هذا الإطار فقط", "Correct this frame only")} · {selectedFrame.scene}:{person.track_id} · {formatTime(selectedFrame.video_ms)}</h4>
        {!isEditingFrame && <button type="button" disabled={!isAvailable} onClick={() => onSeek(selectedFrame.video_ms)}>{w.t("العودة لإطار التصحيح", "Return to correction frame")}</button>}
        <fieldset disabled={!isEditingFrame || action.busy}>
        <div className="tracking-coordinates">{["x1", "y1", "x2", "y2"].map((key, i) => <label key={key}>{key}<input name={key} type="number" min={0} max={1} step="any" required defaultValue={selectedBox[i]} /></label>)}</div>
        <label>{w.t("ملاحظة التصحيح", "Correction note")}<input name="note" maxLength={500} defaultValue={correction?.note ?? ""} /></label>
        <div className="toolbar"><button type="submit" disabled={action.busy}>{w.t("حفظ تصحيح الإطار", "Save frame correction")}</button>
          <button type="button" disabled={action.busy} onClick={() => void action.run(() => saveCorrection({ frame_index: selected.frame, scene: selectedFrame.scene, track_id: selected.track, box: null, note: correction?.note ?? "" }))}>{w.t("إخفاء هذا الاقتراح", "Hide this proposal")}</button>
          <button type="button" disabled={action.busy || !correction} onClick={() => void action.run(() => saveCorrection(null))}>{w.t("استعادة اقتراح النموذج", "Restore model proposal")}</button></div>
        </fieldset>
      </form>}
      <p>{w.t("التصحيحات محلية لهذا الحساب والجلسة، ولا تنتقل إلى إطارات أخرى أو إحصاءات اللاعبين. صدّر نسخة للمراجعة.", "Corrections are local to this account/session; they do not propagate to other frames or player statistics. Export a review backup.")}</p>
      {draft && <TacticalProposals key={scope} scope={scope} draft={draft} isAvailable={isAvailable} onSeek={onSeek} timeMs={timeMs} />}
    </>}
  </section>;
}
