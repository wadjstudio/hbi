import { z } from "zod";
import type { Database } from "@/lib/supabase/database.types";
export type ShotAttempt = Database["public"]["Tables"]["shot_attempts"]["Row"];
export type ClockSegment =
  Database["public"]["Tables"]["video_clock_segments"]["Row"];
export type CourtInterval =
  Database["public"]["Tables"]["on_court_intervals"]["Row"];
const uuid = z.uuid(),
  ms = z.number().int().nonnegative(),
  coordinate = z.number().min(0).max(1);
export const syncResponse = z
  .object({
    status: z.enum(["applied", "conflict"]).default("applied"),
    row: z.record(z.string(), z.json()).optional(),
    server: z.record(z.string(), z.json()).nullable().optional(),
  })
  .passthrough();
export const shotInput = z
  .object({
    event_id: uuid,
    shooter_id: uuid.nullable().optional(),
    goalkeeper_id: uuid.nullable().optional(),
    result: z.enum(["goal", "save", "miss", "blocked", "unknown"]),
    empty_goal: z.boolean(),
    distance_m: z.number().min(0).max(40).nullable().optional(),
    court_x: coordinate.nullable().optional(),
    court_y: coordinate.nullable().optional(),
    goal_x: coordinate.nullable().optional(),
    goal_y: coordinate.nullable().optional(),
    review_required: z.boolean().optional(),
  })
  .passthrough()
  .superRefine((shot, ctx) => {
    if (shot.empty_goal && shot.goalkeeper_id)
      ctx.addIssue({
        code: "custom",
        message: "Empty goal cannot have goalkeeper",
      });
    if (shot.empty_goal && shot.result === "save")
      ctx.addIssue({
        code: "custom",
        message: "Empty goal cannot produce a goalkeeper save",
      });
  });
export const clockInput = z
  .object({
    analysis_session_id: uuid,
    period: z.number().int().min(1).max(4),
    video_start_ms: ms,
    video_end_ms: ms,
    clock_start_ms: ms,
    running: z.boolean(),
  })
  .passthrough()
  .refine(
    (row) => row.video_end_ms > row.video_start_ms,
    "Clock segment must have positive duration",
  );
export const intervalInput = z
  .object({
    analysis_session_id: uuid,
    match_id: uuid,
    team_id: uuid,
    player_id: uuid,
    position: z.enum(["GK", "LW", "LB", "CB", "RB", "RW", "P"]),
    period: z.number().int().min(1).max(4),
    start_clock_ms: ms,
    end_clock_ms: ms.nullable().optional(),
    verified: z.boolean().optional(),
  })
  .passthrough()
  .refine(
    (row) => row.end_clock_ms == null || row.end_clock_ms > row.start_clock_ms,
    "Interval must have positive duration",
  );
export const substitutionInput = z
  .object({
    id: uuid,
    organization_id: uuid,
    analysis_session_id: uuid,
    match_id: uuid,
    team_id: uuid,
    out_player_id: uuid.nullable(),
    in_player_id: uuid.nullable(),
    position: z.enum(["GK", "LW", "LB", "CB", "RB", "RW", "P"]),
    period: z.number().int().min(1).max(4),
    clock_ms: ms,
    video_ms: ms.nullable().optional(),
  })
  .passthrough()
  .refine(
    (row) =>
      (row.out_player_id || row.in_player_id) &&
      row.out_player_id !== row.in_player_id,
    "Choose different incoming and outgoing players",
  );
