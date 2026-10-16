"use client";
import { useState, type ComponentProps, type ReactNode } from "react";
import { ArrowUpRight, Download, Printer } from "lucide-react";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { sessionBrief } from "@/features/reports/session-brief";
import { shotsCsv } from "@/features/reports/export";
import { analysisLabel } from "@/features/analysis/labels";
import type { SessionScope } from "@/features/analysis/session-statistics";
import { formatTime } from "@/lib/video/time";
import { s, n, type Row } from "@/types/workspace";
import { rowLabel } from "./controls";
import { download, useWorkspace } from "./provider";

type SessionReportProps = ComponentProps<"div"> & {
  scope: SessionScope;
  teamId: string;
  match?: Row;
  events: Row[];
  shots: Row[];
  metrics: ReactNode;
  onEvidence: (title: string, events: Row[]) => void;
};
export const SessionReport = ({
  scope,
  teamId,
  match,
  events,
  shots,
  metrics,
  onEvidence,
  className,
  ...props
}: SessionReportProps) => {
  const w = useWorkspace();
  const [isIncludeEvidence, setIncludeEvidence] = useState(false);
  const brief = sessionBrief(scope, teamId, {
    events,
    insights: w.list("insights"),
    links: w.list("evidence_links"),
  });
  const teamLabel = (id: unknown) => {
    const team = w
      .list("teams")
      .find(
        (row) => row.organization_id === scope.organizationId && row.id === id,
      );
    return team ? rowLabel(team) : "—";
  };
  const ids = new Set(brief.events.map((event) => event.id));
  const selectedShots = shots.filter(
    (shot) =>
      shot.organization_id === scope.organizationId &&
      ids.has(s(shot.event_id)),
  );
  const competition = w
    .list("competitions")
    .find(
      (row) =>
        row.organization_id === scope.organizationId &&
        row.id === match?.competition_id,
    );
  const start = new Date(s(match?.starts_at));
  const date = Number.isFinite(start.getTime())
    ? start.toLocaleDateString(w.lang === "ar" ? "ar-EG" : "en-GB")
    : "—";
  return (
    <div
      {...props}
      data-slot="session-report-content"
      data-include-evidence={isIncludeEvidence}
      className={`session-report-content ${className ?? ""}`}
    >
      <div className="report-cover">
        <div className="report-brand">
          <BrandLockup />
          <span>{w.t("موجز المدرب", "Coach brief")}</span>
        </div>
        <h3>
          {teamLabel(match?.home_team_id)} <span aria-hidden="true">—</span>{" "}
          {teamLabel(match?.away_team_id)}
        </h3>
        <p>
          {competition
            ? rowLabel(competition)
            : w.t("البطولة غير مسجلة", "Competition not recorded")}{" "}
          · {date}
          {match?.venue ? ` · ${s(match.venue)}` : ""}
        </p>
        <div className="report-scope-strip">
          <b>
            {w.t("الفريق", "Team")}: {teamLabel(teamId)}
          </b>
          <span>
            {w.t("الأحداث المحددة", "Selected events")}: {brief.events.length}
          </span>
          <span>
            {w.t(
              "جلسة واحدة · الفلاتر الحالية",
              "One session · current filters",
            )}
          </span>
        </div>
      </div>
      <div className="toolbar no-print report-export-controls">
        <button onClick={() => window.print()}>
          <Printer size={15} />
          {w.t("طباعة / حفظ PDF", "Print / save PDF")}
        </button>
        <button
          onClick={() =>
            download(
              shotsCsv(selectedShots, brief.events),
              `sesen-${scope.matchId}-${scope.sessionId}-shots.csv`,
              "text/csv;charset=utf-8",
            )
          }
        >
          <Download size={15} />
          {w.t("تصدير تصويبات العينة CSV", "Export sample shots CSV")}
        </button>
        <label>
          <input
            type="checkbox"
            checked={isIncludeEvidence}
            onChange={(event) => setIncludeEvidence(event.target.checked)}
          />
          {w.t("إرفاق سجل الأحداث في PDF", "Include event register in PDF")}
        </label>
      </div>
      {metrics}
      <section
        className="report-insights"
        aria-label={w.t(
          "استنتاجات العينة بالأدلة",
          "Evidence-backed insights in this selection",
        )}
      >
        <h3>
          {w.t(
            "استنتاجات العينة بالأدلة",
            "Evidence-backed insights in this selection",
          )}
        </h3>
        <p className="report-method">
          {w.t(
            "استنتاجات محفوظة لها أحداث مرتبطة في العينة الحالية. قد تصف عناوينها عينة أصلية أكبر؛ راجع الأدلة قبل اتخاذ القرار.",
            "Saved insights with linked events in the current selection. Titles may describe a larger original sample; review the evidence before deciding.",
          )}
        </p>
        {brief.insights.length ? (
          brief.insights.map(({ insight, evidence }) => (
            <article
              key={insight.id}
              className="report-insight"
              data-insight-id={insight.id}
            >
              <div>
                <h4>{s(insight.title)}</h4>
                <span
                  className={`report-review-state ${insight.is_reviewed ? "is-reviewed" : ""}`}
                >
                  {insight.is_reviewed
                    ? w.t("مراجَع", "Reviewed")
                    : w.t("تحتاج المراجعة", "Needs review")}
                </span>
              </div>
              <p>{s(insight.body)}</p>
              <small>
                {w.t(
                  "الأحداث المرتبطة في هذا العرض",
                  "Linked events in this view",
                )}
                : {evidence.length}
              </small>
              <button
                className="no-print"
                onClick={() => onEvidence(s(insight.title), evidence)}
              >
                {w.t("مشاهدة الأدلة", "Watch evidence")}
                <ArrowUpRight size={14} />
              </button>
            </article>
          ))
        ) : (
          <p>
            {w.t(
              "لا توجد استنتاجات محفوظة مرتبطة بهذه العينة.",
              "No saved insights linked to this selection.",
            )}
          </p>
        )}
      </section>
      <details
        className="report-register"
        open={isIncludeEvidence}
        onToggle={(event) => setIncludeEvidence(event.currentTarget.open)}
      >
        <summary>
          {w.t("سجل الأحداث والأدلة", "Event and evidence register")} · n=
          {brief.events.length}
        </summary>
        <div
          className="report-register-scroll"
          tabIndex={0}
          role="region"
          aria-label={w.t("جدول سجل الأدلة", "Evidence register table")}
        >
          <table>
            <thead>
              <tr>
                {[
                  w.t("المرجع", "Reference"),
                  w.t("زمن المصدر", "Source time"),
                  w.t("الشوط / الساعة", "Period / clock"),
                  w.t("الحدث / النتيجة", "Event / result"),
                  w.t("اللاعب", "Player"),
                ].map((label) => (
                  <th scope="col" key={label}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {brief.events.map((event, index) => {
                const shot = selectedShots.find(
                  (row) => row.event_id === event.id,
                );
                const playerId = shot?.shooter_id || event.actor_player_id;
                const player = w
                  .list("players")
                  .find(
                    (row) =>
                      row.organization_id === scope.organizationId &&
                      row.id === playerId,
                  );
                return (
                  <tr key={event.id} data-report-event-id={event.id}>
                    <th scope="row">
                      <button
                        className="no-print"
                        aria-label={`${w.t("فتح دليل", "Open evidence")} ${index + 1}`}
                        onClick={() =>
                          onEvidence(
                            analysisLabel(s(event.event_type), w.lang),
                            [event],
                          )
                        }
                      >
                        <ArrowUpRight size={12} />
                        {index + 1}
                      </button>
                      <span className="print-event-number">{index + 1}</span>
                      <small dir="ltr">{event.id}</small>
                    </th>
                    <td dir="ltr">{formatTime(n(event.timestamp_ms))}</td>
                    <td>
                      {s(event.period) || "—"} /{" "}
                      <span dir="ltr">
                        {event.match_clock_ms == null
                          ? "—"
                          : formatTime(n(event.match_clock_ms))}
                      </span>
                    </td>
                    <td>
                      {analysisLabel(s(event.event_type), w.lang)}
                      {shot
                        ? ` · ${analysisLabel(s(shot.result), w.lang)}${shot.review_required || shot.result === "unknown" ? ` · ${w.t("للمراجعة", "To review")}` : ""}`
                        : ""}
                    </td>
                    <td>{player ? rowLabel(player) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!brief.events.length && (
          <p>
            {w.t(
              "لا توجد أحداث في هذه العينة.",
              "No events in this selection.",
            )}
          </p>
        )}
      </details>
      <footer className="report-provenance">
        <h3>{w.t("مراجع التقرير", "Report references")}</h3>
        <dl className="session-report-provenance">
          <dt>{w.t("المباراة", "Match")}</dt>
          <dd dir="ltr">{scope.matchId}</dd>
          <dt>{w.t("الجلسة", "Session")}</dt>
          <dd dir="ltr">{scope.sessionId || "—"}</dd>
          <dt>{w.t("الفريق", "Team")}</dt>
          <dd dir="ltr">{teamId || "—"}</dd>
        </dl>
        <p>
          {w.t(
            "CSV يحتفظ بمعرفات الأحداث والجلسة والزمن الخام للمراجعة. التقرير يعكس الفلاتر الحالية؛ لا يرفع ملفات فيديو. زمن المصدر مستقل عن ساعة المباراة، والشرطة تعني أن الساعة غير مسجلة.",
            "CSV retains event/session identifiers and raw timestamps for audit. This report reflects current filters; it uploads no video. Source time is independent of the game clock; a dash means no recorded clock.",
          )}
        </p>
      </footer>
    </div>
  );
};
