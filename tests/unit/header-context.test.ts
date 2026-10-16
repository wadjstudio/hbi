import { expect, it } from "vitest";
import {
  accountIdentity,
  analysisPath,
  relatedPresentations,
} from "@/features/workspace/header-context";
import type { Row } from "@/types/workspace";
const row = (id: string, props: Partial<Row> = {}): Row => ({
  id,
  organization_id: "org",
  ...props,
});
it("uses actual account text without inferring a coach role or loading a remote portrait", () => {
  expect(
    accountIdentity({
      email: "coach@example.test",
      user_metadata: {
        full_name: "  أحمد علي  ",
        avatar_url: "https://example.test/avatar",
      },
    }),
  ).toEqual({ name: "أحمد علي", email: "coach@example.test", initials: "أع" });
  expect(
    accountIdentity({
      email: "coach@example.test",
      user_metadata: { full_name: { role: "owner" }, name: 5 },
    }),
  ).toEqual({ name: "coach", email: "coach@example.test", initials: "C" });
  expect(accountIdentity(null)).toEqual({ name: "", email: "", initials: "" });
});
it("builds encoded session/time links and excludes unsafe time values", () => {
  expect(analysisPath("match", "session", 12000)).toBe(
    "/matches/match?session=session&at=12000",
  );
  expect(analysisPath("a/b", "", NaN)).toBe("/matches/a%2Fb");
  expect(analysisPath("m", "s", -1)).toBe("/matches/m?session=s");
  expect(analysisPath("m", "s", Infinity)).toBe("/matches/m?session=s");
});
it("finds relevant presentations through scoped clip/event evidence instead of titles", () => {
  const presentations = [
    row("clip"),
    row("insight"),
    row("unrelated", { title: "match" }),
    row("foreign", { organization_id: "other" }),
  ];
  expect(
    relatedPresentations("org", "match", {
      presentations,
      clips: [
        row("c", { match_id: "match" }),
        row("cOther", { organization_id: "other", match_id: "match" }),
      ],
      events: [
        row("e", { match_id: "match" }),
        row("eOther", { organization_id: "other", match_id: "match" }),
      ],
      evidence: [
        row("l", { event_id: "e", insight_id: "i" }),
        row("bad", { event_id: "eOther", insight_id: "other" }),
      ],
      items: [
        row("1", { presentation_id: "clip", clip_id: "c" }),
        row("2", { presentation_id: "insight", insight_id: "i" }),
        row("3", { presentation_id: "unrelated", clip_id: "cOther" }),
        row("4", { presentation_id: "unrelated", insight_id: "other" }),
        row("5", {
          organization_id: "other",
          presentation_id: "unrelated",
          clip_id: "c",
        }),
      ],
    }).map((p) => p.id),
  ).toEqual(["clip", "insight"]);
});
