"use client";
import { useWorkspace } from "./provider";
import { Panel, rowLabel } from "./controls";
import { ShotMap } from "./charts";
import { shotSummary, keeperSummary, percent } from "@/lib/analytics/metrics";
import type { Row } from "@/types/workspace";

type Point = { x: number; y: number };

// Placement points stay with the workspace: the next recorded shot uses them.
export function ShotDetailPanel({
  events,
  filtered,
  shots,
  keepers,
  goalPoint,
  onGoalPoint,
  court,
  onCourt,
  onEvidence,
  onEdit,
  onKeeper,
}: {
  events: Row[];
  filtered: Row[];
  shots: Row[];
  keepers: Row[];
  goalPoint: Point | null;
  onGoalPoint: (point: Point) => void;
  court: Point | null;
  onCourt: (point: Point) => void;
  onEvidence: (title: string, rows: Row[]) => void;
  onEdit: (event: Row) => void;
  onKeeper: () => void;
}) {
  const w = useWorkspace();
  const summary = shotSummary(shots);
  return (
    <details className="shot-detail-panel">
      <summary>
        {w.t(
          "كفاءة التصويب · التفاصيل وتحديد الموقع",
          "Shot efficiency · breakdown & location editor",
        )}{" "}
        · {percent(summary.efficiency)} · n={summary.sample}
      </summary>
      <Panel
        title={`${w.t("كفاءة التصويب", "Shot efficiency")} ${percent(summary.efficiency)} · n=${summary.sample}`}
      >
        <ShotMap
          onGroup={(rows) =>
            onEvidence(
              w.t("عينة قطاع التصويب", "Shot location group"),
              events.filter((e) => rows.some((sh) => sh.event_id === e.id)),
            )
          }
          shots={shots.filter((shot) =>
            filtered.some((event) => event.id === shot.event_id),
          )}
          onSelect={(sh) => {
            const e = events.find((e) => e.id === sh.event_id);
            if (e) onEdit(e);
          }}
        />
        <label>{w.t("موضع التصويب التالي", "Next shot location")}</label>
        <div
          className="goal-picker"
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            onGoalPoint({
              x: (e.clientX - r.left) / r.width,
              y: 1 - (e.clientY - r.top) / r.height,
            });
          }}
        >
          {w.t("اضغط موضع الكرة في المرمى", "Click shot placement in goal")}{" "}
          {goalPoint
            ? `${goalPoint.x.toFixed(2)}, ${goalPoint.y.toFixed(2)}`
            : ""}
        </div>
        <div
          className="location-picker"
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            onCourt({
              x: (e.clientX - r.left) / r.width,
              y: (e.clientY - r.top) / r.height,
            });
          }}
        >
          {court
            ? `${court.x.toFixed(2)}, ${court.y.toFixed(2)}`
            : w.t("اضغط لتحديد الإحداثيات", "Click to place coordinates")}
        </div>
        {keepers.map((k) => {
          const stats = keeperSummary(shots, k.id);
          return (
            <button key={k.id} onClick={onKeeper}>
              {rowLabel(k)} · {percent(stats.percentage)} · n={stats.sample}
            </button>
          );
        })}
      </Panel>
    </details>
  );
}
