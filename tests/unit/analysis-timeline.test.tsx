// @vitest-environment jsdom
import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  act,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { AnalysisTimeline } from "@/components/workspace/analysis-timeline";
import { timelineGroups, timelineWindow } from "@/features/analysis/workbench";
import type { Row } from "@/types/workspace";
vi.mock("@/components/workspace/provider", () => ({
  useWorkspace: () => ({ t: (_ar: string, en: string) => en }),
}));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const row = (id: string, timestamp_ms: number): Row => ({
  id,
  organization_id: "org",
  timestamp_ms,
  event_type: "shot",
});
it("groups hit targets without transitive merging, reordering inputs or losing simultaneous events", () => {
  const events = [
    row("c", 1400),
    row("a", 1000),
    row("b", 1000),
    row("d", 1200),
  ];
  const window = timelineWindow(10000, 0, 1);
  expect(
    timelineGroups(events, window, 1000).map((group) => group.map((e) => e.id)),
  ).toEqual([["a", "b", "d"], ["c"]]);
  expect(events.map((e) => e.id)).toEqual(["c", "a", "b", "d"]);
  expect(
    timelineGroups(events, timelineWindow(10000, 0, 4), 1000).map(
      (group) => group.length,
    ),
  ).toEqual([2, 1, 1]);
  expect(timelineGroups(events, window, 200).flat()).toHaveLength(4);
});
it("does not turn missing times into zero or place events outside the visible recording", () => {
  const invalid = [
    row("nan", NaN),
    row("negative", -1),
    row("outside", 10001),
    { id: "missing", organization_id: "org" },
  ];
  expect(timelineGroups(invalid, timelineWindow(10000, 0, 1), 1000)).toEqual(
    [],
  );
  expect(
    timelineGroups([row("zero", 0)], timelineWindow(0, 0, 1), 1000),
  ).toEqual([]);
});
it("opens the exact clustered event and closes with Escape, focus departure and outside pointer", () => {
  let resize: ResizeObserverCallback = () => {};
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback: ResizeObserverCallback) {
        resize = callback;
      }
      observe() {}
      disconnect() {}
    },
  );
  const events = [row("a", 1000), row("b", 1000), row("c", 4000)];
  const onEvent = vi.fn();
  const view = render(
    <AnalysisTimeline
      events={events}
      shots={[]}
      possessions={[]}
      clips={[]}
      durationMs={10000}
      timeMs={0}
      selectedId="b"
      onEvent={onEvent}
      onSeek={vi.fn()}
    />,
  );
  act(() =>
    resize(
      [{ contentRect: { width: 1000 } } as ResizeObserverEntry],
      {} as ResizeObserver,
    ),
  );
  const summary = screen.getByText("2").closest("summary")!;
  const details = summary.closest("details")!;
  expect(summary.classList.contains("selected")).toBe(true);
  details.open = true;
  const choices = screen.getAllByRole("button", { name: /0:01.*shot/ });
  fireEvent.click(choices[1]!);
  expect(onEvent).toHaveBeenCalledExactlyOnceWith(events[1]);
  expect(details.open).toBe(false);
  details.open = true;
  fireEvent.keyDown(
    screen.getByRole("region", { name: "Choose timeline event" }),
    { key: "Escape" },
  );
  expect(details.open).toBe(false);
  expect(document.activeElement).toBe(summary);
  details.open = true;
  fireEvent.pointerDown(document.body);
  expect(details.open).toBe(false);
  details.open = true;
  fireEvent.focusIn(screen.getByRole("button", { name: "Zoom in timeline" }));
  expect(details.open).toBe(false);
  act(() =>
    resize(
      [{ contentRect: { width: 100 } } as ResizeObserverEntry],
      {} as ResizeObserver,
    ),
  );
  expect(view.container.querySelectorAll(".timeline-cluster")).toHaveLength(1);
});
