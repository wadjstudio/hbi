"use client";
import Link from "next/link";
import { Target, ArrowUpRight, Play, Users } from "lucide-react";
import { tacticalGroups } from "@/features/analysis/workbench";
import { shotSummary, percent, ratio } from "@/lib/analytics/metrics";
import { s, type Row } from "@/types/workspace";
import { useWorkspace } from "./provider";
import { ShotMap } from "./charts";
import { rowLabel } from "./controls";

export function SessionAnalysisRail({
  teams,
  events,
  shots,
  possessions,
  filtered,
  focusTeam,
  onTeam,
  onEvidence,
}: {
  teams: Row[];
  events: Row[];
  shots: Row[];
  possessions: Row[];
  filtered: boolean;
  focusTeam: string;
  onTeam: (id: string) => void;
  onEvidence: (title: string, events: Row[]) => void;
}) {
  const w = useWorkspace();
  const tid = teams.some((team) => team.id === focusTeam)
    ? focusTeam
    : teams[1]?.id || teams[0]?.id || "";
  const team = teams.find((team) => team.id === tid);
  const sample = events.filter((event) => event.team_id === tid),
    ids = new Set(sample.map((e) => e.id));
  const attempts = shots.filter((shot) => ids.has(s(shot.event_id))),
    summary = shotSummary(attempts);
  const pids = new Set(events.map((e) => s(e.possession_id)));
  const pool = filtered
    ? possessions.filter((p) => pids.has(p.id))
    : possessions;
  const attack = pool.filter((p) => p.team_id === tid),
    defense = pool.filter((p) => p.team_id !== tid);
  const terms = w.list("tactical_terms"),
    assignments = w.list("possession_tactics");
  const systems = tacticalGroups(
    defense,
    assignments,
    terms,
    events,
    "defense_system",
  );
  const patterns = tacticalGroups(
    attack,
    assignments,
    terms,
    events,
    "attack_action",
  );
  const descriptorCount = systems.reduce(
    (sum, g) => sum + g.possessions.length,
    0,
  );
  const colors = ["#25d9f5", "#ff6b35", "#87b8d7", "#b7f34a", "#f5c84c"];
  const gradient = systems
    .map((group, i) => {
      const start =
        (100 *
          systems
            .slice(0, i)
            .reduce((sum, g) => sum + g.possessions.length, 0)) /
        Math.max(1, descriptorCount);
      const stop =
        start + (100 * group.possessions.length) / Math.max(1, descriptorCount);
      return `${colors[i % colors.length]} ${start}% ${stop}%`;
    })
    .join(",");
  const shooters = [
    ...new Set(attempts.map((shot) => s(shot.shooter_id)).filter(Boolean)),
  ]
    .map((id) => {
      const playerShots = attempts.filter((shot) => shot.shooter_id === id);
      return {
        id,
        shots: playerShots,
        summary: shotSummary(playerShots),
        player: w.list("players").find((p) => p.id === id),
      };
    })
    .sort((a, b) => b.summary.sample - a.summary.sample);
  const evidenceFor = (selected: Row[]) =>
    sample.filter((event) =>
      selected.some((shot) => shot.event_id === event.id),
    );
  return (
    <aside
      className="session-rail"
      aria-label={w.t("تحليل بجوار الفيديو", "Video-side intelligence")}
    >
      <header className="intelligence-heading">
        <Target size={19} />
        <div>
          <span className="hbi-kicker">MATCH INTELLIGENCE</span>
          <h2>{team ? rowLabel(team) : w.t("اختر فريقًا", "Choose team")}</h2>
        </div>
        <select
          aria-label={w.t("الفريق محل التحليل", "Intelligence team")}
          value={tid}
          onChange={(e) => onTeam(e.target.value)}
        >
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {rowLabel(team)}
            </option>
          ))}
        </select>
      </header>
      <div className="rail-summary">
        <button
          onClick={() =>
            onEvidence(
              w.t("عينة التصويب", "Shot sample"),
              evidenceFor(attempts),
            )
          }
        >
          <small>{w.t("كفاءة التصويب", "Shot efficiency")}</small>
          <b>{percent(summary.efficiency)}</b>
          <small>
            {summary.goals}/{summary.sample} · {summary.pending}{" "}
            {w.t("للمراجعة", "to review")}
          </small>
        </button>
        <button
          onClick={() =>
            onEvidence(w.t("الأحداث المصنفة", "Tagged events"), sample)
          }
        >
          <small>{w.t("حجم العينة", "Sample size")}</small>
          <b>{sample.length}</b>
          <small>{w.t("حدث · جلسة واحدة", "events · one session")}</small>
        </button>
      </div>
      <section className="intelligence-section">
        <header>
          <h3>{w.t("أنظمة الدفاع", "Defensive systems")}</h3>
          <small>{w.t("الهجمات المقابلة", "Opposing possessions")}</small>
        </header>
        {systems.length ? (
          <>
            <div className="defense-distribution">
              <div
                className="defense-ring"
                style={{ background: `conic-gradient(${gradient})` }}
              >
                <div>
                  <strong>{descriptorCount}</strong>
                  <small>{w.t("توصيف", "descriptors")}</small>
                </div>
              </div>
              <div className="defense-legend">
                {systems.map((g, i) => (
                  <button
                    key={g.term.id}
                    onClick={() =>
                      onEvidence(
                        s(w.lang === "ar" ? g.term.label_ar : g.term.label_en),
                        g.events,
                      )
                    }
                  >
                    <i style={{ background: colors[i % colors.length] }} />
                    <span>
                      {s(w.lang === "ar" ? g.term.label_ar : g.term.label_en)}
                    </span>
                    <b>
                      {percent(ratio(g.possessions.length, descriptorCount))}
                    </b>
                  </button>
                ))}
              </div>
            </div>
            <small>
              {defense.length}{" "}
              {w.t(
                "هجمة في العينة · التوزيع من التوصيفات، وقد يتغير النظام داخل الهجمة",
                "sample possessions · distribution counts descriptors; systems can change within a possession",
              )}
            </small>
          </>
        ) : (
          <p className="intelligence-empty">
            {w.t(
              "صنّف النظام الدفاعي أثناء الهجمة ليظهر توزيعه وأدلته هنا.",
              "Tag defensive systems during possessions to reveal their distribution and evidence.",
            )}
          </p>
        )}
      </section>
      <section className="intelligence-section">
        <header>
          <h3>{w.t("خريطة التصويب", "Shot map")}</h3>
          <button
            className="evidence-text"
            onClick={() =>
              onEvidence(
                w.t("تصويبات الفريق", "Team shots"),
                evidenceFor(attempts),
              )
            }
          >
            {w.t("الأدلة", "Evidence")} <ArrowUpRight size={12} />
          </button>
        </header>
        <ShotMap
          shots={attempts}
          onSelect={(shot) =>
            onEvidence(
              w.t("دليل التصويبة", "Shot evidence"),
              evidenceFor([shot]),
            )
          }
        />
        <small>
          {
            attempts.filter(
              (shot) => shot.court_x == null || shot.court_y == null,
            ).length
          }{" "}
          {w.t(
            "محاولة دون إحداثيات · النقر يفتح المصدر",
            "attempts without coordinates · click to open source",
          )}
        </small>
      </section>
      <section className="intelligence-section">
        <header>
          <h3>{w.t("اللاعبون في العينة", "Players in sample")}</h3>
          <Users size={14} />
        </header>
        {shooters.length ? (
          shooters.slice(0, 4).map((entry) => (
            <button
              className="threat-row"
              key={entry.id}
              onClick={() =>
                onEvidence(
                  entry.player
                    ? rowLabel(entry.player)
                    : w.t("لاعب غير محدد", "Unknown player"),
                  evidenceFor(entry.shots),
                )
              }
            >
              <span className="player-monogram">
                {s(entry.player?.shirt_number) || "?"}
              </span>
              <span>
                <b>{entry.player ? rowLabel(entry.player) : "—"}</b>
                <small>
                  {entry.summary.goals}/{entry.summary.sample} ·{" "}
                  {entry.summary.sample < 10
                    ? w.t("عينة قليلة", "Small sample")
                    : w.t("محاولات معروفة", "known attempts")}
                </small>
              </span>
              <strong>{percent(entry.summary.efficiency)}</strong>
              <Play size={13} />
            </button>
          ))
        ) : (
          <p className="intelligence-empty">
            {w.t(
              "اربط المصوّب بالمحاولة. لا نستنتج هوية لاعب من ترتيب القائمة.",
              "Link shooters to attempts. Roster order does not identify a shooter.",
            )}
          </p>
        )}
      </section>
      <section className="intelligence-section">
        <header>
          <h3>{w.t("أنماط الهجوم", "Attack patterns")}</h3>
          <small>{w.t("قواعد قابلة للمراجعة", "Reviewable rules")}</small>
        </header>
        {patterns.length ? (
          patterns.slice(0, 4).map((g) => (
            <button
              className="pattern-row"
              key={g.term.id}
              onClick={() =>
                onEvidence(
                  s(w.lang === "ar" ? g.term.label_ar : g.term.label_en),
                  g.events,
                )
              }
            >
              <span>
                {s(w.lang === "ar" ? g.term.label_ar : g.term.label_en)}
                <small>
                  {g.possessions.length}/{attack.length}{" "}
                  {w.t("هجمات في العينة", "sample possessions")}
                </small>
              </span>
              <Play size={14} />
            </button>
          ))
        ) : (
          <p className="intelligence-empty">
            {w.t(
              "ابدأ هجمة وسجّل الإجراء التكتيكي؛ بعدها راجع أحداثها قبل اعتماد الاستنتاج.",
              "Start a possession and tag its procedure, then review its events before accepting an insight.",
            )}
          </p>
        )}
      </section>
      <Link className="intelligence-more" href="/opponents">
        {w.t(
          "فتح تحليل الخصوم عبر المباريات",
          "Open opponent analysis across matches",
        )}
        <ArrowUpRight size={13} />
      </Link>
    </aside>
  );
}
