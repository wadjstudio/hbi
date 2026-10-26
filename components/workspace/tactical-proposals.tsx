"use client";
import { useMemo } from "react";
import { useWorkspace } from "./provider";
import { useAction } from "./controls";
import { analysisReviews, type TrackingReview } from "@/lib/local/analysis-reviews";
import { extractTacticalProposals, parseTacticalGround, validateTacticalReview,
  type TacticalProposal, type TacticalReview } from "@/features/analysis/tactical-proposals";
import { formatTime } from "@/lib/video/time";
import { parseSpatialPreparation } from "@/features/analysis/spatial-preparation";
import { SpatialPreparationView } from "./spatial-preparation";

export function TacticalProposals({ scope, draft, isAvailable, onSeek, timeMs }: {
  scope: string; draft: TrackingReview; isAvailable: boolean; onSeek: (ms: number) => void; timeMs: number;
}) {
  const w = useWorkspace(), action = useAction();
  const result = useMemo(() => {
    try { return { data: extractTacticalProposals(draft.report, draft.corrections, draft.tactics?.ground, draft.tactics?.preparation), error: "" }; }
    catch (error) { return { data: null, error: error instanceof Error ? error.message : "Invalid tactical evidence" }; }
  }, [draft.report, draft.corrections, draft.tactics?.ground, draft.tactics?.preparation]);
  const title = (p: TacticalProposal) => p.kind === "near_goal_block"
    ? w.t("تجمع مكاني قرب المرمى — معايرة وقمصان مقترحة", "Near-goal spatial block — estimated camera and kits")
    : p.kind === "crossing_motion"
    ? w.t("تقاطع مسارات محتمل — الفريق والكرة غير محددين", "Possible path crossing — team and ball unknown")
    : p.kind === "defense_6_0" ? w.t("شكل دفاع 6:0 محتمل", "Possible 6:0 defensive shape")
      : w.t("شكل دفاع 5:1 محتمل", "Possible 5:1 defensive shape");

  async function save(review: TacticalReview) {
    const parsed = validateTacticalReview(draft.report, draft.corrections, review);
    await analysisReviews.transaction("rw", analysisReviews.tracking, async () => {
      const current = await analysisReviews.tracking.get(scope);
      if (!current || JSON.stringify([current.report, current.corrections, current.tactics]) !==
          JSON.stringify([draft.report, draft.corrections, draft.tactics])) throw new Error("Tracking/review changed; retry with current data");
      await analysisReviews.tracking.put({ ...current, tactics: parsed });
    });
  }
  async function importGround(file: File) {
    if (file.size > 2 * 1024 * 1024) throw new Error("Court evidence exceeds 2 MB");
    if (draft.tactics?.ground || Object.keys(draft.tactics?.decisions ?? {}).length)
      throw new Error(w.t("امسح مراجعة التكتيك الحالية قبل استبدال أدلتها", "Clear current tactical review before replacing its evidence"));
    const ground = parseTacticalGround(JSON.parse(await file.text()), draft.report, draft.corrections);
    await save({ ...draft.tactics, ground, decisions: {} });
  }
  async function importPreparation(file: File) {
    if (file.size > 3 * 1024 * 1024) throw new Error("Preparation exceeds 3 MB");
    if (draft.tactics?.preparation) throw new Error("Existing preparation will not be overwritten; export and clear it first");
    const preparation = parseSpatialPreparation(JSON.parse(await file.text()), draft.report, draft.corrections);
    await save({ ...draft.tactics, preparation, decisions: draft.tactics?.decisions ?? {} });
  }
  function download() {
    if (!result.data) return;
    const blob = new Blob([JSON.stringify({ schema: "sesen.tactical-proposals.v1", source: draft.report.source,
      engine: { rule_version: result.data.rule_version, calibrated_probability: false,
        tracking_model_sha256: draft.report.engine.model_sha256 },
      evidence_basis: { corrections: draft.corrections, ground: draft.tactics?.ground, preparation: draft.tactics?.preparation },
      time_basis: draft.report.time_basis, proposals: result.data.proposals,
      diagnostics: result.data.diagnostics,
      decisions: draft.tactics?.decisions ?? {}, truncated: result.data.truncated,
      limitations: ["Review-only visual/rule proposals; no canonical events or statistics", "Path crossings do not establish attacking tactics or ball possession"] })], { type: "application/json" });
    const url = URL.createObjectURL(blob), link = document.createElement("a");
    link.href = url; link.download = "sesen-tactical-proposals.json"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <section className="local-analysis-review" data-slot="tactical-proposals">
    <header><h3>{w.t("استخراج أنماط الحركة وأشكال الدفاع", "Automatic motion patterns and defensive shapes")}</h3>
      <p>{w.t("اقتراحات بقواعد قابلة للمراجعة، وليست تحليلًا تكتيكيًا مؤكدًا. التقاطع المرئي قد يكون بين خصمين أو حكام. النسبة المعروضة دعم الرصد وليست احتمال صحة التكتيك.",
        "Reviewable rule proposals, not confirmed tactical analysis. Visual crossings may involve opponents or officials. Detection support is not the probability of a correct tactic.")}</p></header>
    {(result.error || action.error) && <p role="alert">{result.error || action.error}</p>}
    <p aria-live="polite">{result.data?.proposals.length ?? 0} {w.t("اقتراحات من العينة الحالية", "proposals from the current sample")}</p>
    {result.data && <details data-slot="tactical-evidence-coverage">
      <summary>{w.t("جودة واستمرارية أدلة الاستخراج", "Extraction evidence coverage and continuity")}</summary>
      <p>{w.t("هذه أعداد من العينة الحالية، وليست قياسًا لدقة النموذج أو لهوية اللاعبين. الانقطاع قد يكون بسبب فقدان المسار أو حجب القدم أو اختلاف العمق والحجم في الصورة.",
        "These are current-sample counts, not model accuracy or athlete identities. A run may break because a track is missing, a foot is unusable, or image depth/scale changes.")}</p>
      <dl>
        <dt>{w.t("رصدات صالحة لقاعدة الحركة / كل المربعات", "Usable motion observations / all boxes")}</dt>
        <dd>{result.data.diagnostics.usable_observations} / {result.data.diagnostics.observed_boxes}</dd>
        <dt>{w.t("إطارات بأزواج قابلة للمقارنة / العينة", "Frames with comparable pairs / sample")}</dt>
        <dd>{result.data.diagnostics.frames_with_comparable_pairs} / {result.data.diagnostics.sample_frames}</dd>
        <dt>{w.t("تغييرات لقطة الكاميرا", "Camera cuts")}</dt><dd>{result.data.diagnostics.camera_cuts}</dd>
        <dt>{w.t("انقطاعات أزواج المسارات بسبب الرصد أو الهندسة", "Pair runs interrupted by observations or geometry")}</dt>
        <dd>{result.data.diagnostics.pair_runs_ended_by_missing_or_geometry}</dd>
        <dt>{w.t("انعكاسات ترتيب مرئية داخل نوافذ القاعدة", "Observed order reversals within rule windows")}</dt>
        <dd>{result.data.diagnostics.observed_order_reversals}</dd>
        <dt>{w.t("إطارات ملعب مُراجعة / معايرة تقديرية", "Reviewed court frames / estimated calibration")}</dt>
        <dd>{result.data.diagnostics.reviewed_ground_frames} / {result.data.diagnostics.estimated_calibrated_frames}</dd>
      </dl>
      {!result.data.proposals.length && <p>{w.t("لم تتحقق شروط القواعد في الأدلة المتاحة. هذا لا يعني غياب التكتيك من المباراة؛ راجع استمرارية التتبّع ومعايرة الملعب وتأكيد الفريق والمرحلة.",
        "Available evidence did not satisfy the rules. This does not mean the match has no tactics; review track continuity, court calibration, teams and phase.")}</p>}
    </details>}
    {!result.data?.defense_ready && <p className="notice">{w.t("استخراج الدفاع متوقف: نحتاج مواقع أرضية مُعايرة لكل إطار، وتأكيد الفريق والمرحلة. لا نستنتج 6:0 أو 5:1 من مربعات الصورة.",
      "Defensive extraction is gated: frame-specific reviewed court positions, teams and phase are required. Image boxes alone cannot establish 6:0 or 5:1.")}</p>}
    <div className="toolbar"><label>{w.t("استيراد أدلة الملعب المُراجعة", "Import reviewed court evidence")}
      <input type="file" accept=".json,application/json" disabled={action.busy} onChange={(e) => {
        const file = e.target.files?.[0]; e.target.value = ""; if (file) void action.run(() => importGround(file));
      }} /></label>
      <button type="button" disabled={!result.data || action.busy} onClick={download}>{w.t("تصدير الاقتراحات وأدلتها", "Export proposals and evidence")}</button>
      {draft.tactics && <button type="button" disabled={action.busy} onClick={() => void action.run(() => save({ decisions: {} }))}>{w.t("مسح مراجعة التكتيك والمعايرة", "Clear tactical review and calibration")}</button>}</div>
    <label>{w.t("استيراد تجهيز آلي للفريقين والملعب", "Import automatic team and court preparation")}
      <input type="file" accept=".json,application/json" disabled={action.busy} onChange={(e) => {
        const file = e.target.files?.[0]; e.target.value = ""; if (file) void action.run(() => importPreparation(file));
      }} /></label>
    {draft.tactics?.preparation && <SpatialPreparationView preparation={draft.tactics.preparation} report={draft.report} timeMs={timeMs} />}
    <small>{w.t("تعديل مربعات التتبّع يلغي معايرة التكتيك وقراراته حتى لا تبقى موافقات على أدلة قديمة. القرارات محفوظة محليًا ضمن نسخة مراجعة التتبّع.",
      "Editing track boxes clears tactical calibration and decisions to prevent stale approvals. Decisions are local and included in the tracking review backup.")}</small>
    {result.data?.truncated && <p className="notice">{w.t("العرض محدود بأول 200 اقتراح؛ العينة غير مكتملة هنا", "Limited to the first 200 proposals; this is not complete coverage")}</p>}
    {result.data?.proposals.map((p) => {
      const decision = draft.tactics?.decisions[p.id];
      return <article key={p.id} className="panel">
        <h4>{title(p)}</h4>
        <p dir="ltr">{formatTime(p.start_ms)}–{formatTime(p.end_ms)} · scene {p.scene} · {p.track_ids.join(", ")}{p.team ? ` · ${p.team}` : ""}</p>
        <p>{p.frame_indices.length} {w.t("إطارات دليل", "evidence frames")} · {w.t("دعم القاعدة/الرصد", "rule/detection support")} {Math.round(p.support * 100)}% · {decision?.status === "reviewed" ? w.t("راجعه المدرب", "Coach reviewed") : decision?.status === "rejected" ? w.t("مرفوض", "Rejected") : w.t("بانتظار المراجعة", "Pending review")}</p>
        <div className="toolbar"><button type="button" disabled={!isAvailable} onClick={() => onSeek(p.start_ms)}>{w.t("شاهد الدليل", "Watch evidence")}</button>
          <button type="button" disabled={!isAvailable} onClick={() => onSeek(p.end_ms - Math.round(1000 / draft.report.sample_fps))}>{w.t("نهاية الحركة", "End of movement")}</button></div>
        <form key={`${p.id}:${decision?.status ?? "pending"}:${decision?.note ?? ""}`} onSubmit={(e) => {
          e.preventDefault(); const form = new FormData(e.currentTarget);
          const status = form.get("status"); if (status !== "reviewed" && status !== "rejected") return;
          void action.run(() => save({ ...draft.tactics, decisions: { ...draft.tactics?.decisions,
            [p.id]: { status, note: String(form.get("note") ?? "") } } }));
        }}><label>{w.t("قرار المدرب", "Coach decision")}<select name="status" defaultValue={decision?.status ?? "reviewed"}>
          <option value="reviewed">{w.t("راجعت الاقتراح", "Reviewed proposal")}</option><option value="rejected">{w.t("رفض الاقتراح", "Reject proposal")}</option></select></label>
          <label>{w.t("ملاحظة التكتيك", "Tactical note")}<input name="note" maxLength={500} defaultValue={decision?.note ?? ""} /></label>
          <button type="submit" disabled={action.busy}>{w.t("حفظ مراجعة الاقتراح", "Save proposal review")}</button></form>
      </article>;
    })}
  </section>;
}
