"use client";
import { useState, type ComponentProps } from "react";
import {
  lineupSnapshot,
  lineupAnchors,
  type LineupClock,
} from "@/features/players/lineup-snapshot";
import type { SessionScope } from "@/features/analysis/session-statistics";
import { positions, s, n, type Row } from "@/types/workspace";
import { formatTime } from "@/lib/video/time";
import { Court } from "./court";
import { PlayerAvatar } from "@/components/brand/brand-lockup";
import { useWorkspace } from "./provider";
import { rowLabel } from "./controls";

type LineupOverviewProps = ComponentProps<"section"> & {
  scope: SessionScope;
  teamId: string;
  teams: Row[];
  roster: Row[];
  intervals: Row[];
  clock: LineupClock;
  onTeamChange: (id: string) => void;
};
export const LineupOverview = ({
  scope,
  teamId,
  teams,
  roster,
  intervals,
  clock,
  onTeamChange,
  className,
  ...props
}: LineupOverviewProps) => {
  const w = useWorkspace();
  const [selected, setSelected] = useState("");
  const snapshot = lineupSnapshot(scope, teamId, clock, { roster, intervals });
  const chosen = snapshot.intervals.find((row) => row.id === selected);
  const player = (row: Row) =>
    w
      .list("players")
      .find(
        (candidate) =>
          candidate.organization_id === scope.organizationId &&
          candidate.id === row.player_id,
      );
  const name = (row: Row) => {
    const found = player(row);
    return found
      ? rowLabel(found)
      : w.t("هوية اللاعب غير متاحة", "Player identity unavailable");
  };
  const number = (row: Row) =>
    s(
      snapshot.roster.find((entry) => entry.player_id === row.player_id)
        ?.shirt_number ?? player(row)?.shirt_number,
    ) || "—";
  const select = (row: Row) => setSelected(row.id);
  return (
    <section
      {...props}
      data-slot="lineup-overview"
      className={`lineup-overview ${className ?? ""}`}
      aria-label={w.t("التشكيلة عند ساعة المباراة", "Lineup at game clock")}
    >
      <header className="lineup-heading">
        <div>
          <h3>{w.t("التشكيلة عند ساعة المباراة", "Lineup at game clock")}</h3>
          <p>
            {snapshot.hasClock ? (
              <>
                {w.t("شوط", "Period")} {clock!.period} ·{" "}
                <b dir="ltr">{formatTime(clock!.clockMs)}</b>
              </>
            ) : (
              w.t(
                "عاير ساعة المباراة لعرض فترات اللعب عند اللقطة.",
                "Calibrate the game clock to locate on-court intervals at this frame.",
              )
            )}
          </p>
        </div>
        <label>
          {w.t("فريق التشكيلة والتسجيل", "Lineup and recording team")}
          <select
            value={teamId}
            onChange={(event) => {
              setSelected("");
              onTeamChange(event.target.value);
            }}
          >
            {teams.map((team) => (
              <option value={team.id} key={team.id}>
                {rowLabel(team)}
              </option>
            ))}
          </select>
        </label>
      </header>
      <p className="lineup-method">
        {w.t(
          "توزيع تخطيطي للمراكز المسجلة، وليس تتبعًا لمواقع اللاعبين. القائمة الأساسية لا تثبت من في الملعب الآن؛ الفراغ يعني عدم وجود فترة صالحة وواضحة لهذا المركز عند التوقيت المحدد.",
          "Schematic recorded roles, not tracked player locations. Declared starters do not establish who is currently on court; an empty role means no unambiguous valid interval is available for that role at this time.",
        )}
      </p>
      <div className="lineup-layout">
        <div>
          <div className="lineup-court">
            <Court />
            {positions.map((position) => {
              const members = snapshot.placed.filter(
                (row) => row.position === position,
              );
              const anchor = lineupAnchors[position];
              return (
                <div
                  className="lineup-position"
                  style={{
                    left: `${anchor[0] * 100}%`,
                    top: `${anchor[1] * 100}%`,
                  }}
                  key={position}
                >
                  {members.length ? (
                    members.map((row) => (
                      <button
                        key={row.id}
                        className={
                          row.verified === true ? "is-verified" : "needs-review"
                        }
                        aria-label={`${name(row)} · ${position}${row.verified !== true ? ` · ${w.t("تحتاج التحقق", "Needs verification")}` : ""}`}
                        aria-pressed={chosen?.id === row.id}
                        onClick={() => select(row)}
                      >
                        <b>{number(row)}</b>
                        <span>
                          {position}
                          {row.verified !== true ? " ?" : ""}
                        </span>
                      </button>
                    ))
                  ) : (
                    <span
                      className="lineup-empty-role"
                      aria-label={`${position} · ${w.t("غير مسجل", "Not recorded")}`}
                    >
                      {position}
                      <small>—</small>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <p className="lineup-coverage">
            {w.t("فترات نشطة مسجلة", "Recorded active intervals")}:{" "}
            {snapshot.hasClock ? snapshot.active.length : "—"} ·{" "}
            {w.t("تحتاج المراجعة", "Needs review")}:{" "}
            {snapshot.hasClock
              ? snapshot.active.filter((row) => row.verified !== true).length
              : "—"}
            {!snapshot.hasClock
              ? ` · ${w.t("الساعة غير معروفة", "Clock unknown")}`
              : ""}
          </p>
          {snapshot.ambiguous.length > 0 && (
            <p className="notice">
              {w.t(
                "فترات متداخلة للاعب نفسه مستبعدة من الرسم؛ صحّحها قبل اعتماد التشكيلة.",
                "Overlapping intervals for the same player are excluded from the diagram; resolve them before accepting the lineup.",
              )}{" "}
              ({snapshot.ambiguous.length})
            </p>
          )}
          {snapshot.unplaced.length > 0 && (
            <p className="notice">
              {snapshot.unplaced.length}{" "}
              {w.t("فترة دون مركز معروف", "intervals without a known role")}
            </p>
          )}
          {snapshot.invalid.length > 0 && (
            <p className="notice">
              {snapshot.invalid.length}{" "}
              {w.t(
                "فترة بزمن غير صالح مستبعدة من الرسم",
                "intervals with invalid timing excluded from the diagram",
              )}
            </p>
          )}
        </div>
        <aside className="lineup-interval-detail" aria-live="polite">
          <h4>{w.t("دليل فترة اللعب", "On-court interval detail")}</h4>
          {chosen ? (
            <>
              <div className="lineup-selected-player">
                <PlayerAvatar number={number(chosen)} />
                <b>{name(chosen)}</b>
              </div>
              <dl>
                <dt>{w.t("المركز المسجل", "Recorded role")}</dt>
                <dd>{s(chosen.position) || "—"}</dd>
                <dt>{w.t("الشوط", "Period")}</dt>
                <dd>{s(chosen.period)}</dd>
                <dt>{w.t("ساعة البداية", "Start clock")}</dt>
                <dd dir="ltr">{formatTime(n(chosen.start_clock_ms))}</dd>
                <dt>{w.t("ساعة النهاية", "End clock")}</dt>
                <dd dir="ltr">
                  {chosen.end_clock_ms == null
                    ? "…"
                    : formatTime(n(chosen.end_clock_ms))}
                </dd>
                <dt>{w.t("حالة المراجعة", "Review state")}</dt>
                <dd>
                  {chosen.verified === true
                    ? w.t("مؤكدة", "Verified")
                    : w.t("تحتاج التحقق", "Needs verification")}
                  {chosen.end_clock_ms == null
                    ? ` · ${w.t("فترة مفتوحة", "Open interval")}`
                    : ""}
                </dd>
              </dl>
              <small dir="ltr">{chosen.id}</small>
            </>
          ) : (
            <p>
              {w.t(
                "اختر لاعبًا على الرسم لعرض الفترة التي تحدد وجوده ومركزه.",
                "Choose a diagram player to inspect the interval behind their presence and role.",
              )}
            </p>
          )}
        </aside>
      </div>
      <div className="lineup-roster">
        <h4>
          {w.t("قائمة الفريق المعلنة", "Declared team roster")} ·{" "}
          {snapshot.roster.length}
        </h4>
        <div>
          {snapshot.roster.map((row) => (
            <article key={row.id}>
              <PlayerAvatar number={number(row)} />
              <span>
                <b>{name(row)}</b>
                <small>
                  {row.starting
                    ? w.t("أساسي معلن", "Declared starter")
                    : w.t("ضمن القائمة", "Listed player")}
                </small>
              </span>
            </article>
          ))}
        </div>
        {!snapshot.roster.length && (
          <p>
            {w.t(
              "لا توجد قائمة مسجلة لهذا الفريق.",
              "No roster recorded for this team.",
            )}
          </p>
        )}
      </div>
    </section>
  );
};
