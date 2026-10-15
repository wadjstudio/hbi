import { describe, expect, it } from "vitest";
import {
  historicalIntelligence,
  evidenceSource,
} from "@/features/analysis/intelligence-scope";
import type { Row } from "@/types/workspace";
const row = (id: string, data: Record<string, unknown> = {}) =>
  ({ id, organization_id: "org", ...data }) as Row;
const matches = Array.from({ length: 12 }, (_, i) =>
  row(`m${i}`, {
    home_team_id: "home",
    away_team_id: "away",
    starts_at: `2025-01-${String(20 - i).padStart(2, "0")}`,
  }),
);
const sessions = matches.map((match, i) =>
  row(`s${i}`, { match_id: match.id, is_primary: true, video_id: `v${i}` }),
);
const events = sessions.map((session, i) =>
  row(`e${i}`, {
    match_id: session.match_id,
    analysis_session_id: session.id,
    team_id: "away",
  }),
);
const shots = events.map((event, i) =>
  row(`sh${i}`, { event_id: event.id, result: "goal" }),
);
describe("historical intelligence and source identity", () => {
  it("selects 3/5/10 dated team matches through the anchor, never future or foreign rows", () => {
    const rows = {
      matches: [
        ...matches,
        row("future", {
          home_team_id: "home",
          away_team_id: "away",
          starts_at: "2026-01-01",
        }),
        row("undated", { home_team_id: "home", away_team_id: "away" }),
        row("foreign", {
          organization_id: "else",
          home_team_id: "home",
          away_team_id: "away",
          starts_at: "2025-01-20",
        }),
      ],
      sessions,
      events,
      shots,
      possessions: [],
    };
    for (const count of [3, 5, 10] as const) {
      const result = historicalIntelligence("org", "away", "m0", count, rows);
      expect(result.matches.map((m) => m.id)).toEqual(
        matches.slice(0, count).map((m) => m.id),
      );
      expect(result.events).toHaveLength(count);
    }
    expect(
      historicalIntelligence("org", "away", "m2", 3, rows).events.map(
        (e) => e.id,
      ),
    ).toEqual(["e2", "e3", "e4"]);
    expect(
      historicalIntelligence("org", "away", "undated", 3, rows).needsDate,
    ).toBe(true);
  });
  it("counts missing/ambiguous primaries and excludes duplicate and incompatible analysis", () => {
    const result = historicalIntelligence("org", "away", "m0", 5, {
      matches,
      sessions: [
        ...sessions.filter((s) => s.id !== "s1"),
        row("dup", { match_id: "m2", is_primary: true }),
        row("secondary", { match_id: "m0", is_primary: false }),
      ],
      events: [
        ...events,
        row("wrongMatch", {
          match_id: "m4",
          analysis_session_id: "s0",
          team_id: "away",
        }),
        row("wrongTeam", {
          match_id: "m0",
          analysis_session_id: "s0",
          team_id: "unrelated",
        }),
        row("otherOrg", {
          organization_id: "else",
          match_id: "m0",
          analysis_session_id: "s0",
          team_id: "away",
        }),
        row("secondaryEvent", {
          match_id: "m0",
          analysis_session_id: "secondary",
          team_id: "away",
        }),
      ],
      possessions: [
        row("p", {
          match_id: "m0",
          analysis_session_id: "s0",
          team_id: "home",
        }),
      ],
      shots: [
        ...shots,
        row("foreignShot", { organization_id: "else", event_id: "e0" }),
      ],
    });
    expect(result).toMatchObject({ sessions: 3, missing: 1, ambiguous: 1 });
    expect(result.events.map((e) => e.id)).toEqual(["e0", "e3", "e4"]);
    expect(result.shots.map((s) => s.id)).toEqual(["sh0", "sh3", "sh4"]);
    expect(result.possessions).toHaveLength(1);
  });
  it("resolves the event's own session/source and keeps missing media explicit", () => {
    const videos = [
      row("v0", { match_id: "m0" }),
      row("v1", { match_id: "m1" }),
    ];
    expect(
      evidenceSource("org", events[1]!, matches, sessions, videos)?.video?.id,
    ).toBe("v1");
    expect(
      evidenceSource("org", events[2]!, matches, sessions, videos),
    ).toMatchObject({ session: { id: "s2" }, video: undefined });
    expect(
      evidenceSource(
        "org",
        { ...events[0]!, match_id: "m1" },
        matches,
        sessions,
        videos,
      ),
    ).toBeNull();
    expect(
      evidenceSource(
        "org",
        { ...events[0]!, organization_id: "else" },
        matches,
        sessions,
        videos,
      ),
    ).toBeNull();
    expect(
      evidenceSource("org", events[0]!, matches, sessions, [
        row("v0", { match_id: "m1" }),
      ])?.video,
    ).toBeUndefined();
  });
});
