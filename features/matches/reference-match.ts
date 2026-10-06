import { canWrite } from "@/lib/permissions/roles";
import { s, type Row, type Table } from "@/types/workspace";

// Published metadata only. No fabricated roster, shots, possessions, clock segments or insights.
export const referenceMatch = {
  key: "ahly-zamalek-cup-winners-2025-05-23",
  date: "2025-05-23",
  home: {
    ar: "الأهلي",
    en: "Al Ahly",
    aliases: ["الأهلي", "الاهلي", "Al Ahly", "Al Ahly SC"],
  },
  away: {
    ar: "الزمالك",
    en: "Zamalek",
    aliases: ["الزمالك", "Zamalek", "Zamalek SC"],
  },
  competitionAr: "نهائي كأس الكؤوس الإفريقية 2025",
  competitionEn: "African Cup Winners' Cup final 2025",
  venueAr: "صالة عبد الله الفيصل، الجزيرة",
  homeScore: 31,
  awayScore: 28,
  youtubeId: "q-_grNLweEE",
  broadcastUrl: "https://www.youtube.com/watch?v=q-_grNLweEE",
  reportUrl:
    "https://www.alahlyegypt.com/en/news/article/kas-alkoos-alafryky-llyd-alahly-ytog-ballkb-baad-alfoz-aal-alzmalk",
  // Reviewed broadcast position: actual play. Not a period/clock calibration.
  previewStartSeconds: 5604,
} as const;
export const referenceMarker = `HBI_REFERENCE:${referenceMatch.key}`;
export function isReferenceMatch(match: Row) {
  return s(match.notes).split("\n").includes(referenceMarker);
}
export function matchingReferenceTeam(teams: Row[], side: "home" | "away") {
  const aliases = referenceMatch[side].aliases.map((name) =>
    name.toLocaleLowerCase().trim(),
  );
  return teams.find((team) =>
    aliases.includes(s(team.name).toLocaleLowerCase().trim()),
  );
}
async function referenceId(org: string, key: string) {
  const digest = new Uint8Array(
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(`hbi-reference:${org}:${key}`),
    ),
  ).slice(0, 16);
  digest[6] = (digest[6]! & 15) | 128; // SHA-256 always supplies these bytes; organization-scoped UUID v8.
  digest[8] = (digest[8]! & 63) | 128;
  const hex = Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
export async function importReferenceMatch(input: {
  org: string;
  role: string;
  teams: Row[];
  matches: Row[];
  save: (table: Table, row: Partial<Row>) => Promise<Row>;
}) {
  const existing = input.matches.find(isReferenceMatch);
  if (existing) return existing;
  if (!canWrite(input.role, "matches"))
    throw new Error("Your role cannot create a match");
  const home = matchingReferenceTeam(input.teams, "home");
  const away = matchingReferenceTeam(input.teams, "away");
  // Check every permission before starting, so analysts do not get a partial import.
  if ((!home || !away) && !canWrite(input.role, "teams"))
    throw new Error("A coach must create Al Ahly and Zamalek teams first");
  const resolve = async (side: "home" | "away", found: Row | undefined) =>
    found ??
    input.save("teams", {
      id: await referenceId(input.org, side),
      name: referenceMatch[side].ar,
      short_name: referenceMatch[side].en,
      is_own_team: false,
    });
  const homeTeam = await resolve("home", home);
  const awayTeam = await resolve("away", away);
  return input.save("matches", {
    id: await referenceId(input.org, referenceMatch.key),
    home_team_id: homeTeam.id,
    away_team_id: awayTeam.id,
    home_score: referenceMatch.homeScore,
    away_score: referenceMatch.awayScore,
    venue: referenceMatch.venueAr,
    status: "ready",
    // Kick-off time is not verified. Preserve the known calendar date in provenance, not a invented timestamp.
    notes: [
      referenceMarker,
      `${referenceMatch.competitionAr} · ${referenceMatch.date}`,
      `Result source: ${referenceMatch.reportUrl}`,
      `Broadcast: ${referenceMatch.broadcastUrl}`,
      "Published final score only; event-level analysis and lineups have not been imported.",
    ].join("\n"),
  });
}
