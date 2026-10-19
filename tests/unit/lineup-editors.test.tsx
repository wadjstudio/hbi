// @vitest-environment jsdom
import React, { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { LineupEditors } from "@/components/workspace/lineup-editors";

const state = vi.hoisted(() => ({ direct: vi.fn() }));
vi.mock("@/components/workspace/provider", () => ({
  useWorkspace: () => ({
    ...state,
    role: "owner",
    online: true,
    org: "org",
    list: () => [{ id: "player", first_name: "Player" }],
    t: (_ar: string, en: string) => en,
  }),
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
const Harness = ({
  team,
  isShown = true,
}: {
  team: string;
  isShown?: boolean;
}) => {
  const [isStarting, setStarting] = useState(true);
  return isShown ? (
    <LineupEditors
      key={team}
      matchId="match"
      homeTeamId="home"
      teamId={team}
      isStarting={isStarting}
      onStartingChange={setStarting}
      roster={[]}
      players={[]}
      clock={null}
      lineup={
        {
          hasClock: false,
          intervals: [],
          invalid: [],
          ambiguous: [],
          roster: [],
        } as unknown as React.ComponentProps<typeof LineupEditors>["lineup"]
      }
      timeMs={0}
      position="CB"
      onPosition={() => {}}
      isWritable={false}
      base={() => ({})}
      action={{
        busy: false,
        error: "",
        run: async (fn: () => Promise<unknown>) => {
          await fn();
        },
      }}
    />
  ) : (
    <div>Events tab</div>
  );
};
it("preserves the starter choice across both team and tab remounts and submits it with roster additions", () => {
  const view = render(<Harness team="home" />);
  fireEvent.click(screen.getByLabelText("Add as declared starter"));
  view.rerender(<Harness team="away" />);
  expect(
    (screen.getByLabelText("Add as declared starter") as HTMLInputElement)
      .checked,
  ).toBe(false);
  view.rerender(<Harness team="away" isShown={false} />);
  view.rerender(<Harness team="away" />);
  expect(
    (screen.getByLabelText("Add as declared starter") as HTMLInputElement)
      .checked,
  ).toBe(false);
  fireEvent.change(screen.getByRole("combobox", { name: /^Player$/ }), {
    target: { value: "player" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Add to roster" }));
  expect(state.direct).toHaveBeenCalledWith("match_roster", {
    match_id: "match",
    team_id: "away",
    player_id: "player",
    side: "away",
    starting: false,
  });
});
