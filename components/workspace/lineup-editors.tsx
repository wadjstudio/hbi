"use client";
import { useState } from "react";
import { useWorkspace } from "./provider";
import { SelectRow, rowLabel, type useAction } from "./controls";
import { formatTime, type matchClock } from "@/lib/video/time";
import { s, n, positions, type Row } from "@/types/workspace";
import { canWrite } from "@/lib/permissions/roles";
import type { lineupSnapshot } from "@/features/players/lineup-snapshot";

// Remount with key={teamId} so the player selections reset on team change.
export function LineupEditors({
  matchId,
  homeTeamId,
  teamId,
  isStarting,
  onStartingChange,
  roster,
  lineup,
  players,
  clock,
  timeMs,
  position,
  onPosition,
  isWritable,
  base,
  action,
}: {
  matchId: string;
  homeTeamId: string;
  teamId: string;
  isStarting: boolean;
  onStartingChange: (value: boolean) => void;
  roster: Row[];
  lineup: ReturnType<typeof lineupSnapshot>;
  players: Row[];
  clock: ReturnType<typeof matchClock>;
  timeMs: number;
  position: string;
  onPosition: (position: string) => void;
  isWritable: boolean;
  base: () => Partial<Row>;
  action: ReturnType<typeof useAction>;
}) {
  const w = useWorkspace();
  const [outPlayer, setOut] = useState(""),
    [inPlayer, setIn] = useState("");
  const canEnter = (id: string) =>
    Boolean(
      clock &&
      lineup.hasClock &&
      players.some((row) => row.id === id) &&
      !lineup.invalid.some((row) => row.player_id === id) &&
      !lineup.intervals.some(
        (row) =>
          row.player_id === id &&
          row.period === clock.period &&
          (row.end_clock_ms == null || n(row.end_clock_ms) > clock.clockMs),
      ),
    );
  const canLeave = (id: string) =>
    Boolean(
      clock &&
      lineup.hasClock &&
      !lineup.invalid.some((row) => row.player_id === id) &&
      !lineup.ambiguous.some((row) => row.player_id === id) &&
      lineup.intervals.some(
        (row) =>
          row.player_id === id &&
          row.period === clock.period &&
          row.end_clock_ms == null &&
          n(row.start_clock_ms) < clock.clockMs,
      ),
    );
  return (
    <details className="lineup-editors">
      <summary>
        {w.t(
          "إدارة القائمة وفترات اللعب والتبديلات",
          "Roster, interval and substitution tools",
        )}
      </summary>
      <fieldset
        disabled={!canWrite(w.role, "on_court_intervals") || action.busy}
      >
        <label>
          <input
            type="checkbox"
            checked={isStarting}
            onChange={(e) => onStartingChange(e.target.checked)}
          />
          {w.t("الإضافة كأساسي معلن", "Add as declared starter")}
        </label>
        <div className="form-grid">
          <SelectRow
            label={w.t("لاعب", "Player")}
            rows={w.list("players")}
            value={inPlayer}
            onChange={setIn}
          />
          <SelectRow
            label={w.t("خروج", "Out")}
            rows={players}
            value={outPlayer}
            onChange={setOut}
          />
          <label>
            {w.t("المركز", "Position")}
            <select
              value={position}
              onChange={(e) => onPosition(e.target.value)}
            >
              {positions.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="toolbar">
          <button
            disabled={
              !w.online ||
              !inPlayer ||
              !teamId ||
              roster.some((row) => row.player_id === inPlayer)
            }
            onClick={() =>
              void action.run(() =>
                w.direct("match_roster", {
                  match_id: matchId,
                  player_id: inPlayer,
                  team_id: teamId,
                  side: teamId === homeTeamId ? "home" : "away",
                  starting: isStarting,
                }),
              )
            }
          >
            {w.t("إضافة للقائمة", "Add to roster")}
          </button>
          <button
            disabled={!isWritable || !canEnter(inPlayer)}
            onClick={() =>
              void action.run(() =>
                w.save("on_court_intervals", {
                  ...base(),
                  team_id: teamId,
                  player_id: inPlayer,
                  position,
                  start_clock_ms: clock?.clockMs ?? 0,
                  verified: true,
                }),
              )
            }
          >
            {w.t("فتح فترة لعب", "Open interval")}
          </button>
          <button
            disabled={
              !isWritable ||
              !clock ||
              inPlayer === outPlayer ||
              !(inPlayer || outPlayer) ||
              Boolean(inPlayer && !canEnter(inPlayer)) ||
              Boolean(outPlayer && !canLeave(outPlayer))
            }
            onClick={() =>
              void action.run(() =>
                w.substitute({
                  id: crypto.randomUUID(),
                  organization_id: w.org,
                  ...base(),
                  team_id: teamId,
                  out_player_id: outPlayer || null,
                  in_player_id: inPlayer || null,
                  position,
                  period: clock!.period,
                  clock_ms: clock!.clockMs,
                  video_ms: timeMs,
                } as Row),
              )
            }
          >
            {w.t("تبديل", "Substitute")}
          </button>
        </div>
        {!w.online && (
          <p className="notice">
            {w.t(
              "إدارة القائمة تحتاج اتصالًا. فترات اللعب والتبديلات تستخدم الحفظ المحلي في مساحة المباراة المجهزة.",
              "Roster setup needs a connection. Intervals and substitutions use local saves in the prepared match workspace.",
            )}
          </p>
        )}
        <p className="lineup-method">
          {w.t(
            "لفتح فترة أو تسجيل تبديل: اختر لاعبًا من قائمة الفريق، واربط الفيديو وعاير الساعة. إغلاق الفترة يحتاج الشوط نفسه وزمنًا لاحقًا للبداية؛ الفترات المنتهية تبقى للقراءة.",
            "To open an interval or substitute, choose a roster player, link the source and calibrate its clock. Closing requires the same period and a later clock; closed intervals remain read-only.",
          )}
        </p>
        {lineup.intervals.map((r) => (
          <div className="interval" key={r.id}>
            {rowLabel(w.list("players").find((p) => p.id === r.player_id) ?? r)}{" "}
            · {s(r.position)} · {n(r.period)} ·{" "}
            {formatTime(n(r.start_clock_ms))} →{" "}
            {r.end_clock_ms == null ? "…" : formatTime(n(r.end_clock_ms))}
            <button
              disabled={
                !isWritable ||
                !clock ||
                r.end_clock_ms != null ||
                lineup.invalid.some((row) => row.id === r.id) ||
                lineup.ambiguous.some((row) => row.id === r.id) ||
                r.period !== clock.period ||
                clock.clockMs <= n(r.start_clock_ms)
              }
              onClick={() =>
                void action.run(() =>
                  w.save("on_court_intervals", {
                    ...r,
                    end_clock_ms: clock!.clockMs,
                    verified: true,
                  }),
                )
              }
            >
              {w.t("إغلاق", "Close")}
            </button>
          </div>
        ))}
      </fieldset>
    </details>
  );
}
