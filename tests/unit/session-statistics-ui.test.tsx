// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { SessionStatistics } from "@/components/workspace/session-statistics";
import type { Row } from "@/types/workspace";

const row = (id: string, fields: Partial<Row> = {}): Row => ({
  id,
  organization_id: "org",
  match_id: "match",
  analysis_session_id: "session",
  team_id: "home",
  ...fields,
});
vi.mock("@/components/workspace/provider", () => ({
  useWorkspace: () => ({
    t: (_ar: string, en: string) => en,
    list: (table: string) => {
      const data: Record<string, Row[]> = {
        matches: [row("match", { home_team_id: "home", away_team_id: "away" })],
        teams: [row("home", { name: "Home" }), row("away", { name: "Away" })],
        players: [row("player", { name: "Player" })],
        match_roster: [row("roster", { player_id: "player" })],
      };
      return data[table] ?? [];
    },
  }),
}));
afterEach(cleanup);
const setup = (intervals: Row[] = []) => {
  const onEvidence = vi.fn();
  const events = [
    "goal",
    "miss",
    "pending",
    "save",
    "conceded",
    "wide",
    "empty",
  ].map((id) =>
    row(id, {
      actor_player_id: id === "goal" ? "player" : "other",
      team_id: ["save", "conceded", "wide", "empty"].includes(id)
        ? "away"
        : "home",
    }),
  );
  const shots = events.map((event) =>
    row(`shot-${event.id}`, {
      event_id: event.id,
      shooter_id: event.team_id === "home" ? "player" : "other",
      goalkeeper_id: event.team_id === "away" ? "player" : "other",
      result:
        { conceded: "goal", wide: "miss", empty: "goal", pending: "unknown" }[
          event.id
        ] ?? event.id,
      empty_goal: event.id === "empty",
    }),
  );
  render(
    <SessionStatistics
      scope={{ organizationId: "org", matchId: "match", sessionId: "session" }}
      view="players"
      focusTeam="home"
      events={events}
      shots={shots}
      possessions={[]}
      intervals={intervals}
      onEvidence={onEvidence}
    />,
  );
  return onEvidence;
};
it("opens the exact reviewed, pending and goalkeeper denominators rather than all player actions", () => {
  const onEvidence = setup();
  const ids = () => onEvidence.mock.lastCall![1].map((e: Row) => e.id);
  fireEvent.click(screen.getByRole("button", { name: "Player · Efficiency" }));
  expect(ids()).toEqual(["goal", "miss"]);
  fireEvent.click(
    screen.getByRole("button", { name: "Player · Goals / reviewed attempts" }),
  );
  expect(ids()).toEqual(["goal", "miss"]);
  fireEvent.click(
    screen.getByRole("button", { name: "Player · Attempts to review" }),
  );
  expect(ids()).toEqual(["pending"]);
  const keeper = screen.getByRole("button", { name: "Player · Saves / faced" });
  expect(keeper.textContent).toBe("1/2 · 50.0%");
  fireEvent.click(keeper);
  expect(ids()).toEqual(["save", "conceded"]);
});
it("exposes clock, period, position and verification without inventing minutes for incomplete intervals", () => {
  setup([
    row("closed", {
      player_id: "player",
      period: 1,
      start_clock_ms: 60000,
      end_clock_ms: 180000,
      position: "RB",
      verified: true,
    }),
    row("open", {
      player_id: "player",
      period: 2,
      start_clock_ms: 300000,
      end_clock_ms: null,
      position: "CB",
      verified: false,
    }),
    row("foreign", {
      player_id: "player",
      organization_id: "other",
      end_clock_ms: 900000,
      verified: true,
    }),
  ]);
  const summary = screen.getByLabelText("Player · On-court intervals");
  expect(summary.textContent).toBe("—2 intervals");
  fireEvent.click(summary);
  const details = summary.closest("details")!;
  expect(details.querySelectorAll("li")).toHaveLength(2);
  expect(details.textContent).toContain("Period 1 · RB");
  expect(details.textContent).toContain("1:00 – 3:00");
  expect(details.textContent).toContain("Period 2 · CB");
  expect(details.textContent).toContain("Open interval");
});
it("totals only complete verified intervals and preserves missing interval data", () => {
  const stint = row("closed", {
    player_id: "player",
    period: 1,
    start_clock_ms: 60000,
    end_clock_ms: 180000,
    position: "RB",
    verified: true,
  });
  setup([stint]);
  expect(screen.getByLabelText("Player · On-court intervals").textContent).toBe(
    "2.01 intervals",
  );
  cleanup();
  setup([{ ...stint, verified: false }]);
  const unverified = screen.getByLabelText("Player · On-court intervals");
  expect(unverified.textContent).toBe("—1 intervals");
  fireEvent.click(unverified);
  expect(unverified.closest("details")!.textContent).toContain(
    "Needs verification",
  );
  cleanup();
  setup();
  const missing = screen.getByLabelText("Player · On-court intervals");
  expect(missing.textContent).toBe("—0 intervals");
  fireEvent.click(missing);
  expect(missing.closest("details")!.textContent).toContain(
    "No recorded intervals.",
  );
});
