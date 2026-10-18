import { s, type Row } from "@/types/workspace";

const zones = [
  { key: "lw", ar: "الجناح الأيسر", en: "Left wing", codes: ["lw"] },
  { key: "9l", ar: "9م يسار", en: "Left 9m", codes: ["nine_meter_left"] },
  { key: "9c", ar: "9م وسط", en: "Centre 9m", codes: ["nine_meter_center"] },
  { key: "9r", ar: "9م يمين", en: "Right 9m", codes: ["nine_meter_right"] },
  { key: "rw", ar: "الجناح الأيمن", en: "Right wing", codes: ["rw"] },
  {
    key: "pivot",
    ar: "الدائرة",
    en: "Pivot",
    codes: ["pivot_left", "pivot_center", "pivot_right"],
  },
  { key: "7m", ar: "7م", en: "7m", codes: ["seven_meter"] },
] as const;
const broader = new Set([
  "left_half",
  "center",
  "right_half",
  "backcourt_left",
  "backcourt_center",
  "backcourt_right",
]);

/** Explicit recorded zones; independent of coordinates and shot outcome review. */
export const shotZoneSample = (shots: Row[]) => {
  const groups = zones.map((zone) => ({
    ...zone,
    shots: shots.filter((shot) =>
      (zone.codes as readonly string[]).includes(s(shot.zone)),
    ),
  }));
  const other = shots.filter((shot) => broader.has(s(shot.zone)));
  const mapped = new Set<string>(groups.flatMap((group) => [...group.codes]));
  const missing = shots.filter(
    (shot) => !mapped.has(s(shot.zone)) && !broader.has(s(shot.zone)),
  );
  return {
    groups,
    other,
    missing,
    sample: shots.length,
    coded: shots.length - missing.length,
  };
};
