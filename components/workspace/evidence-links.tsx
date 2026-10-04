"use client";
import Link from "next/link";
import { useState } from "react";
import { useWorkspace } from "./provider";
import { Panel, SelectRow, Notice, useAction } from "./controls";
import { s, type Row } from "@/types/workspace";
export function EvidenceLinks() {
  const w = useWorkspace(),
    a = useAction();
  const [insight, setInsight] = useState(""),
    [event, setEvent] = useState(""),
    [clip, setClip] = useState(""),
    [tactic, setTactic] = useState(""),
    [note, setNote] = useState("");
  return (
    <Panel title={w.t("ربط الأدلة", "Link evidence")}>
      <form
        className="editor"
        onSubmit={(e) => {
          e.preventDefault();
          void a.run(() =>
            w.save("evidence_links", {
              insight_id: insight || null,
              event_id: event || null,
              clip_id: clip || null,
              tactic_id: tactic || null,
              note,
            }),
          );
        }}
      >
        <div className="form-grid">
          <SelectRow
            label="Insight"
            value={insight}
            onChange={setInsight}
            rows={w.list("insights")}
          />
          <SelectRow
            label={w.t("حدث", "Event")}
            value={event}
            onChange={setEvent}
            rows={w.list("events").map((r) => ({
              ...r,
              title: `${s(r.event_type)} ${s(r.timestamp_ms)}ms`,
            }))}
          />
          <SelectRow
            label={w.t("مقطع", "Clip")}
            value={clip}
            onChange={setClip}
            rows={w.list("clips")}
          />
          <SelectRow
            label={w.t("تكتيك", "Tactic")}
            value={tactic}
            onChange={setTactic}
            rows={w.list("tactic_documents")}
          />
        </div>
        <label>
          {w.t("ملاحظة", "Note")}
          <input value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <button
          disabled={
            [insight, event, clip, tactic].filter(Boolean).length < 2 ||
            w.role === "viewer"
          }
        >
          {w.t("ربط", "Link")}
        </button>
      </form>
      {a.error && <Notice>{a.error}</Notice>}
      {w.list("evidence_links").map((r) => {
        const e = w.list("events").find((e) => e.id === r.event_id);
        return (
          <div className="toolbar" key={r.id}>
            {e && (
              <Link href={`/matches/${s(e.match_id)}?event=${e.id}`}>
                {w.t("فتح الحدث", "Open event")}
              </Link>
            )}
            {r.tactic_id && (
              <Link href={`/tactics/${s(r.tactic_id)}`}>
                {w.t("فتح التكتيك", "Open tactic")}
              </Link>
            )}
            <span>{s(r.note)}</span>
            <button
              onClick={() =>
                void a.run(() => w.save("evidence_links", r, true))
              }
            >
              ×
            </button>
          </div>
        );
      })}
    </Panel>
  );
}
export function scopedEvents(rows: Row[], ids: Set<string>) {
  return rows.filter((r) => ids.has(r.id));
}
