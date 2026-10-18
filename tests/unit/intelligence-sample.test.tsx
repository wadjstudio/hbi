// @vitest-environment jsdom
import React from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { IntelligenceSample } from "@/components/workspace/intelligence-sample";
vi.mock("@/components/workspace/provider", () => ({
  useWorkspace: () => ({ t: (_ar: string, en: string) => en }),
}));
afterEach(cleanup);
it("keeps pending-only shots accessible without inventing a denominator or historical coverage", () => {
  const onShots = vi.fn(),
    onEvents = vi.fn();
  render(
    <IntelligenceSample
      summary={{ sample: 0, goals: 0, pending: 1, efficiency: null }}
      sampleSize={1}
      isHistorical={false}
      isShotEvidenceAvailable
      onShots={onShots}
      onEvents={onEvents}
    />,
  );
  const trigger = screen.getByText("n=1").closest("summary")!;
  const details = trigger.closest("details")!;
  details.open = true;
  expect(screen.getByText("Current session only")).toBeVisible();
  const shots = screen.getByRole("button", { name: /Shot efficiency/ });
  expect(shots).not.toBeDisabled();
  expect(shots.textContent).toContain("0/0");
  fireEvent.click(shots);
  expect(onShots).toHaveBeenCalledOnce();
  expect(onEvents).not.toHaveBeenCalled();
  expect(details.open).toBe(false);
});
it("retains historical scope, disables empty evidence and dismisses through Escape and outside focus", () => {
  render(
    <IntelligenceSample
      summary={{ sample: 0, goals: 0, pending: 0, efficiency: null }}
      sampleSize={0}
      isHistorical
      isShotEvidenceAvailable={false}
      onShots={vi.fn()}
      onEvents={vi.fn()}
    />,
  );
  const trigger = screen.getByText("n=0").closest("summary")!;
  const details = trigger.closest("details")!;
  details.open = true;
  expect(screen.getByText(/one primary session per match/)).toBeVisible();
  expect(
    screen.getByRole("button", { name: /Shot efficiency/ }),
  ).toBeDisabled();
  expect(screen.getByRole("button", { name: /Sample size/ })).toBeDisabled();
  fireEvent.keyDown(screen.getByRole("region"), { key: "Escape" });
  expect(details.open).toBe(false);
  expect(document.activeElement).toBe(trigger);
  details.open = true;
  fireEvent.pointerDown(document.body);
  expect(details.open).toBe(false);
});
