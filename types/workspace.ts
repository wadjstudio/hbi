import { z } from "zod";
import { videoInput } from "@/features/video/source";
import {
  shotInput,
  clockInput,
  intervalInput,
} from "@/features/analysis/contracts";
export const tables = [
  "team_players",
  "teams",
  "seasons",
  "competitions",
  "players",
  "matches",
  "videos",
  "analysis_sessions",
  "match_roster",
  "possessions",
  "events",
  "event_participants",
  "shot_attempts",
  "possession_tactics",
  "on_court_intervals",
  "substitutions",
  "tactic_documents",
  "tactic_frames",
  "tactic_objects",
  "tactic_frame_objects",
  "tactic_animations",
  "video_annotations",
  "evidence_links",
  "insights",
  "clips",
  "playlists",
  "playlist_items",
  "presentations",
  "presentation_items",
  "reports",
  "tagging_templates",
  "legacy_shot_reviews",
  "video_clock_segments",
  "tactical_terms",
] as const;
export type Table = (typeof tables)[number];
export type Value =
  string | number | boolean | null | Value[] | { [key: string]: Value };
export type Row = {
  id: string;
  organization_id: string;
  revision?: number;
  [key: string]: Value | undefined;
};
export type Rows = Partial<Record<Table, Row[]>>;
export const positions = ["GK", "LW", "LB", "CB", "RB", "RW", "P"] as const;
export const s = (v: unknown): string => (v == null ? "" : String(v));
export const n = (v: unknown): number => Number(v ?? 0);
export const rowSchema = z
  .object({
    id: z.uuid(),
    organization_id: z.uuid(),
    revision: z.number().int().nonnegative().optional(),
  })
  .catchall(z.json());
export const drawingSchema = z.object({
  id: z.uuid(),
  kind: z.enum(["player", "ball", "arrow", "path", "zone", "text"]),
  label: z.string().max(200),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  x2: z.number().min(0).max(1).optional(),
  y2: z.number().min(0).max(1).optional(),
});
export type Drawing = z.infer<typeof drawingSchema>;
export function validateRow(table: Table, input: Row): Row {
  const row = rowSchema.parse(input) as Row;
  if (["events", "possessions", "clips", "video_annotations"].includes(table)) {
    const start = n(row[table === "events" ? "timestamp_ms" : "start_ms"]);
    z.number().int().nonnegative().parse(start);
    if (row.end_ms != null && n(row.end_ms) < start)
      throw new Error("Invalid time range");
  }
  if (table === "video_annotations")
    z.array(drawingSchema).max(500).parse(row.objects);
  if (table === "shot_attempts") shotInput.parse(row);
  if (table === "videos") videoInput.parse(row);
  if (table === "video_clock_segments") clockInput.parse(row);
  if (table === "on_court_intervals") intervalInput.parse(row);
  return row;
}
export const backupSchema = z.object({
  format: z.literal("hbi-workspace-v1"),
  scope: z.string(),
  records: z.array(z.object({ table: z.enum(tables), row: rowSchema })),
  operations: z.array(
    z.object({
      id: z.uuid(),
      queuedAt: z.number(),
      table: z.enum(tables),
      row: rowSchema,
      expected: z.number().int().nonnegative(),
      remove: z.boolean(),
      rpc: z.enum(["record_substitution"]).optional(),
    }),
  ),
});
