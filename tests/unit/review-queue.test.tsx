// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ReviewQueue } from "@/components/workspace/review-queue";
import { reviewQueue } from "@/features/analysis/review-queue";
import type { Row } from "@/types/workspace";
vi.mock("@/components/workspace/provider", () => ({
  useWorkspace: () => ({
    t: (_ar: string, en: string) => en,
    lang: "en",
    list: () => [],
  }),
}));
afterEach(cleanup);
const scope = { organizationId: "org", matchId: "match", sessionId: "session" };
const row = (id: string, data: Partial<Row> = {}): Row => ({
  id,
  organization_id: "org",
  match_id: "match",
  analysis_session_id: "session",
  ...data,
});
it("deduplicates canonical/legacy issues by scoped event and retains resolved-result legacy closure separately", () => {
  const events = [
    row("unknown", { event_type: "shot", timestamp_ms: 1000 }),
    row("ready", { event_type: "shot", timestamp_ms: 2000 }),
    row("legacy", { event_type: "goal" }),
    row("other", { analysis_session_id: "other" }),
  ];
  const shots = [
    row("u", { event_id: "unknown", result: "unknown", review_required: true }),
    row("r", { event_id: "ready", result: "save", review_required: false }),
  ];
  const legacy = [
    row("lu", { event_id: "unknown", resolved: false }),
    row("lr", { event_id: "ready", resolved: false }),
    row("foreign", {
      event_id: "legacy",
      organization_id: "other",
      resolved: false,
    }),
  ];
  const items = reviewQueue(scope, { events, shots, legacy });
  expect(items.map((item) => [item.event.id, item.status])).toEqual([
    ["unknown", "result"],
    ["ready", "ready"],
    ["legacy", "legacy"],
  ]);
  expect(items[2]!.legacy).toBeUndefined();
  expect(
    reviewQueue({ ...scope, sessionId: "" }, { events, shots, legacy }),
  ).toEqual([]);
});
it("keeps duplicate attempts ambiguous and verification distinct from unknown results", () => {
  const events = [row("a"), row("b")];
  const shots = [
    row("one", { event_id: "a", result: "goal" }),
    row("two", { event_id: "a", result: "save" }),
    row("verify", { event_id: "b", result: "goal", review_required: true }),
  ];
  expect(
    reviewQueue(scope, { events, shots, legacy: [] }).map(
      (item) => item.status,
    ),
  ).toEqual(["ambiguous", "verification"]);
});
it("opens exact evidence/correction and prevents closing unresolved legacy review", () => {
  const event = row("event", { event_type: "shot", timestamp_ms: 1000 });
  const legacy = row("review", {
    event_id: event.id,
    reason: "Manual comparison needed",
    resolved: false,
  });
  const onEvidence = vi.fn(),
    onCorrect = vi.fn(),
    onResolve = vi.fn();
  const props = {
    scope,
    events: [event],
    legacy: [legacy],
    isCanEdit: true,
    isCanResolve: true,
    onEvidence,
    onCorrect,
    onResolve,
  };
  const { rerender } = render(<ReviewQueue {...props} shots={[]} />);
  expect(
    (
      screen.getByRole("button", {
        name: "Close legacy review",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Evidence" }));
  fireEvent.click(screen.getByRole("button", { name: "Correct attempt" }));
  expect(onEvidence).toHaveBeenCalledWith(event);
  expect(onCorrect.mock.calls[0]![0].event).toBe(event);
  rerender(
    <ReviewQueue
      {...props}
      shots={[row("shot", { event_id: event.id, result: "goal" })]}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Close legacy review" }));
  expect(onResolve).toHaveBeenCalledWith(legacy);
  rerender(
    <ReviewQueue
      {...props}
      isCanEdit={false}
      isCanResolve={false}
      shots={[]}
    />,
  );
  expect(
    (
      screen.getByRole("button", {
        name: "Correct attempt",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  expect(
    (screen.getByRole("button", { name: "Evidence" }) as HTMLButtonElement)
      .disabled,
  ).toBe(false);
});
