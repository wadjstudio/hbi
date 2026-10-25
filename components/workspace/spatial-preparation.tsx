"use client";
import { useWorkspace } from "./provider";
import { Court } from "./court";
import { trackingFrameIndex, type TrackingReport } from "@/features/analysis/tracking-results";
import type { SpatialPreparation } from "@/features/analysis/spatial-preparation";
import { formatTime } from "@/lib/video/time";

export function SpatialPreparationView({ preparation, report, timeMs }: {
  preparation: SpatialPreparation; report: TrackingReport; timeMs: number;
}) {
  const w = useWorkspace();
  const i = trackingFrameIndex(report, timeMs), frame = preparation.frames[i];
  const calibrated = preparation.frames.filter((f) => f.calibration.state !== "unavailable").length;
  const colours: Record<string, string> = { red: "#ff655e", white: "#eff8ff", green: "#8dd86e", cyan: "#00d9e8", unknown: "#899ba6" };
  return <section data-slot="spatial-preparation" className="local-analysis-review">
    <h4>{w.t("تجهيز الفريقين والملعب — غير مُراجع", "Team and court preparation — unreviewed")}</h4>
    <p>{w.t("ألوان القمصان مجموعات مؤقتة وليست هوية فريق أو لاعب. مواقع الأرضية تقديرية ولا تُعتمد كإحصاءات أو تكتيكات مؤكدة.",
      "Kit colours are provisional groups, not team or player identities. Estimated floor positions are not confirmed statistics or tactics.")}</p>
    <p>{calibrated}/{preparation.frames.length} {w.t("إطارات بمعايرة تقديرية", "frames with estimated calibration")}</p>
    <small>{w.t("الأعداد رصد قمصان في الصورة وقد تشمل الدكة والطاقم؛ ليست تشكيلة الملعب.", "Counts are image kit observations and may include bench/staff; they are not an on-court lineup.")}</small>
    {!frame ? <p>{w.t("خارج عينة التجهيز", "Outside preparation sample")}</p> : <>
      <p dir="ltr">{formatTime(frame.video_ms)} · {frame.calibration.state}</p>
      {frame.calibration.state !== "unavailable" ? <div style={{ maxWidth: 600 }}><Court>
        {frame.persons.filter((p) => p.court_point).map((p) => <g key={p.track_id}>
          <circle cx={p.court_point![0] * 25} cy={p.court_point![1] * 25} r={8} fill={colours[p.colour.group]}>
            <title>{w.t("مسار مؤقت", "Temporary track")} {p.track_id}</title>
          </circle>
        </g>)}
      </Court></div> : <p className="notice">{w.t("معايرة الملعب غير متاحة لهذا الإطار؛ المواقع تظل مجهولة.", "Court calibration is unavailable for this frame; positions remain unknown.")}</p>}
      <div className="toolbar">{(["A", "B"] as const).map((team) => <span key={team}>
        {w.t("مجموعة", "Group")} {team}: {frame.persons.filter((p) => p.colour.team === team).length}
      </span>)}<span>{w.t("غير محدد", "Unknown")}: {frame.persons.filter((p) => !p.colour.team).length}</span></div>
      <details><summary>{w.t("رصد القمصان في الإطار", "Frame kit observations")}</summary>
        <ul>{frame.persons.map((p) => <li key={p.track_id}>{p.track_id} · {p.colour.group} · {p.colour.team ?? "?"} · {Math.round(p.colour.support * 100)}%</li>)}</ul>
      </details>
    </>}
  </section>;
}
