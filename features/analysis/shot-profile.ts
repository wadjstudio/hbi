import { s, type Row } from "@/types/workspace";
const zones = [
  { key: "lw", ar: "الجناح الأيسر", en: "Left wing", zones: ["lw"] },
  { key: "rw", ar: "الجناح الأيمن", en: "Right wing", zones: ["rw"] },
  {
    key: "9m",
    ar: "9 أمتار",
    en: "9 metres",
    zones: ["nine_meter_left", "nine_meter_center", "nine_meter_right"],
  },
  {
    key: "pivot",
    ar: "الدائرة",
    en: "Pivot",
    zones: ["pivot_left", "pivot_center", "pivot_right"],
  },
  { key: "7m", ar: "7 أمتار", en: "7 metres", zones: ["seven_meter"] },
] as const;
export function shotProfile(shots: Row[]) {
  const reviewed = shots.filter(
    (shot) =>
      !shot.review_required &&
      ["goal", "save", "miss", "blocked"].includes(s(shot.result)),
  );
  const groups = zones.map((zone) => ({
    ...zone,
    shots: reviewed.filter((shot) =>
      (zone.zones as readonly string[]).includes(s(shot.zone)),
    ),
  }));
  const known = new Set(
    groups.flatMap((group) => group.shots.map((shot) => shot.id)),
  );
  return {
    sample: reviewed.length,
    pending: shots.length - reviewed.length,
    missing: reviewed.filter((shot) => !known.has(shot.id)),
    groups,
  };
}
