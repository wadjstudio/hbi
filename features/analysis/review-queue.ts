import { sessionSample, type SessionScope } from "./session-statistics";
import { s, type Row } from "@/types/workspace";

export type ReviewItem = {
  event: Row;
  shot?: Row;
  legacy?: Row;
  status: "result" | "verification" | "legacy" | "ready" | "ambiguous";
};
export const reviewQueue = (
  scope: SessionScope,
  input: { events: Row[]; shots: Row[]; legacy: Row[] },
): ReviewItem[] => {
  const sample = sessionSample(scope, {
    ...input,
    possessions: [],
    intervals: [],
  });
  const rows: ReviewItem[] = [];
  for (const event of sample.events) {
    const shots = sample.shots.filter((row) => row.event_id === event.id);
    const shot = shots[0];
    const legacy = input.legacy.find(
      (row) =>
        row.organization_id === scope.organizationId &&
        row.event_id === event.id &&
        !row.resolved,
    );
    let status: ReviewItem["status"] | undefined;
    if (shots.length > 1) status = "ambiguous";
    else if (
      shot &&
      !["goal", "save", "miss", "blocked"].includes(s(shot.result))
    )
      status = "result";
    else if (shot?.review_required) status = "verification";
    else if (legacy) status = shot ? "ready" : "legacy";
    else if (
      !shot &&
      [
        "shot",
        "goal",
        "save",
        "miss",
        "blocked_shot",
        "seven_meter_shot",
      ].includes(s(event.event_type))
    )
      status = "legacy";
    if (status) rows.push({ event, shot, legacy, status });
  }
  const time = (value: unknown) =>
    typeof value === "number" && Number.isFinite(value) && value >= 0
      ? value
      : Infinity;
  return rows.sort(
    (a, b) =>
      time(a.event.timestamp_ms) - time(b.event.timestamp_ms) ||
      a.event.id.localeCompare(b.event.id),
  );
};
