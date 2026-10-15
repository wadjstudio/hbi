"use client";
import Link from "next/link";
import { Play } from "lucide-react";
import {
  matchDashboard,
  recentMatchForm,
} from "@/features/analysis/match-dashboard";
import { analysisLabel } from "@/features/analysis/labels";
import { percent } from "@/lib/analytics/metrics";
import { n, s, type Row } from "@/types/workspace";
import { useWorkspace } from "./provider";
import { rowLabel } from "./controls";
import { PlayerAvatar } from "@/components/brand/brand-lockup";
import { brand } from "@/lib/brand";
import { EvidenceTrend } from "./evidence-trend";
import { Court } from "./charts";
export function MatchDashboard({
  teamId,
  events,
  shots,
  possessions,
  onEvidence,
}: {
  teamId: string;
  events: Row[];
  shots: Row[];
  possessions: Row[];
  onEvidence: (title: string, events: Row[]) => void;
}) {
  const w = useWorkspace(),
    d = matchDashboard(teamId, events, shots, possessions);
  const openShots = (title: string, rows: Row[]) =>
    onEvidence(
      title,
      d.sample.filter((e) => rows.some((sh) => sh.event_id === e.id)),
    );
  const recent = recentMatchForm(teamId, w.list("matches"));
  const scoreScale = Math.max(
    1,
    ...recent.flatMap((entry) => [entry.goalsFor, entry.goalsAgainst]),
  );
  return (
    <section
      className="match-dashboard"
      aria-label={w.t("ملخص المباراة بالأدلة", "Evidence-backed match summary")}
    >
      <article className="dashboard-card">
        <header>
          <h3>{w.t("ملف التصويب", "Shot profile")}</h3>
          <small>n={d.summary.sample}</small>
        </header>
        <button
          className="profile-ring-row"
          onClick={() =>
            openShots(w.t("عينة التصويب", "Shot sample"), d.attempts)
          }
        >
          <span
            className="profile-ring"
            style={{
              background: `conic-gradient(${brand.colors.goal} ${(d.summary.efficiency ?? 0) * 100}%, #263a47 0)`,
            }}
          >
            <b>{percent(d.summary.efficiency)}</b>
          </span>
          <span>
            <strong>{d.summary.goals}</strong>
            <small>{w.t("أهداف مراجعة", "Reviewed goals")}</small>
            <strong>{d.summary.pending}</strong>
            <small>{w.t("محاولات للمراجعة", "Attempts to review")}</small>
          </span>
        </button>
        <EvidenceTrend
          data-testid="shot-efficiency-trend"
          points={d.shotTrend}
          label={w.t(
            "كفاءة تراكمية حسب المحاولات المراجعة",
            "Cumulative efficiency by reviewed attempt",
          )}
          onEvidence={(point) =>
            onEvidence(
              w.t("عينة اتجاه التصويب", "Shot trend sample"),
              point.events,
            )
          }
        />
        <small>
          {w.t(
            "تراكمي · كل نقطة تفتح عينتها",
            "Cumulative · each point opens its sample",
          )}
        </small>
      </article>
      <article className="dashboard-card">
        <header>
          <h3>{w.t("تهديدات اللاعبين", "Player threats")}</h3>
          <Play size={12} />
        </header>
        {d.players.length ? (
          d.players.slice(0, 3).map((p) => {
            const player = w.list("players").find((r) => r.id === p.id);
            return (
              <button
                className="dashboard-player"
                key={p.id}
                onClick={() =>
                  openShots(player ? rowLabel(player) : "—", p.rows)
                }
              >
                <PlayerAvatar number={s(player?.shirt_number)} />
                <span>
                  {player
                    ? rowLabel(player)
                    : w.t("هوية ناقصة", "Missing identity")}
                  <small>
                    {p.summary.goals}/{p.summary.sample}
                  </small>
                </span>
                <b>{percent(p.summary.efficiency)}</b>
              </button>
            );
          })
        ) : (
          <p>
            {w.t(
              "اربط اللاعب بمحاولته لإظهار ملفه وأدلته.",
              "Assign shooters to see their profiles and evidence.",
            )}
          </p>
        )}
      </article>
      <article className="dashboard-card">
        <header>
          <h3>{w.t("الهجمات المكتملة", "Completed possessions")}</h3>
          <small>n={d.resolved.length}</small>
        </header>
        <button
          className="dashboard-value"
          onClick={() => {
            const ids = new Set(d.scoring.map((p) => p.id));
            onEvidence(
              w.t("هجمات انتهت بهدف", "Scoring possessions"),
              d.sample.filter((e) => ids.has(s(e.possession_id))),
            );
          }}
        >
          <b>{percent(d.possessionEfficiency)}</b>
          <small>
            {w.t(
              "هجمات بهدف / هجمات ذات نتيجة",
              "Scoring / classified possessions",
            )}
          </small>
        </button>
        <div className="sample-meter">
          <i style={{ width: `${(d.possessionEfficiency ?? 0) * 100}%` }} />
        </div>
        <EvidenceTrend
          data-testid="possession-efficiency-trend"
          points={d.possessionTrend}
          label={w.t(
            "كفاءة تراكمية حسب الهجمات ذات النتيجة",
            "Cumulative efficiency by classified possession",
          )}
          onEvidence={(point) =>
            onEvidence(
              w.t("عينة اتجاه الهجمات", "Possession trend sample"),
              point.events,
            )
          }
        />
        <small>
          {d.closed.length - d.resolved.length}{" "}
          {w.t(
            "نتيجة ناقصة · المفتوحة خارج المقام",
            "missing outcomes · open possessions excluded",
          )}
        </small>
      </article>
      <article className="dashboard-card">
        <header>
          <h3>{w.t("مواقع فقد الكرة", "Turnover locations")}</h3>
          <small>n={d.turnovers.length}</small>
        </header>
        <div className="turnover-court">
          <Court>
            {d.locatedTurnovers.map((event) => (
              <circle
                key={event.id}
                cx={n(event.shot_x) * 1000}
                cy={n(event.shot_y) * 500}
                r="20"
                className="turnover-point"
                role="button"
                tabIndex={0}
                aria-label={w.t(
                  "دليل موقع فقد الكرة",
                  "Turnover location evidence",
                )}
                onClick={() =>
                  onEvidence(w.t("موقع فقد الكرة", "Turnover location"), [
                    event,
                  ])
                }
                onKeyDown={(key) => {
                  if (key.key === "Enter" || key.key === " ") {
                    key.preventDefault();
                    onEvidence(w.t("موقع فقد الكرة", "Turnover location"), [
                      event,
                    ]);
                  }
                }}
              />
            ))}
          </Court>
        </div>
        <small>
          {d.locatedTurnovers.length}/{d.turnovers.length}{" "}
          {w.t(
            "بموقع مسجل · لا نستنتج المواقع الناقصة",
            "with a recorded location · missing positions stay unknown",
          )}
        </small>
        <details className="turnover-phases">
          <summary>{w.t("حسب المرحلة", "By phase")}</summary>
          {d.phases.length ? (
            d.phases.map((g) => (
              <button
                className="phase-bar"
                key={g.phase}
                onClick={() =>
                  onEvidence(analysisLabel(g.phase, w.lang), g.events)
                }
              >
                <span>{analysisLabel(g.phase, w.lang)}</span>
                <i
                  style={{
                    width: `${(100 * g.events.length) / Math.max(1, d.turnovers.length)}%`,
                  }}
                />
                <b>{g.events.length}</b>
              </button>
            ))
          ) : (
            <p>
              {w.t(
                "لا توجد أحداث فقد كرة في العينة.",
                "No turnovers in this sample.",
              )}
            </p>
          )}
        </details>
      </article>
      <article className="dashboard-card">
        <header>
          <h3>{w.t("آخر النتائج المسجلة", "Recent recorded results")}</h3>
          <small>n={recent.length}</small>
        </header>
        {recent.length ? (
          <>
            <div
              className="recent-form"
              aria-label={w.t(
                "النتائج من منظور الفريق",
                "Results from this team's perspective",
              )}
            >
              {recent.map((entry) => (
                <Link
                  className={`form-outcome result-${entry.outcome.toLowerCase()}`}
                  href={`/matches/${entry.match.id}`}
                  key={entry.match.id}
                  aria-label={`${w.t("النتيجة", "Result")} ${entry.outcome} · ${entry.goalsFor}–${entry.goalsAgainst}`}
                >
                  {w.lang === "ar"
                    ? { W: "ف", D: "ت", L: "خ" }[entry.outcome]
                    : entry.outcome}
                </Link>
              ))}
            </div>
            <div className="recent-averages">
              <span>
                <b>
                  {(
                    recent.reduce((sum, entry) => sum + entry.goalsFor, 0) /
                    recent.length
                  ).toFixed(1)}
                </b>
                <small>{w.t("له / مباراة", "Scored / match")}</small>
              </span>
              <span>
                <b>
                  {(
                    recent.reduce((sum, entry) => sum + entry.goalsAgainst, 0) /
                    recent.length
                  ).toFixed(1)}
                </b>
                <small>{w.t("عليه / مباراة", "Conceded / match")}</small>
              </span>
            </div>
            <div
              className="recent-score-chart"
              aria-label={w.t(
                "له وعليه في آخر النتائج",
                "Scored and conceded in recent results",
              )}
            >
              {recent.map(({ match: m, goalsFor, goalsAgainst }) => (
                <Link
                  className="recent-score-pair"
                  href={`/matches/${m.id}`}
                  key={m.id}
                >
                  <span className="recent-opponent">
                    {rowLabel(
                      w
                        .list("teams")
                        .find(
                          (t) =>
                            t.id ===
                            (m.home_team_id === teamId
                              ? m.away_team_id
                              : m.home_team_id),
                        ) ?? {
                        id: "unknown",
                        organization_id: w.org,
                        name: "—",
                      },
                    )}
                  </span>
                  <span
                    className="score-bars"
                    aria-label={`${w.t("له", "Scored")} ${goalsFor}, ${w.t("عليه", "conceded")} ${goalsAgainst}`}
                  >
                    <i
                      className="scored-bar"
                      style={{ height: `${(42 * goalsFor) / scoreScale}px` }}
                    />
                    <i
                      className="conceded-bar"
                      style={{
                        height: `${(42 * goalsAgainst) / scoreScale}px`,
                      }}
                    />
                  </span>
                  <b dir="ltr">
                    {goalsFor}–{goalsAgainst}
                  </b>
                </Link>
              ))}
            </div>
            <small className="score-legend">
              <i />
              {w.t("له", "Scored")} <i />
              {w.t("عليه", "Conceded")}
            </small>
          </>
        ) : (
          <p>
            {w.t(
              "لا توجد نتائج مسجلة للفريق.",
              "No recorded results for this team.",
            )}
          </p>
        )}
        <small>
          {w.t(
            "نتائج المباراة، مستقلة عن أحداث الجلسة",
            "Match results, independent of session tags",
          )}
        </small>
      </article>
    </section>
  );
}
