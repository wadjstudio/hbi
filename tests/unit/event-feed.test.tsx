// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { EventFeed } from "@/components/workspace/event-feed";
import type { Row } from "@/types/workspace";
const row = (id: string, fields: Partial<Row> = {}): Row => ({
  id,
  organization_id: "org",
  match_id: "match",
  analysis_session_id: "session",
  ...fields,
});
vi.mock("@/components/workspace/provider", () => ({
  useWorkspace: () => ({
    t: (_ar: string, en: string) => en,
    list: (table: string) =>
      table === "players"
        ? [
            row("shooter", { name: "Shooter", shirt_number: 17 }),
            row("actor", { name: "Actor" }),
          ]
        : table === "teams"
          ? [row("home", { name: "Home" })]
          : [],
  }),
}));
afterEach(cleanup);
const setup = (isWritable: boolean, isLegacy = false) => {
  const event = row("event", {
    team_id: "home",
    timestamp_ms: 1000,
    period: 1,
    match_clock_ms: null,
    actor_player_id: "actor",
    event_type: isLegacy ? "goal" : "shot",
  });
  const callbacks = { onEdit: vi.fn(), onClip: vi.fn(), onEvidence: vi.fn() };
  render(
    <EventFeed
      scope={{ organizationId: "org", matchId: "match", sessionId: "session" }}
      events={[
        event,
        row("foreign", { organization_id: "other" }),
        row("secondary", { analysis_session_id: "other" }),
      ]}
      shots={
        isLegacy
          ? []
          : [
              row("shot", {
                event_id: event.id,
                shooter_id: "shooter",
                result: "unknown",
              }),
            ]
      }
      isCanEdit={isWritable}
      isCanClip={isWritable}
      {...callbacks}
    />,
  );
  return { event, ...callbacks };
};
it("uses the canonical shooter, keeps missing clocks unknown and sends only the selected scoped event to each action", () => {
  const c = setup(true);
  expect(screen.getAllByRole("article")).toHaveLength(1);
  expect(screen.getByText("Shooter · Home")).toBeTruthy();
  expect(screen.getByText("Attempt to review")).toBeTruthy();
  expect(document.querySelector(".event-feed-time")!.textContent).toContain(
    "—",
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Evidence" }),
  );
  expect(c.onEvidence.mock.calls[0]![1]).toEqual([c.event]);
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Evidence clip" }),
  );
  expect(c.onEdit).toHaveBeenCalledWith(c.event);
  expect(c.onClip).toHaveBeenCalledWith(c.event);
});
it("keeps legacy attempts reviewable and disables write actions without disabling evidence", () => {
  const c = setup(false, true);
  expect(screen.getByText("Legacy attempt needs review")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Evidence clip" }),
  );
  expect(c.onEdit).not.toHaveBeenCalled();
  expect(c.onClip).not.toHaveBeenCalled();
  fireEvent.click(
    screen.getByRole("button", { name: "Evidence" }),
  );
  expect(c.onEvidence).toHaveBeenCalledOnce();
});
