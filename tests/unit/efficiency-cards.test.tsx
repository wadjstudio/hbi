// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { EfficiencyRing } from "@/components/workspace/efficiency-ring";
import { PlayerThreatRow } from "@/components/workspace/player-threat-row";
import { ShotProfileCard } from "@/components/workspace/shot-profile-card";
import { shotSummary } from "@/lib/analytics/metrics";
import type { Row } from "@/types/workspace";
vi.mock("@/components/workspace/provider", () => ({
  useWorkspace: () => ({ t: (_ar: string, en: string) => en }),
}));
afterEach(cleanup);
it("distinguishes known zero from an unavailable or invalid ring", () => {
  const view = render(<EfficiencyRing value={0} />);
  expect(view.container.textContent).toBe("0.0%");
  expect(view.container.querySelector(".efficiency-progress")).not.toBeNull();
  for (const value of [null, Number.NaN, Infinity, -0.1, 1.1]) {
    view.rerender(<EfficiencyRing value={value} />);
    expect(view.container.textContent).toBe("—");
    expect(view.container.querySelector(".efficiency-progress")).toBeNull();
  }
});
it("retains the full known rate without rounding its percentage label to an integer", () => {
  const view = render(
    <EfficiencyRing value={1 / 3} isLarge caption="Shot efficiency" />,
  );
  expect(view.container.textContent).toBe("33.3%Shot efficiency");
});
it("keeps all-attempt and reviewed-efficiency player actions distinct", () => {
  const onAll = vi.fn(),
    onReviewed = vi.fn();
  render(
    <PlayerThreatRow
      name="Back"
      number="17"
      summary={{ sample: 4, goals: 1, efficiency: 0.25, pending: 1 }}
      onAll={onAll}
      onReviewed={onReviewed}
    />,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Back · All attempts" }),
  );
  expect(onAll).toHaveBeenCalledTimes(1);
  expect(onReviewed).not.toHaveBeenCalled();
  fireEvent.click(
    screen.getByRole("button", {
      name: "Back · Shooting efficiency · 25.0% · 1/4",
    }),
  );
  expect(onReviewed).toHaveBeenCalledTimes(1);
  expect(screen.getByText(/1\/4 reviewed/).textContent).toContain("1 pending");
});
it("retains pending-player evidence when there is no reviewed denominator", () => {
  const onAll = vi.fn(),
    onReviewed = vi.fn();
  render(
    <PlayerThreatRow
      name="Wing"
      number="24"
      summary={{ sample: 0, goals: 0, efficiency: null, pending: 2 }}
      onAll={onAll}
      onReviewed={onReviewed}
    />,
  );
  const rate = screen.getByRole("button", {
    name: "Wing · Shooting efficiency · — · 0/0",
  }) as HTMLButtonElement;
  expect(rate.disabled).toBe(true);
  fireEvent.click(rate);
  expect(onReviewed).not.toHaveBeenCalled();
  fireEvent.click(
    screen.getByRole("button", { name: "Wing · All attempts" }),
  );
  expect(onAll).toHaveBeenCalledTimes(1);
});
it("opens exact reviewed, goal and pending shot groups from the profile", () => {
  const attempts: Row[] = [
    { id: "a", result: "goal", review_required: false },
    { id: "b", result: "save", review_required: false },
    { id: "c", result: "unknown", review_required: false },
    { id: "d", result: "goal", review_required: true },
  ].map((row) => ({ ...row, organization_id: "org" }));
  expect(shotSummary(attempts)).toEqual({
    sample: 2,
    goals: 1,
    efficiency: 0.5,
    pending: 2,
  });
  const onShots = vi.fn();
  render(
    <ShotProfileCard
      attempts={attempts}
      trend={[]}
      onShots={onShots}
      onTrend={vi.fn()}
    />,
  );
  fireEvent.click(
    screen.getByRole("button", {
      name: "Shot efficiency · 50.0% · 1/2",
    }),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "1 Reviewed goals" }),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "2 Attempts to review" }),
  );
  expect(
    onShots.mock.calls.map((call) => call[1].map((row: Row) => row.id)),
  ).toEqual([["a", "b"], ["a"], ["c", "d"]]);
});
