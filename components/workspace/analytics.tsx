"use client";
import Link from "next/link";
import { useState } from "react";
import { useWorkspace } from "./provider";
import { Panel, Notice, SelectRow, rowLabel, useAction } from "./controls";
import { positionMetrics } from "@/features/players/position-metrics";
import { EvidenceLinks } from "./evidence-links";
import { ShotMap } from "./charts";
import {
  percent,
  shotSummary,
  keeperSummary,
  intervalMinutes,
} from "@/lib/analytics/metrics";
import { s, n, type Row } from "@/types/workspace";
import { formatTime } from "@/lib/video/time";
export function Evidence({ events, title }: { events: Row[]; title?: string }) {
  const w = useWorkspace();
  return (
    <Panel title={title ?? w.t("الأدلة", "Evidence")}>
      <small>n={events.length}</small>
      <div className="entity-list">
        {events.map((e) => (
          <article key={e.id}>
            <Link href={`/matches/${s(e.match_id)}?event=${e.id}`}>
              {formatTime(n(e.timestamp_ms))} · {s(e.event_type)} ·{" "}
              {rowLabel(
                w.list("players").find((p) => p.id === e.actor_player_id) ?? e,
              )}
            </Link>
            <span>{s(e.note)}</span>
          </article>
        ))}
      </div>
    </Panel>
  );
}
export function Analytics({
  playerId,
  opponent = false,
}: {
  playerId?: string;
  opponent?: boolean;
}) {
  const w = useWorkspace(),
    a = useAction();
  const [teamId, setTeam] = useState(""),
    [last, setLast] = useState(5),
    [evidence, setEvidence] = useState<Row[]>([]),
    [zone, setZone] = useState("all"),
    [position, setPosition] = useState("all");
  const teams = w.list("teams").filter((t) => !opponent || !t.is_own_team),
    tid =
      teamId ||
      (playerId
        ? s(
            w.list("match_roster").find((r) => r.player_id === playerId)
              ?.team_id,
          )
        : "") ||
      teams[0]?.id ||
      "",
    player = playerId ? w.list("players").find((p) => p.id === playerId) : null;
  const selectedMatches = w
      .list("matches")
      .filter((m) => m.home_team_id === tid || m.away_team_id === tid)
      .sort((a, b) => s(b.starts_at).localeCompare(s(a.starts_at)))
      .slice(0, last),
    matchIds = new Set(selectedMatches.map((m) => m.id)),
    sessions = new Set(
      w
        .list("analysis_sessions")
        .filter((a) => a.is_primary && matchIds.has(s(a.match_id)))
        .map((a) => a.id),
    );
  const allEvents = w
      .list("events")
      .filter((e) => sessions.has(s(e.analysis_session_id))),
    events = allEvents.filter(
      (e) => e.team_id === tid && (!playerId || e.actor_player_id === playerId),
    ),
    ids = new Set(events.map((e) => e.id));
  const allShots = w
      .list("shot_attempts")
      .filter((sh) => allEvents.some((e) => e.id === sh.event_id)),
    shots = allShots.filter(
      (sh) =>
        ids.has(s(sh.event_id)) &&
        (zone === "all" || sh.zone === zone) &&
        (position === "all" || sh.shooter_position === position),
    ),
    summary = shotSummary(shots);
  const possessions = w
      .list("possessions")
      .filter(
        (p) => sessions.has(s(p.analysis_session_id)) && p.team_id === tid,
      ),
    turnovers = events.filter((e) => e.event_type === "turnover"),
    intervals = w
      .list("on_court_intervals")
      .filter(
        (i) =>
          sessions.has(s(i.analysis_session_id)) && i.player_id === playerId,
      ),
    minutes = intervalMinutes(intervals);
  const keeper = playerId ? keeperSummary(allShots, playerId) : null;
  const tactical = w
      .list("possession_tactics")
      .filter((pt) => possessions.some((p) => p.id === pt.possession_id)),
    groups = new Map<string, Set<string>>();
  for (const pt of tactical) {
    const term = w.list("tactical_terms").find((t) => t.id === pt.term_id);
    if (["defense_system", "defense_behavior"].includes(s(term?.category)))
      continue;
    const key = s(pt.term_id);
    if (!groups.has(key)) groups.set(key, new Set());
    groups.get(key)!.add(s(pt.possession_id));
  }
  const defendingPossessions = w
    .list("possessions")
    .filter(
      (p) =>
        sessions.has(s(p.analysis_session_id)) &&
        p.team_id !== tid &&
        selectedMatches.some((m) => m.id === p.match_id),
    );
  const defenseGroups = new Map<string, Set<string>>();
  for (const assignment of w.list("possession_tactics")) {
    const term = w
      .list("tactical_terms")
      .find((t) => t.id === assignment.term_id);
    if (
      ["defense_system", "defense_behavior"].includes(s(term?.category)) &&
      defendingPossessions.some((p) => p.id === assignment.possession_id)
    ) {
      const id = s(assignment.term_id);
      if (!defenseGroups.has(id)) defenseGroups.set(id, new Set());
      defenseGroups.get(id)!.add(s(assignment.possession_id));
    }
  }
  async function insight(
    termId: string,
    pids: Set<string>,
    denominator = possessions.length,
  ) {
    const term = w.list("tactical_terms").find((t) => t.id === termId),
      ev = allEvents.filter((e) => pids.has(s(e.possession_id)));
    if (!ev.length) throw new Error("No supporting events");
    const i = await w.save("insights", {
      team_id: tid,
      source: "rule",
      insight_key: `tactic:${termId}:${selectedMatches.map((m) => m.id).join(",")}`,
      title: `${s(w.lang === "ar" ? term?.label_ar : term?.label_en)} · ${pids.size}/${denominator}`,
      body: w.t(
        `ظهر في ${pids.size} هجمات من ${denominator} في العينة المحددة. لا يعني سببًا للنتيجة.`,
        `Observed in ${pids.size} of ${denominator} possessions in the selected sample. Association is not causation.`,
      ),
      is_reviewed: false,
      evidence: [],
    });
    for (const e of ev)
      await w.save("evidence_links", { insight_id: i.id, event_id: e.id });
    setEvidence(ev);
  }
  return (
    <>
      <div className="page-title">
        <h1>
          {player
            ? rowLabel(player)
            : w.t(
                opponent ? "تحليل الخصم" : "تحليل الأداء",
                opponent ? "Opponent intelligence" : "Performance analysis",
              )}
        </h1>
        <div className="toolbar">
          <SelectRow
            label={w.t("الفريق", "Team")}
            rows={teams}
            value={tid}
            onChange={setTeam}
          />
          <select
            aria-label="Last matches"
            value={last}
            onChange={(e) => setLast(Number(e.target.value))}
          >
            {[3, 5, 10, 1000].map((v) => (
              <option key={v} value={v}>
                {v === 1000
                  ? w.t("كل المباريات", "All matches")
                  : w.t(`آخر ${v}`, `Last ${v}`)}
              </option>
            ))}
          </select>
        </div>
      </div>
      {a.error && <Notice>{a.error}</Notice>}
      <div className="metric-grid">
        <button
          className="hbi-panel metric"
          onClick={() =>
            setEvidence(
              events.filter((e) => shots.some((sh) => sh.event_id === e.id)),
            )
          }
        >
          <span>{w.t("كفاءة التصويب", "Shot efficiency")}</span>
          <b>{percent(summary.efficiency)}</b>
          <small>
            n={summary.sample} · {summary.pending}{" "}
            {w.t("للمراجعة", "pending review")}
          </small>
        </button>
        <button
          className="hbi-panel metric"
          onClick={() =>
            setEvidence(
              events.filter((e) =>
                shots.some(
                  (sh) => sh.event_id === e.id && sh.result === "goal",
                ),
              ),
            )
          }
        >
          <span>{w.t("الأهداف", "Goals")}</span>
          <b>{summary.goals}</b>
        </button>
        <button
          className="hbi-panel metric"
          onClick={() => setEvidence(turnovers)}
        >
          <span>{w.t("فقد الكرة", "Turnovers")}</span>
          <b>{turnovers.length}</b>
        </button>
        {keeper && (
          <button
            className="hbi-panel metric"
            onClick={() =>
              setEvidence(
                allEvents.filter((e) =>
                  allShots.some(
                    (sh) =>
                      sh.event_id === e.id && sh.goalkeeper_id === playerId,
                  ),
                ),
              )
            }
          >
            <span>{w.t("تصدي الحارس", "Goalkeeper saves")}</span>
            <b>{percent(keeper.percentage)}</b>
            <small>n={keeper.sample}</small>
          </button>
        )}
        {player && (
          <div className="hbi-panel metric">
            <span>{w.t("دقائق مؤكدة", "Verified minutes")}</span>
            <b>{minutes == null ? "—" : minutes.toFixed(1)}</b>
          </div>
        )}
      </div>
      {playerId && (
        <Panel
          title={w.t(
            "المقاييس حسب المركز أثناء المباراة",
            "Metrics by match position",
          )}
        >
          <small>
            {w.t(
              "البيانات التي ينقصها المركز أو المقام لا تتحول إلى صفر.",
              "Missing position or denominator stays unknown.",
            )}
          </small>
          {positionMetrics(playerId, allEvents, allShots, intervals).map(
            (metric, i) => (
              <button
                className="hbi-panel metric"
                key={i}
                onClick={() =>
                  setEvidence(
                    allEvents.filter((event) =>
                      metric.evidence.includes(event.id),
                    ),
                  )
                }
              >
                <span>
                  {metric.position} ·{" "}
                  {w.lang === "ar" ? metric.labelAr : metric.labelEn}
                </span>
                <b>
                  {metric.unit === "percent"
                    ? percent(metric.value)
                    : metric.value == null
                      ? "—"
                      : metric.value.toFixed(2)}
                </b>
                <small>n={metric.sample}</small>
              </button>
            ),
          )}
        </Panel>
      )}
      <Panel title={w.t("خريطة التصويب", "Shot map")}>
        <div className="toolbar">
          <select
            aria-label="Zone"
            value={zone}
            onChange={(e) => setZone(e.target.value)}
          >
            {[
              "all",
              "lw",
              "rw",
              "pivot_left",
              "pivot_center",
              "pivot_right",
              "nine_meter_left",
              "nine_meter_center",
              "nine_meter_right",
              "seven_meter",
            ].map((z) => (
              <option key={z}>{z}</option>
            ))}
          </select>
          <select
            aria-label="Position"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
          >
            {["all", "LW", "RW", "P", "LB", "CB", "RB"].map((z) => (
              <option key={z}>{z}</option>
            ))}
          </select>
        </div>
        <ShotMap
          shots={shots}
          onSelect={(sh) =>
            setEvidence(events.filter((e) => e.id === sh.event_id))
          }
        />
      </Panel>
      <div className="analysis-grid">
        <Panel title={w.t("الإجراءات التكتيكية", "Tactical procedures")}>
          <small>
            {possessions.length}{" "}
            {w.t(
              "هجمة مسجلة · النسب من بيانات موصوفة",
              "tagged possessions · distributions require descriptors",
            )}
          </small>
          {[...groups].map(([id, pids]) => {
            const term = w.list("tactical_terms").find((t) => t.id === id);
            return (
              <article className="tendency" key={id}>
                <button
                  onClick={() =>
                    setEvidence(
                      events.filter((e) => pids.has(s(e.possession_id))),
                    )
                  }
                >
                  {s(w.lang === "ar" ? term?.label_ar : term?.label_en)}{" "}
                  <b>{pids.size}</b>
                </button>
                <button
                  disabled={pids.size < 3 || w.role === "viewer"}
                  onClick={() => void a.run(() => insight(id, pids))}
                >
                  {w.t("حفظ insight بالأدلة", "Save evidence-backed insight")}
                </button>
              </article>
            );
          })}
        </Panel>
        <Panel title={w.t("Insights قابلة للمراجعة", "Reviewable insights")}>
          {w
            .list("insights")
            .filter((i) => i.team_id === tid)
            .map((i) => (
              <article className="tendency" key={i.id}>
                <b>{s(i.title)}</b>
                <p>{s(i.body)}</p>
                <button
                  onClick={() => {
                    const links = w
                      .list("evidence_links")
                      .filter((l) => l.insight_id === i.id);
                    setEvidence(
                      allEvents.filter((e) =>
                        links.some((l) => l.event_id === e.id),
                      ),
                    );
                  }}
                >
                  {w.t("شاهد الأدلة", "Watch evidence")}
                </button>
                <button
                  onClick={() =>
                    void a.run(() =>
                      w.save("insights", { ...i, is_reviewed: !i.is_reviewed }),
                    )
                  }
                >
                  {i.is_reviewed
                    ? w.t("مراجع", "Reviewed")
                    : w.t("اعتماد بعد المراجعة", "Mark reviewed")}
                </button>
              </article>
            ))}
        </Panel>
      </div>
      <Panel
        title={w.t(
          "الدفاع أمام هجمات الخصم",
          "Defense against opponent attacks",
        )}
      >
        <small>
          {defendingPossessions.length}{" "}
          {w.t(
            "هجمة في العينة · تُحسب من الوصف المسجل",
            "possessions in sample · explicitly tagged observations",
          )}
        </small>
        {[...defenseGroups].map(([termId, ids]) => {
          const term = w.list("tactical_terms").find((t) => t.id === termId);
          return (
            <article key={termId} className="tendency">
              <button
                onClick={() =>
                  setEvidence(
                    allEvents.filter((e) => ids.has(s(e.possession_id))),
                  )
                }
              >
                {s(w.lang === "ar" ? term?.label_ar : term?.label_en)} · n=
                {ids.size}
              </button>
              <button
                disabled={ids.size < 3 || w.role === "viewer"}
                onClick={() =>
                  void a.run(() =>
                    insight(termId, ids, defendingPossessions.length),
                  )
                }
              >
                {w.t("حفظ insight بالأدلة", "Save evidence-backed insight")}
              </button>
            </article>
          );
        })}
      </Panel>
      <Evidence events={evidence} />
      <EvidenceLinks />
    </>
  );
}
