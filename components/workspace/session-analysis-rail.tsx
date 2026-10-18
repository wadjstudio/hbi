"use client";
import Link from "next/link";
import { ArrowUpRight, Play, Users } from "lucide-react";
import { tacticalGroups } from "@/features/analysis/workbench";
import {
  shotSummary,
  keeperSummary,
  percent,
  ratio,
  reviewedShotAttempts,
} from "@/lib/analytics/metrics";
import { s, type Row } from "@/types/workspace";
import { useWorkspace } from "./provider";
import { ShotMap } from "./charts";
import { rowLabel } from "./controls";
import { ThreatProfile } from "./threat-profile";
import { BrandMark, PlayerAvatar } from "@/components/brand/brand-lockup";
import { PlayerThreatRow } from "./player-threat-row";
import { IntelligenceListCard } from "./intelligence-list-card";
import { IntelligenceSample } from "./intelligence-sample";
import { brand } from "@/lib/brand";
import type { IntelligenceScope } from "@/features/analysis/intelligence-scope";

export function SessionAnalysisRail({
  teams,
  events,
  shots,
  possessions,
  filtered,
  focusTeam,
  onTeam,
  onEvidence,
  scope,
  onScope,
  coverage,
}: {
  teams: Row[];
  events: Row[];
  shots: Row[];
  possessions: Row[];
  filtered: boolean;
  focusTeam: string;
  onTeam: (id: string) => void;
  onEvidence: (title: string, events: Row[]) => void;
  scope: IntelligenceScope;
  onScope: (scope: IntelligenceScope) => void;
  coverage?: {
    matches: number;
    sessions: number;
    missing: number;
    ambiguous: number;
    needsDate: boolean;
  };
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
  const colors = [
    brand.colors.cyan,
    brand.colors.gold,
    brand.colors.save,
    brand.colors.goal,
    "#95A8B6",
  ];
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
  const defendedIds = new Set(
    events.filter((event) => event.team_id !== tid).map((event) => event.id),
  );
  const defended = shots.filter((shot) => defendedIds.has(s(shot.event_id)));
  const goalkeeperIds = [
    ...new Set(defended.map((shot) => s(shot.goalkeeper_id)).filter(Boolean)),
  ];
  const links = w.list("evidence_links");
  const insights = w
    .list("insights")
    .filter((insight) => insight.team_id === tid)
    .map((insight) => {
      const linkedIds = new Set(
        links
          .filter((link) => link.insight_id === insight.id)
          .map((link) => s(link.event_id)),
      );
      return {
        insight,
        evidence: events.filter((event) => linkedIds.has(event.id)),
      };
    })
    .filter((entry) => entry.evidence.length > 0);
  return (
    <aside
      className="session-rail"
      aria-label={w.t("تحليل بجوار الفيديو", "Video-side intelligence")}
    >
      <header className="intelligence-heading">
        <BrandMark size={30} />
        <h2
          aria-label={`${w.t("التحليل", "Intelligence")} — ${team ? rowLabel(team) : w.t("اختر فريقًا", "Choose team")}`}
          title={`${w.t("التحليل", "Intelligence")} — ${team ? rowLabel(team) : w.t("اختر فريقًا", "Choose team")}`}
        >
          {w.t("التحليل", "Intelligence")} —{" "}
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
        </h2>
        <IntelligenceSample
          summary={summary}
          sampleSize={sample.length}
          isHistorical={scope !== "session"}
          isShotEvidenceAvailable={attempts.length > 0}
          onShots={() =>
            onEvidence(
              w.t("عينة التصويب", "Shot sample"),
              evidenceFor(attempts),
            )
          }
          onEvents={() =>
            onEvidence(w.t("الأحداث المصنفة", "Tagged events"), sample)
          }
        />
        <div
          className="intelligence-scope"
          role="group"
          aria-label={w.t("نطاق تحليل الفريق", "Team intelligence scope")}
        >
          {(["session", 3, 5, 10] as const).map((value) => (
            <button
              type="button"
              key={value}
              aria-pressed={scope === value}
              onClick={() => onScope(value)}
            >
              {value === "session"
                ? w.t("الجلسة", "This session")
                : w.t(`آخر ${value}`, `Last ${value}`)}
            </button>
          ))}
        </div>
      </header>
      {coverage && (
        <small className="intelligence-coverage" role="status">
          {coverage.needsDate ? (
            w.t(
              "حدّد تاريخ المباراة لاختيار العينة التاريخية",
              "Set the match date to select historical samples",
            )
          ) : (
            <>
              {coverage.sessions}/{coverage.matches}{" "}
              {w.t(
                "مباراة بجلسة أساسية · حتى تاريخ المباراة المفتوحة",
                "matches with a primary session · through the open match date",
              )}
              {coverage.missing > 0 &&
                ` · ${coverage.missing} ${w.t("بدون جلسة أساسية", "without a primary session")}`}
              {coverage.ambiguous > 0 &&
                ` · ${coverage.ambiguous} ${w.t("تعارض جلسات مستبعد", "ambiguous sessions excluded")}`}
              <span className="scope-note">
                {w.t(
                  "التايملاين والبطاقات السفلية: الجلسة الحالية",
                  "Timeline and lower cards: current session",
                )}
              </span>
            </>
          )}
        </small>
      )}
      <section className="intelligence-section defense-section">
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
            <details className="chart-method">
              <summary>
                {defense.length}{" "}
                {w.t("هجمة · طريقة الحساب", "possessions · method")}
              </summary>
              <small>
                {w.t(
                  "التوزيع من التوصيفات، وقد يتغير النظام داخل الهجمة",
                  "Distribution counts descriptors; systems can change within a possession",
                )}
              </small>
            </details>
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
      <ThreatProfile
        shots={attempts}
        onEvidence={(title, selected) =>
          onEvidence(title, evidenceFor(selected))
        }
      />
      <section className="intelligence-section shot-section">
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
          onGroup={(rows) =>
            onEvidence(
              w.t("عينة قطاع التصويب", "Shot location group"),
              evidenceFor(rows),
            )
          }
          onSelect={(shot) =>
            onEvidence(
              w.t("دليل التصويبة", "Shot evidence"),
              evidenceFor([shot]),
            )
          }
        />
      </section>
      <section className="intelligence-section">
        <header>
          <h3>{w.t("اللاعبون في العينة", "Players in sample")}</h3>
          <Users size={14} />
        </header>
        {shooters.length ? (
          shooters
            .slice(0, 4)
            .map((entry) => (
              <PlayerThreatRow
                key={entry.id}
                name={
                  entry.player
                    ? rowLabel(entry.player)
                    : w.t("لاعب غير محدد", "Unknown player")
                }
                number={s(entry.player?.shirt_number)}
                summary={entry.summary}
                onAll={() =>
                  onEvidence(
                    entry.player
                      ? rowLabel(entry.player)
                      : w.t("لاعب غير محدد", "Unknown player"),
                    evidenceFor(entry.shots),
                  )
                }
                onReviewed={() =>
                  onEvidence(
                    `${entry.player ? rowLabel(entry.player) : w.t("لاعب غير محدد", "Unknown player")} · ${w.t("كفاءة التصويب", "Shooting efficiency")}`,
                    evidenceFor(reviewedShotAttempts(entry.shots)),
                  )
                }
              />
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
      <IntelligenceListCard
        title={w.t("أنماط الهجوم", "Attack patterns")}
        entries={patterns.map((group) => {
          const title = s(
            w.lang === "ar" ? group.term.label_ar : group.term.label_en,
          );
          return {
            id: group.term.id,
            title,
            code: s(group.term.code),
            detail: `${group.possessions.length}/${attack.length} ${w.t("هجمات في العينة", "sample possessions")}`,
            isEvidenceAvailable: group.events.length > 0,
            onEvidence: () => onEvidence(title, group.events),
          };
        })}
        emptyText={w.t(
          "ابدأ هجمة وسجّل الإجراء التكتيكي؛ بعدها راجع أحداثها قبل اعتماد الاستنتاج.",
          "Start a possession and tag its procedure, then review its events before accepting an insight.",
        )}
      />
      <IntelligenceListCard
        isInsights
        title={w.t("استنتاجات بالأدلة", "Evidence-backed insights")}
        entries={insights.map(({ insight, evidence }) => ({
          id: insight.id,
          title: s(insight.title),
          body: s(insight.body),
          isReviewed: insight.is_reviewed === true,
          detail: `${insight.is_reviewed ? w.t("مراجع", "Reviewed") : w.t("بانتظار المراجعة", "Needs review")} · ${evidence.length} ${w.t("حدث", "events")}`,
          isEvidenceAvailable: evidence.length > 0,
          onEvidence: () => onEvidence(s(insight.title), evidence),
        }))}
        emptyText={w.t(
          "احفظ استنتاجًا بأدلته من تحليل الخصم ليظهر هنا عند وجود أحداثه في العينة.",
          "Save an insight with evidence in opponent analysis to see it alongside its events here.",
        )}
      />
      <div className="intelligence-footer">
        <details className="keeper-details">
          <summary>
            {w.t("تحليل حراس الفريق", "Team goalkeeper analysis")} ·{" "}
            {goalkeeperIds.length}
          </summary>
          <section className="intelligence-section keeper-section">
            <header>
              <h3>{w.t("حراس الفريق", "Team goalkeepers")}</h3>
              <small>
                {w.t("تصديات / تصديات + أهداف", "saves / saves + goals")}
              </small>
            </header>
            {goalkeeperIds.length ? (
              goalkeeperIds.map((id) => {
                const keeper = w
                    .list("players")
                    .find((player) => player.id === id),
                  summary = keeperSummary(defended, id);
                const selected = defended.filter(
                  (shot) =>
                    shot.goalkeeper_id === id &&
                    !shot.empty_goal &&
                    !shot.review_required &&
                    ["goal", "save"].includes(s(shot.result)),
                );
                return (
                  <button
                    className="threat-row"
                    key={id}
                    onClick={() =>
                      onEvidence(
                        keeper ? rowLabel(keeper) : w.t("الحارس", "Goalkeeper"),
                        events.filter((event) =>
                          selected.some((shot) => shot.event_id === event.id),
                        ),
                      )
                    }
                  >
                    <PlayerAvatar number="GK" />
                    <span>
                      <b>{keeper ? rowLabel(keeper) : "—"}</b>
                      <small>
                        {summary.saves}/{summary.sample} ·{" "}
                        {w.t("إهدار وحجب مستبعدان", "misses & blocks excluded")}
                      </small>
                    </span>
                    <strong>{percent(summary.percentage)}</strong>
                    <Play size={13} />
                  </button>
                );
              })
            ) : (
              <p className="intelligence-empty">
                {w.t(
                  "حدّد الحارس أمام محاولات الخصم لعرض التصديات وأدلتها.",
                  "Identify the keeper facing opponent attempts to show saves and evidence.",
                )}
              </p>
            )}
          </section>
        </details>
        <Link className="intelligence-more" href="/opponents">
          {w.t("مساحة تحليل الخصم", "Opponent workspace")}
          <ArrowUpRight size={13} />
        </Link>
      </div>
    </aside>
  );
}
