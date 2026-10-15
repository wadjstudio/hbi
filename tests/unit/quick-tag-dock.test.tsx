// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { QuickTagDock } from "@/components/workspace/quick-tag-dock";
vi.mock("@/components/workspace/provider", () => ({
  useWorkspace: () => ({ t: (_ar: string, en: string) => en }),
}));
afterEach(cleanup);
const setup = (available = true) => {
  const callbacks = {
    onPhase: vi.fn(),
    onEvent: vi.fn(),
    onShot: vi.fn(),
    onPossession: vi.fn(),
    onEditor: vi.fn(),
    onUndo: vi.fn(),
    onRedo: vi.fn(),
  };
  render(
    <QuickTagDock
      {...callbacks}
      available={available}
      busy={false}
      openPossession={false}
      undoAvailable
      redoAvailable
      context={<span>Recording team</span>}
      phase="positional_attack"
    />,
  );
  return callbacks;
};
it("changes phase separately from events and keeps awards, suspensions and shots distinct", () => {
  const c = setup();
  fireEvent.click(screen.getByRole("button", { name: "Defense" }));
  fireEvent.change(
    screen.getByRole("combobox", { name: "Transition context" }),
    { target: { value: "fast_break" } },
  );
  expect(c.onPhase.mock.calls).toEqual([["set_defense"], ["fast_break"]]);
  expect(c.onEvent).not.toHaveBeenCalled();
  expect(c.onShot).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "7m won" }));
  fireEvent.click(screen.getByRole("button", { name: "2 min" }));
  expect(c.onEvent.mock.calls).toEqual([
    ["seven_meter_won"],
    ["two_minute_penalty"],
  ]);
  expect(c.onShot).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Goal" }));
  fireEvent.click(screen.getByRole("button", { name: "Shot to review" }));
  expect(c.onShot.mock.calls).toEqual([["goal"], ["unknown"]]);
});
it("disables recording without a writable linked source while retaining access to context", () => {
  const c = setup(false);
  fireEvent.click(screen.getByRole("button", { name: "7m won" }));
  expect(c.onEvent).not.toHaveBeenCalled();
  expect(
    (
      screen.getByRole("combobox", {
        name: "Transition context",
      }) as HTMLSelectElement
    ).disabled,
  ).toBe(true);
  fireEvent.click(
    screen.getByRole("button", { name: "Context & participants" }),
  );
  expect(c.onEditor).toHaveBeenCalledOnce();
});
