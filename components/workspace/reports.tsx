"use client";
import { useState } from "react";
import { useWorkspace, download } from "./provider";
import { Entities } from "./entities";
import { Panel, Notice, useAction, rowLabel } from "./controls";
import { shotSummary, percent } from "@/lib/analytics/metrics";
import { shotsCsv } from "@/features/reports/export";
import { canWrite } from "@/lib/permissions/roles";
import { s, type Row, type Value } from "@/types/workspace";
import { Evidence } from "./analytics";
export function Reports({ id }: { id?: string }) {
  const w = useWorkspace(),
    a = useAction();
  const report = w.list("reports").find((r) => r.id === id);
  const content = report?.content as Record<string, Value> | undefined;
  const [draft, setDraft] = useState<{
    id?: string;
    value: string;
    base?: Row;
  } | null>(null);
  const notes = draft && draft.id === id ? draft.value : s(content?.notes);
  const base = draft?.id === id && draft?.base ? draft.base : report;
  const sessions = new Set(
      w
        .list("analysis_sessions")
        .filter(
          (r) =>
            r.is_primary &&
            (!report?.match_id || r.match_id === report.match_id),
        )
        .map((r) => r.id),
    ),
    events = w
      .list("events")
      .filter(
        (e) =>
          sessions.has(s(e.analysis_session_id)) &&
          (!report?.team_id || e.team_id === report.team_id) &&
          (!report?.player_id || e.actor_player_id === report.player_id),
      ),
    ids = new Set(events.map((e) => e.id)),
    shots = w.list("shot_attempts").filter((sh) => ids.has(s(sh.event_id))),
    summary = shotSummary(shots);
  if (id && !report)
    return (
      <Notice>
        {w.ready
          ? w.t(
              "التقرير غير متاح في هذه المؤسسة",
              "Report unavailable in this organization",
            )
          : w.t("جارٍ تحميل التقرير", "Loading report")}
      </Notice>
    );
  return (
    <>
      {!id && <Entities table="reports" title={w.t("التقارير", "Reports")} />}
      <div className="print-report">
        <Panel
          title={
            report ? rowLabel(report) : w.t("تقرير التحليل", "Analysis report")
          }
          actions={
            <div className="toolbar">
              <button onClick={() => window.print()}>
                {w.t("طباعة / حفظ PDF", "Print / save PDF")}
              </button>
              <button
                onClick={() =>
                  download(
                    shotsCsv(shots, events),
                    "hbi-shots.csv",
                    "text/csv;charset=utf-8",
                  )
                }
              >
                CSV
              </button>
            </div>
          }
        >
          <p>
            {w.t("تاريخ استخراج البيانات", "Extracted")}{" "}
            {new Date().toLocaleDateString(w.lang === "ar" ? "ar-EG" : "en-GB")}
          </p>
          <div className="metric-grid">
            <div className="metric">
              <span>{w.t("تصويبات مراجعة", "Reviewed attempts")}</span>
              <b>{summary.sample}</b>
            </div>
            <div className="metric">
              <span>{w.t("أهداف", "Goals")}</span>
              <b>{summary.goals}</b>
            </div>
            <div className="metric">
              <span>{w.t("كفاءة", "Efficiency")}</span>
              <b>{percent(summary.efficiency)}</b>
            </div>
          </div>
          <small>
            {summary.pending}{" "}
            {w.t("محاولة غير معتمدة مستبعدة", "unreviewed attempts excluded")}
          </small>
          <label className="no-print">
            {w.t("ملاحظات المدرب", "Coach notes")}
            <textarea
              value={notes}
              onChange={(e) => {
                const value = e.target.value;
                setDraft((previous) => ({
                  id,
                  value,
                  base:
                    previous?.id === id && previous?.base
                      ? previous.base
                      : report,
                }));
              }}
              readOnly={!canWrite(w.role, "reports")}
            />
          </label>
          <p className="report-notes">{notes}</p>
          {report && (
            <button
              className="no-print"
              disabled={a.busy || !canWrite(w.role, "reports")}
              onClick={() =>
                void a.run(async () => {
                  await w.save("reports", {
                    ...base,
                    content: {
                      ...(base?.content as Record<string, Value> | undefined),
                      notes,
                      summary,
                      sample_match_ids: [
                        ...new Set(events.map((e) => s(e.match_id))),
                      ],
                    },
                    status: "ready",
                  });
                  setDraft(null);
                })
              }
            >
              {w.t("حفظ التقرير", "Save report")}
            </button>
          )}
          {a.error && <Notice>{a.error}</Notice>}
        </Panel>
        <Evidence events={events} />
      </div>
    </>
  );
}
