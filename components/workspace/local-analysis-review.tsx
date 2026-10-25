"use client";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { z } from "zod";
import { useWorkspace } from "./provider";
import { useAction } from "./controls";
import { formatTime } from "@/lib/video/time";
import { analysisReviews } from "@/lib/local/analysis-reviews";
import {
  decisionsSchema, localResultsSchema, parseLocalResults, reviewKey,
  type LocalCandidate, type ReviewDecision,
} from "@/features/analysis/local-results";
import type { Row } from "@/types/workspace";

const backupSchema = z.object({
  schema: z.literal("sesen.workbench-review.v1"),
  report: localResultsSchema,
  decisions: decisionsSchema,
}).strict();

export function LocalAnalysisReview({ sessionId, video, isAvailable, isCanClip, onOpen, onClip }: {
  sessionId: string; video: Row; isAvailable: boolean; isCanClip: boolean;
  onOpen: (candidate: LocalCandidate) => void;
  onClip: (candidate: LocalCandidate) => Promise<unknown>;
}) {
  const w = useWorkspace(), action = useAction();
  const key = reviewKey(w.user, w.org, sessionId, video.id);
  const sourceBinding = { local_fingerprint: video.local_fingerprint,
    file_size_bytes: video.file_size_bytes, duration_ms: video.duration_ms };
  const draft = useLiveQuery(async () => (await analysisReviews.reviews.get(key)) ?? null, [key]);
  const [filter, setFilter] = useState("unreviewed");
  let report = null, restoreError = "";
  try { report = draft ? parseLocalResults(draft.report, sourceBinding) : null; }
  catch { restoreError = w.t("النتائج المحفوظة لا تتوافق مع المصدر الحالي.", "Saved results do not match this source."); }
  const candidates = report?.candidates.filter((c) => filter === "all" ||
    (draft?.decisions[c.id]?.status ?? "unreviewed") === filter) ?? [];

  async function importFile(file: File) {
    if (file.size > 2 * 1024 * 1024) throw new Error(w.t("الحد الأقصى 2 ميجابايت", "Maximum file size is 2 MB"));
    const input: unknown = JSON.parse(await file.text());
    const backup = backupSchema.safeParse(input);
    const incoming = parseLocalResults(backup.success ? backup.data.report : input, sourceBinding);
    const decisions = backup.success ? backup.data.decisions : {};
    const ids = new Set(incoming.candidates.map((c) => c.id));
    if (Object.keys(decisions).some((id) => !ids.has(id))) throw new Error("Unknown review candidate");
    await analysisReviews.transaction("rw", analysisReviews.reviews, async () => {
      const previous = await analysisReviews.reviews.get(key);
      // An import cannot silently replace another analysis or overwrite coach corrections.
      if (previous && JSON.stringify(previous.report) !== JSON.stringify(incoming))
        throw new Error(w.t("توجد نتائج مختلفة محفوظة لهذه الجلسة؛ استخدم جلسة أخرى", "A different analysis is saved here; use another session"));
      if (previous && backup.success && Object.keys(decisions).length)
        throw new Error(w.t("المراجعة محفوظة بالفعل؛ لم نستبدل قراراتك", "Review already exists; your decisions were not overwritten"));
      await analysisReviews.reviews.put({ key, report: incoming, decisions: previous?.decisions ?? decisions });
    });
  }
  async function decide(candidate: LocalCandidate, patch: Partial<ReviewDecision>) {
    await analysisReviews.transaction("rw", analysisReviews.reviews, async () => {
      const current = await analysisReviews.reviews.get(key);
      if (!current || !current.report.candidates.some((c) => c.id === candidate.id)) throw new Error("Review unavailable");
      const decision = { status: "unreviewed" as const, note: "", ...current.decisions[candidate.id], ...patch };
      decisionsSchema.parse({ [candidate.id]: decision });
      await analysisReviews.reviews.put({ ...current, decisions: { ...current.decisions, [candidate.id]: decision } });
    });
  }
  function exportReview() {
    if (!draft) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify({ schema: "sesen.workbench-review.v1", report: draft.report, decisions: draft.decisions }, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = "sesen-analysis-review.json"; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  if (draft === undefined) return <p role="status">{w.t("تحميل المراجعة المحلية…", "Loading local review…")}</p>;
  return <section data-slot="local-analysis-review" className="local-analysis-review">
    <header><h3>{w.t("نتائج المحرك المحلي", "Local engine results")}</h3>
      <p>{w.t("قراءة النتيجة تقترح فترات للمراجعة؛ لا تؤكد هدفًا أو لاعبًا أو تكتيكًا. الفيديو لا يُرفع.", "Scoreboard reading proposes review intervals; it does not confirm goals, players or tactics. Video is not uploaded.")}</p></header>
    <div className="toolbar">
      <label>{w.t("استيراد نتيجة التحليل أو نسخة المراجعة", "Import analysis or review backup")}
        <input type="file" accept=".json,application/json" disabled={action.busy || !video.local_fingerprint}
          onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) void action.run(() => importFile(file)); }} /></label>
      <button type="button" onClick={exportReview} disabled={!draft || action.busy}>{w.t("تصدير المراجعة", "Export review")}</button>
    </div>
    {action.error && <p role="alert">{action.error}</p>}
    {restoreError && <p role="alert">{restoreError}</p>}
    {!report ? <div className="notice"><p>{w.t("شغّل أداة قراءة النتيجة على جهاز التحليل، ثم صدّر ملف workbench.json واستورده هنا. الربط يُتحقق بالبصمة والحجم والمدة.", "Run the scoreboard tool on your analysis computer, export workbench.json, then import it here. Binding checks fingerprint, size and duration.")}</p>
      <code dir="ltr">python tools/local-analysis/export_workbench.py --report scoreboard-analysis.json --video match.mp4 --output workbench.json</code>
      <p>{w.t("الملف المحلي مطلوب؛ هذا المسار لا يحلل روابط YouTube. النموذج الحالي معاير لفيديو ON Sport بدقة 720p فقط.", "A local file is required; this workflow does not analyze YouTube links. The current profile is calibrated only for ON Sport 720p footage.")}</p></div> : <>
      <div className="local-analysis-summary"><strong>{report.candidates.length} {w.t("اقتراحات، وليست أحداثًا مؤكدة", "proposals, not confirmed events")}</strong><span>{report.engine.name}</span></div>
      <details><summary>{w.t("المصدر وحدود التحليل", "Source and analysis limitations")}</summary>
        <p>{report.source.name} · {w.t("SHA256 كامل محفوظ؛ الربط داخل المتصفح ببصمة عينات", "Full SHA256 retained; browser binding uses a sampled fingerprint")}</p>
        <ul>{report.engine.limitations.map((limit, index) => <li key={index}>{limit}</li>)}</ul></details>
      <label>{w.t("حالة المراجعة", "Review status")} <select value={filter} onChange={(e) => setFilter(e.target.value)}>
        <option value="unreviewed">{w.t("لم تُراجع", "Unreviewed")}</option><option value="reviewed">{w.t("تمت مشاهدتها", "Reviewed")}</option><option value="dismissed">{w.t("مستبعدة", "Dismissed")}</option><option value="all">{w.t("الكل", "All")}</option>
      </select></label>
      {!candidates.length && <p className="notice">{w.t("لا توجد اقتراحات بهذا الفلتر؛ هذا لا يعني اكتمال التحليل.", "No proposals in this filter; this does not establish complete analysis.")}</p>}
      <div className="local-analysis-items">{candidates.slice(0, 100).map((candidate) => {
        const decision = draft?.decisions[candidate.id];
        return <article key={candidate.id} data-candidate-id={candidate.id}>
          <h4>{w.t(candidate.kind === "score_change_candidate" ? "تغيّر محتمل في النتيجة" : "انقطاع أو تصحيح في لوحة النتيجة", candidate.kind === "score_change_candidate" ? "Possible score change" : "Scoreboard discontinuity")}</h4>
          <p dir="ltr">{formatTime(candidate.video_start_ms)} – {formatTime(candidate.video_end_ms)} · {candidate.before.join(" : ")} → {candidate.after.join(" : ")}</p>
          <small>{candidate.note}</small>
          <div className="toolbar"><button type="button" disabled={!isAvailable || action.busy} onClick={() => onOpen(candidate)}>{w.t("افتح الدليل", "Open evidence")}</button>
            <button type="button" disabled={!isCanClip || action.busy} onClick={() => void action.run(() => onClip(candidate))}>{w.t("إنشاء مقطع للمراجعة", "Create review clip")}</button>
            <button type="button" disabled={action.busy} onClick={() => void action.run(() => decide(candidate, { status: "reviewed" }))}>{w.t("تمت المشاهدة", "Mark reviewed")}</button>
            <button type="button" disabled={action.busy} onClick={() => void action.run(() => decide(candidate, { status: decision?.status === "dismissed" ? "unreviewed" : "dismissed" }))}>{w.t(decision?.status === "dismissed" ? "إعادة للمراجعة" : "استبعاد", decision?.status === "dismissed" ? "Restore" : "Dismiss")}</button></div>
          <label>{w.t("ملاحظات المدرب", "Coach notes")}<input key={`${candidate.id}:${decision?.note ?? ""}`} defaultValue={decision?.note ?? ""} maxLength={1000} disabled={action.busy}
            onBlur={(e) => { if (e.target.value !== (decision?.note ?? "")) void action.run(() => decide(candidate, { note: e.target.value })); }} /></label>
        </article>;
      })}</div>
      {candidates.length > 100 && <p>{w.t("يعرض أول 100 اقتراح؛ استخدم حالة المراجعة لتقليل القائمة.", "Showing the first 100 proposals; narrow the list using review status.")}</p>}
      <p>{w.t("القرارات محفوظة محليًا لهذا الحساب والمؤسسة والجلسة. لا تدخل الإحصاءات قبل تسجيل حدث مؤكد؛ أنشئ نسخة احتياطية قبل مسح بيانات المتصفح.", "Decisions are local to this account, organization and session. They do not enter statistics without a confirmed event; export before clearing browser data.")}</p>
    </>}
  </section>;
}
