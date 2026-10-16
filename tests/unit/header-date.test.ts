import { expect, it } from "vitest";
import { headerDate } from "@/features/workspace/header-date";
it("formats a validated saved instant in an explicit stable zone", () => {
  expect(headerDate("2025-01-24T12:00:00Z", "en")).toEqual({
    iso: "2025-01-24T12:00:00Z",
    label: "24 Jan 2025",
  });
  expect(headerDate("2025-01-01T01:30:00+02:00", "en")?.label).toBe(
    "31 Dec 2024",
  );
  expect(headerDate("2025-01-24T12:00:00+00:00", "ar")?.label).toBeTruthy();
});
it("does not invent dates from absent, malformed or date-only values", () => {
  for (const value of [
    null,
    undefined,
    0,
    "",
    "2025-01-24",
    "not a date",
    "2025-02-31T12:00:00Z",
  ])
    expect(headerDate(value, "en")).toBeNull();
});
