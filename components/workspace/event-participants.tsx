"use client";
import { useState } from "react";
import { useWorkspace } from "./provider";
import { Notice, SelectRow, rowLabel, useAction } from "./controls";
import { formatTime } from "@/lib/video/time";
import { s, n, type Row } from "@/types/workspace";

export function EventParticipants({
  events,
  matchId,
}: {
  events: Row[];
  matchId: string;
}) {
  const w = useWorkspace(),
    a = useAction();
  const [eventId, setEvent] = useState(""),
    [playerId, setPlayer] = useState(""),
    [role, setRole] = useState("assister");
  const selected = events.some((e) => e.id === eventId)
    ? eventId
    : (events[0]?.id ?? "");
  const roster = new Set(
    w
      .list("match_roster")
      .filter((r) => r.match_id === matchId)
      .map((r) => s(r.player_id)),
  );
  const players = w.list("players").filter((p) => roster.has(p.id));
  const participants = w
    .list("event_participants")
    .filter((p) => p.event_id === selected);
  return (
    <details>
      <summary>{w.t("المشاركون في الحدث", "Event participants")}</summary>
      {a.error && <Notice>{a.error}</Notice>}
      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          void a.run(async () => {
            if (!selected || !playerId)
              throw new Error(
                w.t("اختر حدثًا ولاعبًا", "Select an event and player"),
              );
            const existing = participants.find(
              (p) => p.player_id === playerId && p.role === role,
            );
            await w.save("event_participants", {
              ...existing,
              event_id: selected,
              player_id: playerId,
              role,
            });
          });
        }}
      >
        <SelectRow
          label={w.t("الحدث المرتبط", "Linked event")}
          rows={events.map((e) => ({
            ...e,
            title: `${formatTime(n(e.timestamp_ms))} · ${s(e.event_type)}`,
          }))}
          value={selected}
          onChange={setEvent}
        />
        <SelectRow
          label={w.t("المشارك", "Participant")}
          rows={players}
          value={playerId}
          onChange={setPlayer}
        />
        <label>
          {w.t("الدور", "Role")}
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            {[
              "actor",
              "assister",
              "passer",
              "receiver",
              "defender",
              "goalkeeper",
              "victim",
              "other",
            ].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
        <button disabled={a.busy || w.role === "viewer"}>
          {w.t("إضافة مشارك", "Add participant")}
        </button>
      </form>
      {participants.map((p) => (
        <article key={p.id}>
          {rowLabel(players.find((player) => player.id === p.player_id) ?? p)} ·{" "}
          {s(p.role)}{" "}
          <button
            disabled={w.role === "viewer"}
            onClick={() =>
              void a.run(() => w.save("event_participants", p, true))
            }
          >
            {w.t("حذف", "Delete")}
          </button>
        </article>
      ))}
    </details>
  );
}
