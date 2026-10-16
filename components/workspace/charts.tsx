"use client";
import { useWorkspace } from "./provider";
import { s, type Row } from "@/types/workspace";
import { brand } from "@/lib/brand";
import { SpatialMap } from "./spatial-map";
export { Court } from "./court";
export const ShotMap = ({
  shots,
  onSelect,
  onGroup,
}: {
  shots: Row[];
  onSelect: (shot: Row) => void;
  onGroup?: (shots: Row[]) => void;
}) => {
  const w = useWorkspace();
  return (
    <SpatialMap
      rows={shots}
      xField="court_x"
      yField="court_y"
      label={w.t("مواقع التصويب", "Shot locations")}
      groupLabel={w.t("عينة قطاع التصويب", "Shot location group")}
      onSelect={onSelect}
      onGroup={onGroup}
      pointLabel={(row) =>
        `${w.t("دليل تصويبة", "Shot evidence")}: ${s(row.result)}`
      }
      pointColor={(row) =>
        row.result === "goal"
          ? brand.colors.goal
          : row.result === "save"
            ? brand.colors.save
            : row.result === "unknown" || row.review_required
              ? "#91a7bb"
              : brand.colors.attack
      }
    />
  );
};
