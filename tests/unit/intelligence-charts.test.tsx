// @vitest-environment jsdom
import React from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { shotZoneSample } from "@/features/analysis/shot-zone-sample";
import { DefenseSystemCard } from "@/components/workspace/defense-system-card";
import { ShotZoneCard } from "@/components/workspace/shot-zone-card";
import { IntelligenceKeepers } from "@/components/workspace/intelligence-keepers";
import { IntelligenceSample } from "@/components/workspace/intelligence-sample";
import { shotSummary } from "@/lib/analytics/metrics";
import type { TacticalGroup } from "@/features/analysis/workbench";
import type { Row } from "@/types/workspace";
vi.mock("@/components/workspace/provider", () => ({
  useWorkspace: () => ({
    lang: "en",
    t: (_ar: string, en: string) => en,
    list: () => [],
  }),
}));
afterEach(cleanup);
const row = (id: string, fields: Record<string, unknown> = {}): Row => ({
  id,
  organization_id: "org",
  ...fields,
});
it("retains pending coded zones, keeps broad zones separate and never infers missing zones from coordinates", () => {
  const shots = [
    row("pending", { zone: "rw", result: "unknown", review_required: true }),
    row("pivot", { zone: "pivot_left" }),
    row("back", { zone: "backcourt_left" }),
    row("centre", { zone: "center" }),
    row("unknown", { zone: "unknown", court_x: 0.5, court_y: 0.5 }),
    row("null", { zone: null, court_x: 0, court_y: 0 }),
    row("invalid", { zone: "nine_meter_left " }),
    row("left", { zone: "nine_meter_left" }),
  ];
  const sample = shotZoneSample(shots);
  expect(sample.sample).toBe(8);
  expect(sample.coded).toBe(5);
  expect(sample.other.map((shot) => shot.id)).toEqual(["back", "centre"]);
  expect(sample.missing.map((shot) => shot.id)).toEqual([
    "unknown",
    "null",
    "invalid",
  ]);
  expect(sample.groups.find((group) => group.key === "rw")?.shots).toEqual([
    shots[0],
  ]);
  expect(sample.groups.find((group) => group.key === "9l")?.shots).toEqual([
    shots[7],
  ]);
  expect(sample.groups.find((group) => group.key === "9c")?.shots).toEqual([]);
});
it("retains seven explicit zone groups with an unavailable empty denominator", () => {
  const sample = shotZoneSample([]);
  expect(sample.groups).toHaveLength(7);
  expect(sample.groups.every((group) => group.shots.length === 0)).toBe(true);
  expect(sample.coded).toBe(0);
  expect(sample.missing).toEqual([]);
});
const group = (id: string, label: string, count: number): TacticalGroup => ({
  term: row(id, { label_en: label, label_ar: label }),
  possessions: Array.from({ length: count }, (_, i) => row(`${id}-p${i}`)),
  events: [row(`${id}-e`)],
});
it("highlights the actual leading descriptor share and opens only that group's evidence", () => {
  const first = group("51", "5:1", 4),
    leader = group("60", "6:0", 8),
    onEvidence = vi.fn();
  const groups = [first, leader];
  render(
    <DefenseSystemCard
      groups={groups}
      possessionCount={10}
      onEvidence={onEvidence}
    />,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "6:0 · 66.7% · 8/12 descriptors" }),
  );
  expect(onEvidence).toHaveBeenCalledExactlyOnceWith("6:0", leader.events);
  expect(groups[0]).toBe(first);
  expect(screen.getByText(/not playing-time share/)).toBeInTheDocument();
});
it("labels a shared lead without merging tied evidence and retains an honest empty state", () => {
  const a = group("60", "6:0", 2),
    b = group("51", "5:1", 2),
    onEvidence = vi.fn();
  const view = render(
    <DefenseSystemCard
      groups={[a, b]}
      possessionCount={2}
      onEvidence={onEvidence}
    />,
  );
  fireEvent.click(
    screen.getByRole("button", {
      name: "6:0 · 50.0% · 2/4 descriptors · Joint leader",
    }),
  );
  expect(onEvidence).toHaveBeenCalledExactlyOnceWith("6:0", a.events);
  expect(screen.getByText(/2 tied/)).toBeInTheDocument();
  view.rerender(
    <DefenseSystemCard
      groups={[]}
      possessionCount={0}
      onEvidence={onEvidence}
    />,
  );
  expect(screen.queryByRole("button")).toBeNull();
  expect(screen.getByText(/Tag defensive systems/)).toBeVisible();
});
it("opens the exact pending-zone, penalty and missing samples with all-attempt shares", () => {
  const pending = row("pending", {
    zone: "pivot_center",
    result: "unknown",
    review_required: true,
  });
  const penalty = row("penalty", { zone: "seven_meter", result: "goal" });
  const missing = row("missing", { zone: null, court_x: 0.5, court_y: 0.5 });
  const onEvidence = vi.fn();
  render(
    <ShotZoneCard
      shots={[pending, penalty, missing]}
      onEvidence={onEvidence}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Pivot · 1/3 · 33.3%" }));
  expect(onEvidence).toHaveBeenLastCalledWith("Pivot", [pending]);
  fireEvent.click(screen.getByRole("button", { name: "7m · 1/3 · 33.3%" }));
  expect(onEvidence).toHaveBeenLastCalledWith("7m attempts", [penalty]);
  screen.getByText("Zones").closest("details")!.open = true;
  fireEvent.click(screen.getByRole("button", { name: "Unknown · 1/3" }));
  expect(onEvidence).toHaveBeenLastCalledWith("Unknown shot zone", [missing]);
  expect(
    screen.getByRole("button", { name: "Other zones · 0/3" }),
  ).toBeDisabled();
});
it("retains goalkeeper denominators and dismisses sample tools before opening exact evidence", () => {
  const shots = ["save", "goal", "miss", "blocked", "goal", "unknown"].map(
    (result, i) =>
      row(`s${i}`, {
        event_id: `e${i}`,
        goalkeeper_id: "gk",
        result,
        empty_goal: i === 4,
        review_required: i === 5,
      }),
  );
  const events = shots.map((_, i) => row(`e${i}`));
  const onEvidence = vi.fn(() => {
    expect(view.container.querySelector("details")!.open).toBe(false);
  });
  const view = render(
    <IntelligenceSample
      summary={shotSummary(shots)}
      sampleSize={events.length}
      isHistorical={false}
      isShotEvidenceAvailable
      onShots={vi.fn()}
      onEvents={vi.fn()}
    >
      <IntelligenceKeepers
        shots={shots}
        events={events}
        onEvidence={onEvidence}
      />
    </IntelligenceSample>,
  );
  view.container.querySelector("details")!.open = true;
  expect(screen.getByText("50.0%")).toBeVisible();
  fireEvent.click(view.container.querySelector("[data-goalkeeper-id]")!);
  expect(onEvidence).toHaveBeenCalledExactlyOnceWith("Goalkeeper", [
    events[0],
    events[1],
  ]);
});
