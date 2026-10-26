"use client";
import { useRef, useState } from "react";
import type { useWorkspace } from "@/features/workspace/provider";
import type { Row } from "@/types/workspace";

type Save = ReturnType<typeof useWorkspace>["save"];

export type EventHistoryItem = {
  event: Row;
  shot?: Row;
  previousEvent?: Row;
  previousShot?: Row;
  restoredEvent?: Row;
  restoredShot?: Row;
};

// Undo/redo for recorded events and their shot rows. Revisions are carried
// across steps so each save stays compatible with optimistic concurrency.
export function useEventHistory(save: Save) {
  const undo = useRef<EventHistoryItem[]>([]),
    redo = useRef<EventHistoryItem[]>([]);
  const [counts, setCounts] = useState({ undo: 0, redo: 0 });

  function reset() {
    undo.current = [];
    redo.current = [];
    setCounts({ undo: 0, redo: 0 });
  }

  function push(item: EventHistoryItem) {
    undo.current.push(item);
    redo.current = [];
    setCounts({ undo: undo.current.length, redo: 0 });
  }

  async function step(direction: "undo" | "redo") {
    const item = (direction === "undo" ? undo : redo).current.pop();
    if (!item) return;
    if (direction === "undo") {
      if (item.previousEvent) {
        item.restoredEvent = await save("events", {
          ...item.previousEvent,
          revision: item.event.revision,
        });
        if (item.previousShot)
          item.restoredShot = await save("shot_attempts", {
            ...item.previousShot,
            revision: item.shot?.revision ?? 0,
          });
        else if (item.shot) await save("shot_attempts", item.shot, true);
      } else {
        if (item.shot) await save("shot_attempts", item.shot, true);
        await save("events", item.event, true);
        item.restoredEvent = undefined;
        item.restoredShot = undefined;
      }
      redo.current.push(item);
    } else {
      item.event = await save("events", {
        ...item.event,
        revision: item.restoredEvent?.revision ?? 0,
      });
      if (item.shot)
        item.shot = await save("shot_attempts", {
          ...item.shot,
          revision: item.restoredShot?.revision ?? 0,
        });
      else if (item.restoredShot)
        await save("shot_attempts", item.restoredShot, true);
      undo.current.push(item);
    }
    setCounts({ undo: undo.current.length, redo: redo.current.length });
  }

  return { counts, reset, push, step };
}
