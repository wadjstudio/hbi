"use client";
import Link from "next/link";
import { Play, ArrowUpRight } from "lucide-react";
import { matchDashboard } from "@/features/analysis/match-dashboard";
import { analysisLabel } from "@/features/analysis/labels";
import { percent } from "@/lib/analytics/metrics";
import { s, type Row } from "@/types/workspace";
import { useWorkspace } from "./provider";
import { rowLabel } from "./controls";
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
  const recent = w
    .list("matches")
    .filter(
      (m) =>
        (m.home_team_id === teamId || m.away_team_id === teamId) &&
        m.home_score != null &&
        m.away_score != null,
    )
    .sort((a, b) => s(b.starts_at).localeCompare(s(a.starts_at)))
    .slice(0, 5);
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
              background: `conic-gradient(#8beb57 ${(d.summary.efficiency ?? 0) * 100}%, #203849 0)`,
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
        <small>
          {w.t("كل نتيجة تفتح محاولاتها", "Every result opens its attempts")}
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
                <span className="player-monogram">
                  {s(player?.shirt_number) || "?"}
                </span>
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
          <h3>{w.t("فقد الكرة حسب المرحلة", "Turnovers by phase")}</h3>
          <small>n={d.turnovers.length}</small>
        </header>
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
      </article>
      <article className="dashboard-card">
        <header>
          <h3>{w.t("آخر النتائج المسجلة", "Recent recorded results")}</h3>
          <small>n={recent.length}</small>
        </header>
        {recent.length ? (
          recent.map((m) => (
            <Link
              className="recent-result"
              href={`/matches/${m.id}`}
              key={m.id}
            >
              <span>
                {rowLabel(
                  w
                    .list("teams")
                    .find(
                      (t) =>
                        t.id ===
                        (m.home_team_id === teamId
                          ? m.away_team_id
                          : m.home_team_id),
                    ) ?? { id: "unknown", organization_id: w.org, name: "—" },
                )}
              </span>
              <b dir="ltr">
                {s(m.home_score)} – {s(m.away_score)}
              </b>
              <ArrowUpRight size={12} />
            </Link>
          ))
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
