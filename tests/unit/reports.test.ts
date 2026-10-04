import { describe, expect, it } from "vitest";
import Papa from "papaparse";
import { shotsCsv } from "../../features/reports/export";
import type { Row } from "../../types/workspace";

const event: Row = {
  id: "event",
  organization_id: "org",
  match_id: "match",
  analysis_session_id: "primary",
  timestamp_ms: 62000,
  period: 2,
  match_clock_ms: null,
  actor_position: "RW",
  team_id: "team",
};
const shot: Row = {
  id: "shot",
  organization_id: "org",
  event_id: event.id,
  result: "goal",
  empty_goal: false,
  review_required: false,
  zone: 'جناح، "يمين"\nخط ثانٍ',
  goalkeeper_id: null,
};
describe("auditable CSV report", () => {
  it("roundtrips Arabic, quotes and newlines and separates video from missing match time", () => {
    const csv = shotsCsv([shot], [event]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    const parsed = Papa.parse<Record<string, string>>(csv, { header: true });
    expect(parsed.errors).toEqual([]);
    expect(parsed.data[0]).toMatchObject({
      id: shot.id,
      event_id: event.id,
      zone: shot.zone,
      video_ms: "62000",
      period: "2",
      match_clock_ms: "",
      analysis_session_id: "primary",
      empty_goal: "false",
      goalkeeper_id: "",
    });
  });
  it("prevents user supplied spreadsheet formulas and exports a header for an empty sample", () => {
    const csv = shotsCsv(
      [{ ...shot, zone: ' \t=HYPERLINK("https://example.test")' }],
      [event],
    );
    const parsed = Papa.parse<Record<string, string>>(csv, { header: true });
    expect(parsed.data[0]!.zone).toBe(
      '\' \t=HYPERLINK("https://example.test")',
    );
    expect(Papa.parse(shotsCsv([], []), { header: true }).data).toEqual([]);
  });
});
