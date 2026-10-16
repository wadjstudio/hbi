import { expect, it } from "vitest";
import { meetingItem } from "@/features/presentations/item";
import type { Row } from "@/types/workspace";
const row = (id: string, data: Partial<Row> = {}): Row => ({
  id,
  organization_id: "org",
  ...data,
});
const clip = row("clip", { title: "Evidence clip" });
const sources = {
  clips: [clip],
  tactics: [row("board")],
  insights: [row("insight")],
};
it("resolves each typed presentation reference only within the organization", () => {
  expect(meetingItem("org", row("item", { clip_id: "clip" }), sources)).toEqual(
    { kind: "clip", target: clip },
  );
  expect(
    meetingItem("org", row("item", { tactic_id: "board" }), sources).kind,
  ).toBe("tactic");
  expect(
    meetingItem("org", row("item", { insight_id: "insight" }), sources).kind,
  ).toBe("insight");
  expect(
    meetingItem("org", row("item", { body: "Team message" }), sources).kind,
  ).toBe("text");
  expect(
    meetingItem("other", row("item", { clip_id: "clip" }), sources).kind,
  ).toBe("missing");
  expect(
    meetingItem("org", row("item", { clip_id: "clip" }), {
      ...sources,
      clips: [{ ...clip, organization_id: "other" }],
    }).kind,
  ).toBe("missing");
});
it("preserves unavailable and mixed content as explicit missing states instead of asserting a target", () => {
  for (const item of [
    undefined,
    row("empty"),
    row("lost", { clip_id: "gone" }),
    row("mixed", { clip_id: "clip", body: "Unexpected text" }),
    row("two", { clip_id: "clip", insight_id: "insight" }),
  ])
    expect(meetingItem("org", item, sources).kind).toBe("missing");
});
