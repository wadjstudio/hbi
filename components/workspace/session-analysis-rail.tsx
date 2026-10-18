"use client";
import { Users } from "lucide-react";
import { tacticalGroups } from "@/features/analysis/workbench";
import { shotSummary, reviewedShotAttempts } from "@/lib/analytics/metrics";
import { s, type Row } from "@/types/workspace";
import { useWorkspace } from "./provider";
import { rowLabel } from "./controls";
import { ThreatProfile } from "./threat-profile";
import { BrandMark } from "@/components/brand/brand-lockup";
import { PlayerThreatRow } from "./player-threat-row";
import { IntelligenceListCard } from "./intelligence-list-card";
import { IntelligenceSample } from "./intelligence-sample";
import { DefenseSystemCard } from "./defense-system-card";
import { ShotZoneCard } from "./shot-zone-card";
import { IntelligenceKeepers } from "./intelligence-keepers";
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
        >
          <IntelligenceKeepers
            shots={defended}
            events={events}
            onEvidence={onEvidence}
          />
        </IntelligenceSample>
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
      <DefenseSystemCard
        groups={systems}
        possessionCount={defense.length}
        onEvidence={onEvidence}
      />
      <ThreatProfile
        shots={attempts}
        onEvidence={(title, selected) =>
          onEvidence(title, evidenceFor(selected))
        }
      />
      <ShotZoneCard
        shots={attempts}
        onEvidence={(title, selected) =>
          onEvidence(title, evidenceFor(selected))
        }
      />
      <section className="intelligence-section player-threat-section">
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
    </aside>
  );
}
