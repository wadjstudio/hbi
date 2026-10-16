"use client";
import { useState, type ComponentProps } from "react";
import { ArrowUpRight, Download, Printer, Users } from "lucide-react";
import {
  sessionSample,
  teamSessionMetrics,
  type SessionMetric,
  type SessionSample,
  type SessionScope,
} from "@/features/analysis/session-statistics";
import { positionMetrics } from "@/features/players/position-metrics";
import { shotsCsv } from "@/features/reports/export";
import {
  intervalMinutes,
  keeperSummary,
  percent,
  shotSummary,
} from "@/lib/analytics/metrics";
import { s, type Row } from "@/types/workspace";
import { formatTime } from "@/lib/video/time";
import { download, useWorkspace } from "./provider";
import { rowLabel } from "./controls";
import { BrandLockup, PlayerAvatar } from "@/components/brand/brand-lockup";

type Props = ComponentProps<"section"> &
  SessionSample & {
    scope: SessionScope;
    view: "players" | "teams" | "comparison" | "reports";
    focusTeam: string;
    onEvidence: (title: string, events: Row[]) => void;
  };
export const SessionStatistics = ({
  scope,
  view,
  events,
  shots,
  possessions,
  intervals,
  focusTeam,
  onEvidence,
  className,
  ...props
}: Props) => {
  const w = useWorkspace();
  const [chosenTeam, setTeam] = useState("");
  const match = w
    .list("matches")
    .find(
      (m) =>
        m.id === scope.matchId && m.organization_id === scope.organizationId,
    );
  const teams = w
    .list("teams")
    .filter(
      (t) =>
        t.organization_id === scope.organizationId &&
        [match?.home_team_id, match?.away_team_id].includes(t.id),
    );
  const teamId = teams.some((t) => t.id === chosenTeam)
    ? chosenTeam
    : teams.some((t) => t.id === focusTeam)
      ? focusTeam
      : (teams[0]?.id ?? "");
  const sample = sessionSample(scope, {
    events,
    shots,
    possessions,
    intervals,
  });
  const session = w
    .list("analysis_sessions")
    .find(
      (r) =>
        r.id === scope.sessionId &&
        r.organization_id === scope.organizationId &&
        r.match_id === scope.matchId,
    );
  const title = (metric: SessionMetric) => w.t(metric.ar, metric.en);
  const value = (metric: SessionMetric) =>
    metric.percent
      ? percent(metric.value)
      : metric.value == null
        ? "—"
        : String(metric.value);
  const metrics = teamSessionMetrics(teamId, sample);
  const openMetric = (metric: SessionMetric) =>
    onEvidence(title(metric), metric.evidence);
  const roster = w
    .list("match_roster")
    .filter(
      (r) =>
        r.organization_id === scope.organizationId &&
        r.match_id === scope.matchId &&
        r.team_id === teamId,
    );
  const ownEvents = sample.events.filter((e) => e.team_id === teamId);
  const eventIds = new Set(ownEvents.map((e) => e.id));
  const ownShots = sample.shots.filter((sh) => eventIds.has(s(sh.event_id)));
  const playerIds = [
    ...new Set(
      [
        ...roster.map((r) => s(r.player_id)),
        ...ownEvents.map((e) => s(e.actor_player_id)),
        ...ownShots.map((sh) => s(sh.shooter_id)),
      ].filter(Boolean),
    ),
  ];
  const heading = {
    players: w.t("إحصاءات اللاعبين والحراس", "Player & goalkeeper statistics"),
    teams: w.t("إحصاءات الفريق", "Team statistics"),
    comparison: w.t("مقارنة الفريقين", "Team comparison"),
    reports: w.t("تقرير الجلسة الحالية", "Current session report"),
  }[view];
  const metricGrid = (
    <div className="session-metric-grid">
      {metrics.map((metric) => (
        <button
          className="session-metric"
          key={metric.key}
          onClick={() => openMetric(metric)}
          disabled={!metric.evidence.length}
        >
          <span>{title(metric)}</span>
          <strong>{value(metric)}</strong>
          <small>
            {metric.denominator == null
              ? w.t("أحداث مسجلة", "Recorded observations")
              : `n=${metric.denominator}`}{" "}
            · {metric.evidence.length} {w.t("دليل", "evidence")}
          </small>
          <ArrowUpRight size={13} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
  return (
    <section
      {...props}
      data-slot="session-statistics"
      className={`session-statistics ${view === "reports" ? "session-report" : ""} ${className ?? ""}`}
      aria-label={heading}
    >
      <header className="session-statistics-heading">
        <div>
          <h2>{heading}</h2>
          <p>
            {w.t(
              "جلسة واحدة · الفلاتر الحالية",
              "One session · current filters",
            )}{" "}
            · {session ? rowLabel(session) : w.t("لا توجد جلسة", "No session")}{" "}
            · n={sample.events.length}
          </p>
        </div>
        {view !== "comparison" && (
          <label className="no-print">
            {w.t("فريق الإحصاءات", "Statistics team")}
            <select value={teamId} onChange={(e) => setTeam(e.target.value)}>
              {teams.map((t) => (
                <option value={t.id} key={t.id}>
                  {rowLabel(t)}
                </option>
              ))}
            </select>
          </label>
        )}
      </header>
      <p className="session-sample-note">
        {w.t(
          "العينة هي الملاحظات المسجلة، وليست تأكيدًا لتحليل المباراة كاملة. الشرطات تعني غياب المقام؛ الصفر يعني عدم وجود أحداث مسجلة من هذا النوع.",
          "The sample contains recorded observations, not confirmed full-match coverage. Dashes mean missing denominators; zero means no recorded event of that kind.",
        )}
      </p>
      {!sample.events.length && (
        <p className="notice">
          {w.t(
            "لا توجد أحداث ضمن الجلسة والفلاتر الحالية.",
            "No events in this session and filter selection.",
          )}
        </p>
      )}
      {(view === "teams" || view === "reports") && metricGrid}
      {view === "players" && (
        <>
          <p className="session-table-hint">
            {w.t(
              "مرّر الجدول أفقيًا لعرض المقاييس والأدلة، أو ركّز عليه واستخدم أسهم لوحة المفاتيح.",
              "Scroll the table horizontally for metrics and evidence, or focus it and use the arrow keys.",
            )}
          </p>
          <div
            className="session-stat-table"
            tabIndex={0}
            role="region"
            aria-label={w.t("جدول اللاعبين", "Player statistics table")}
          >
            <table>
              <thead>
                <tr>
                  {[
                    w.t("اللاعب", "Player"),
                    w.t("المركز المرصود", "Observed position"),
                    w.t("أهداف / محاولات مراجعة", "Goals / reviewed attempts"),
                    w.t("الكفاءة", "Efficiency"),
                    w.t("فقد الكرة", "Turnovers"),
                    w.t("دقائق مؤكدة", "Verified minutes"),
                    w.t("تصديات / مواجهات", "Saves / faced"),
                    w.t("الأدلة", "Evidence"),
                  ].map((label) => (
                    <th scope="col" key={label}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {playerIds.map((id) => {
                  const player = w
                    .list("players")
                    .find(
                      (p) =>
                        p.id === id &&
                        p.organization_id === scope.organizationId,
                    );
                  const actions = ownEvents.filter(
                    (e) => e.actor_player_id === id,
                  );
                  const attempts = ownShots.filter(
                    (sh) => sh.shooter_id === id,
                  );
                  const summary = shotSummary(attempts);
                  const stints = sample.intervals.filter(
                    (i) => i.player_id === id && i.team_id === teamId,
                  );
                  const minutes = intervalMinutes(stints);
                  const faced = sample.shots.filter(
                    (sh) => sh.goalkeeper_id === id,
                  );
                  const keeper = keeperSummary(faced, id);
                  const attemptEvents = (rows: Row[]) => {
                    const ids = new Set(rows.map((sh) => s(sh.event_id)));
                    return sample.events.filter((e) => ids.has(e.id));
                  };
                  const reviewed = attempts.filter(
                    (sh) => !sh.review_required && sh.result !== "unknown",
                  );
                  const keeperEvents = attemptEvents(
                    faced.filter(
                      (sh) =>
                        !sh.review_required &&
                        !sh.empty_goal &&
                        ["save", "goal"].includes(s(sh.result)),
                    ),
                  );
                  const playerName = player ? rowLabel(player) : id.slice(0, 8);
                  const openPlayerMetric = (label: string, rows: Row[]) =>
                    onEvidence(`${playerName} · ${label}`, rows);
                  const observed = [
                    ...new Set(
                      [
                        ...actions.map((e) => s(e.actor_position)),
                        ...attempts.map((sh) => s(sh.shooter_position)),
                        ...stints.map((i) => s(i.position)),
                        ...(keeper.sample ? ["GK"] : []),
                      ].filter(Boolean),
                    ),
                  ];
                  const evidenceIds = new Set([
                    ...actions.map((e) => e.id),
                    ...attempts.map((sh) => s(sh.event_id)),
                    ...faced
                      .filter(
                        (sh) =>
                          !sh.review_required &&
                          !sh.empty_goal &&
                          ["save", "goal"].includes(s(sh.result)),
                      )
                      .map((sh) => s(sh.event_id)),
                  ]);
                  const supporting = sample.events.filter((e) =>
                    evidenceIds.has(e.id),
                  );
                  return (
                    <tr key={id}>
                      <th scope="row">
                        <div className="session-player-name">
                          <PlayerAvatar number={s(player?.shirt_number)} />
                          <span>
                            {player ? rowLabel(player) : id.slice(0, 8)}
                            <button
                              className="player-review-count"
                              aria-label={`${playerName} · ${w.t("تصويبات للمراجعة", "Attempts to review")}`}
                              disabled={!summary.pending}
                              onClick={() =>
                                openPlayerMetric(
                                  w.t("تصويبات للمراجعة", "Attempts to review"),
                                  attemptEvents(
                                    attempts.filter(
                                      (sh) => !reviewed.includes(sh),
                                    ),
                                  ),
                                )
                              }
                            >
                              {summary.pending} {w.t("للمراجعة", "to review")}
                            </button>
                          </span>
                        </div>
                      </th>
                      <td>{observed.join(" / ") || "—"}</td>
                      <td>
                        <button
                          aria-label={`${playerName} · ${w.t("أهداف / محاولات مراجعة", "Goals / reviewed attempts")}`}
                          disabled={!reviewed.length}
                          onClick={() =>
                            openPlayerMetric(
                              w.t(
                                "أهداف / محاولات مراجعة",
                                "Goals / reviewed attempts",
                              ),
                              attemptEvents(reviewed),
                            )
                          }
                        >
                          {summary.goals} / {summary.sample}
                        </button>
                      </td>
                      <td>
                        <button
                          aria-label={`${playerName} · ${w.t("الكفاءة", "Efficiency")}`}
                          disabled={!reviewed.length}
                          onClick={() =>
                            openPlayerMetric(
                              w.t("الكفاءة", "Efficiency"),
                              attemptEvents(reviewed),
                            )
                          }
                        >
                          {percent(summary.efficiency)}
                        </button>
                      </td>
                      <td>
                        <button
                          aria-label={`${playerName} · ${w.t("فقد الكرة", "Turnovers")}`}
                          disabled={
                            !actions.some((e) => e.event_type === "turnover")
                          }
                          onClick={() =>
                            openPlayerMetric(
                              w.t("فقد الكرة", "Turnovers"),
                              actions.filter(
                                (e) => e.event_type === "turnover",
                              ),
                            )
                          }
                        >
                          {
                            actions.filter((e) => e.event_type === "turnover")
                              .length
                          }
                        </button>
                      </td>
                      <td>
                        <details
                          className="player-stints"
                          data-slot="player-stints"
                        >
                          <summary
                            aria-label={`${playerName} · ${w.t("فترات اللعب", "On-court intervals")}`}
                          >
                            {minutes == null ? "—" : minutes.toFixed(1)}
                            <small>
                              {stints.length} {w.t("فترة", "intervals")}
                            </small>
                          </summary>
                          <p>
                            {w.t(
                              "زمن المباراة حسب الشوط. الإجمالي متاح فقط عندما تكون كل الفترات مغلقة ومؤكدة؛ لا يثبت اكتمال تسجيل المباراة.",
                              "Game clock by period. Total requires every interval to be closed and verified; it does not confirm full-match coverage.",
                            )}
                          </p>
                          {!stints.length && (
                            <p>
                              {w.t(
                                "لا توجد فترات مسجلة.",
                                "No recorded intervals.",
                              )}
                            </p>
                          )}
                          <ul>
                            {stints.map((stint) => (
                              <li key={stint.id} data-interval-id={stint.id}>
                                <b>
                                  {w.t("شوط", "Period")} {s(stint.period)} ·{" "}
                                  {s(stint.position) || "—"}
                                </b>
                                <span dir="ltr">
                                  {formatTime(Number(stint.start_clock_ms))} –{" "}
                                  {stint.end_clock_ms == null
                                    ? "…"
                                    : formatTime(Number(stint.end_clock_ms))}
                                </span>
                                <small>
                                  {stint.end_clock_ms == null
                                    ? w.t("فترة مفتوحة", "Open interval")
                                    : stint.verified
                                      ? w.t("مؤكدة", "Verified")
                                      : w.t(
                                          "تحتاج التحقق",
                                          "Needs verification",
                                        )}
                                </small>
                              </li>
                            ))}
                          </ul>
                        </details>
                      </td>
                      <td>
                        <button
                          aria-label={`${playerName} · ${w.t("تصديات / مواجهات", "Saves / faced")}`}
                          disabled={!keeperEvents.length}
                          onClick={() =>
                            openPlayerMetric(
                              w.t("تصديات / مواجهات", "Saves / faced"),
                              keeperEvents,
                            )
                          }
                        >
                          {keeper.sample
                            ? `${keeper.saves}/${keeper.sample} · ${percent(keeper.percentage)}`
                            : "—"}
                        </button>
                      </td>
                      <td>
                        <button
                          aria-label={`${playerName} · ${w.t("كل الأدلة", "All evidence")}`}
                          disabled={!supporting.length}
                          onClick={() =>
                            onEvidence(
                              player ? rowLabel(player) : id,
                              supporting,
                            )
                          }
                        >
                          <Users size={14} />
                          {supporting.length}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="session-sample-note">
            {w.t(
              "أدلة الكفاءة تشمل المحاولات المراجعة فقط. نسبة الحارس = التصديات ÷ (التصديات + الأهداف المستقبلة)، وتستبعد الإهدار والحجب والمرمى الخالي والمحاولات المعلقة.",
              "Efficiency evidence includes reviewed attempts only. Keeper save rate = saves ÷ (saves + goals conceded), excluding misses, blocks, empty goals and pending attempts.",
            )}
          </p>
          {!playerIds.length && (
            <p>
              {w.t(
                "أضف القائمة أو سجل المشاركين لإظهار اللاعبين.",
                "Add a roster or record participants to show players.",
              )}
            </p>
          )}
          <details className="position-metrics">
            <summary>
              {w.t(
                "مقاييس المراكز أثناء المباراة",
                "Metrics by match position",
              )}
            </summary>
            <div className="session-metric-grid">
              {playerIds.flatMap((id) =>
                positionMetrics(
                  id,
                  sample.events,
                  sample.shots,
                  sample.intervals,
                ).map((metric, index) => {
                  const player = w.list("players").find((p) => p.id === id);
                  return (
                    <button
                      className="session-metric"
                      key={`${id}:${index}`}
                      disabled={!metric.evidence.length}
                      onClick={() =>
                        onEvidence(
                          w.t(metric.labelAr, metric.labelEn),
                          sample.events.filter((e) =>
                            metric.evidence.includes(e.id),
                          ),
                        )
                      }
                    >
                      <span>
                        {player ? rowLabel(player) : id.slice(0, 8)} ·{" "}
                        {metric.position}
                      </span>
                      <strong>
                        {metric.unit === "percent"
                          ? percent(metric.value)
                          : metric.value == null
                            ? "—"
                            : metric.value.toFixed(2)}
                      </strong>
                      <small>
                        {w.t(metric.labelAr, metric.labelEn)} · n=
                        {metric.sample}
                      </small>
                    </button>
                  );
                }),
              )}
            </div>
          </details>
        </>
      )}
      {view === "comparison" && (
        <div className="session-comparison">
          {teams.map((team) => (
            <article key={team.id}>
              <h3>{rowLabel(team)}</h3>
              {teamSessionMetrics(team.id, sample).map((metric) => (
                <div className="comparison-metric" key={metric.key}>
                  <span>{title(metric)}</span>
                  <button
                    disabled={!metric.evidence.length}
                    onClick={() =>
                      onEvidence(
                        `${rowLabel(team)} · ${title(metric)}`,
                        metric.evidence,
                      )
                    }
                  >
                    {value(metric)}
                    <small>
                      {metric.denominator == null
                        ? `${metric.evidence.length} ${w.t("دليل", "evidence")}`
                        : `n=${metric.denominator}`}
                    </small>
                  </button>
                </div>
              ))}
            </article>
          ))}
        </div>
      )}
      {view === "reports" && (
        <>
          <div className="report-brand">
            <BrandLockup />
            <span>
              {teams.find((t) => t.id === teamId)
                ? rowLabel(teams.find((t) => t.id === teamId)!)
                : "—"}
            </span>
          </div>
          <div className="toolbar no-print">
            <button onClick={() => window.print()}>
              <Printer size={15} />
              {w.t("طباعة / حفظ PDF", "Print / save PDF")}
            </button>
            <button
              onClick={() =>
                download(
                  shotsCsv(ownShots, ownEvents),
                  `sesen-${scope.matchId}-${scope.sessionId}-shots.csv`,
                  "text/csv;charset=utf-8",
                )
              }
            >
              <Download size={15} />
              {w.t("تصدير تصويبات العينة CSV", "Export sample shots CSV")}
            </button>
          </div>
          <dl className="session-report-provenance">
            <dt>{w.t("المباراة", "Match")}</dt>
            <dd>{scope.matchId}</dd>
            <dt>{w.t("الجلسة", "Session")}</dt>
            <dd>{scope.sessionId || "—"}</dd>
            <dt>{w.t("الفريق", "Team")}</dt>
            <dd>{teamId || "—"}</dd>
            <dt>{w.t("الأحداث المحددة", "Selected events")}</dt>
            <dd>{ownEvents.length}</dd>
          </dl>
          <button
            className="no-print"
            disabled={!ownEvents.length}
            onClick={() => onEvidence(heading, ownEvents)}
          >
            {w.t("فتح أحداث التقرير", "Open report events")}{" "}
            <ArrowUpRight size={14} />
          </button>
          <p>
            {w.t(
              "CSV يحتفظ بمعرفات الأحداث والجلسة والزمن الخام للمراجعة. التقرير يعكس الفلاتر الحالية؛ لا يرفع ملفات فيديو.",
              "CSV retains event/session identifiers and raw timestamps for audit. This report reflects current filters; it uploads no video.",
            )}
          </p>
        </>
      )}
    </section>
  );
};
