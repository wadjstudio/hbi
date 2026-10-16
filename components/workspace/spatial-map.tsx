"use client";
import { useId, useState, type ComponentProps } from "react";
import {
  spatialSample,
  type SpatialBin,
} from "@/features/analysis/spatial-sample";
import type { Row } from "@/types/workspace";
import { percent } from "@/lib/analytics/metrics";
import { useWorkspace } from "./provider";
import { Court } from "./court";
type Props = Omit<ComponentProps<"div">, "onSelect"> & {
  rows: Row[];
  xField: string;
  yField: string;
  label: string;
  groupLabel: string;
  onSelect: (row: Row) => void;
  onGroup?: (rows: Row[]) => void;
  pointLabel: (row: Row) => string;
  pointColor: (row: Row) => string;
  pointClassName?: string;
  sectorShares?: boolean;
};
export const SpatialMap = ({
  rows,
  xField,
  yField,
  label,
  groupLabel,
  onSelect,
  onGroup,
  pointLabel,
  pointColor,
  pointClassName,
  sectorShares = false,
  className,
  ...props
}: Props) => {
  const w = useWorkspace();
  const [mode, setMode] = useState<"density" | "points">(
    onGroup ? "density" : "points",
  );
  const id = useId();
  const sample = spatialSample(rows, xField, yField);
  const binLabel = (bin: SpatialBin) =>
    `${groupLabel} · ${w.t("قطاع", "Sector")} ${bin.column + 1} ${bin.band === 0 ? w.t("أعلى", "top") : w.t("أسفل", "bottom")} · ${bin.points.length} ${w.t("ملاحظة", "observations")} · ${percent(bin.share)}`;
  const selectBin = (bin: SpatialBin) =>
    onGroup?.(bin.points.map((p) => p.row));
  const shares = (band: number) =>
    sectorShares &&
    mode === "density" && (
      <div
        className="spatial-sector-shares"
        aria-label={
          band === 0
            ? w.t("قطاعات النصف الأعلى", "Top sector shares")
            : w.t("قطاعات النصف الأسفل", "Bottom sector shares")
        }
      >
        {Array.from({ length: 5 }, (_, column) => {
          const bin = sample.bins.find(
            (b) => b.band === band && b.column === column,
          );
          return (
            <button
              key={column}
              disabled={!bin || !onGroup}
              aria-label={
                bin
                  ? binLabel(bin)
                  : `${w.t("قطاع بلا مواقع", "Sector without locations")} ${column + 1}`
              }
              onClick={() => {
                if (bin) selectBin(bin);
              }}
            >
              {percent(sample.points.length ? (bin?.share ?? 0) : null)}
            </button>
          );
        })}
      </div>
    );
  return (
    <div
      {...props}
      data-slot="spatial-map"
      className={`spatial-map ${className ?? ""}`}
      role="group"
      aria-label={label}
    >
      {shares(0)}
      <Court>
        <defs>
          <radialGradient id={`${id}-heat`}>
            <stop offset="0" stopColor="#ffb84c" stopOpacity=".85" />
            <stop offset=".26" stopColor="#d4f04d" stopOpacity=".65" />
            <stop offset=".6" stopColor="#00cfc9" stopOpacity=".38" />
            <stop offset="1" stopColor="#00cfc9" stopOpacity="0" />
          </radialGradient>
          <clipPath id={`${id}-clip`}>
            <rect width="1000" height="500" />
          </clipPath>
        </defs>
        {mode === "density" ? (
          <g clipPath={`url(#${id}-clip)`}>
            <g aria-hidden="true" pointerEvents="none">
              {sample.points.map((p) => (
                <circle
                  key={p.row.id}
                  cx={p.x * 1000}
                  cy={p.y * 500}
                  r="88"
                  fill={`url(#${id}-heat)`}
                />
              ))}
            </g>
            {sample.bins.map((bin) => (
              <rect
                key={bin.key}
                data-sector={bin.key}
                x={bin.column * 200}
                y={bin.band * 250}
                width="200"
                height="250"
                className="density-sector"
                role="button"
                tabIndex={0}
                aria-label={binLabel(bin)}
                onClick={() => selectBin(bin)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    selectBin(bin);
                  }
                }}
              >
                <title>{binLabel(bin)}</title>
              </rect>
            ))}
          </g>
        ) : (
          sample.points.map((p) => (
            <circle
              key={p.row.id}
              cx={p.x * 1000}
              cy={p.y * 500}
              r={pointClassName === "turnover-point" ? 20 : 13}
              fill={pointColor(p.row)}
              className={pointClassName ?? "shot-location-point"}
              role="button"
              aria-label={pointLabel(p.row)}
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(p.row);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(p.row);
                }
              }}
            >
              <title>{pointLabel(p.row)}</title>
            </circle>
          ))
        )}
      </Court>
      {shares(1)}
      <details className="spatial-map-options">
        <summary>
          {mode === "density" ? w.t("كثافة", "Density") : w.t("نقاط", "Points")}{" "}
          · {sample.points.length}/{rows.length} {w.t("بموقع", "located")} ·{" "}
          {sample.missing.length} {w.t("ناقص", "missing")}
        </summary>
        <div className="spatial-map-method">
          <div className="spatial-map-modes">
            <button
              disabled={!onGroup}
              aria-pressed={mode === "density"}
              onClick={() => setMode("density")}
            >
              {w.t("كثافة", "Density")}
            </button>
            <button
              aria-pressed={mode === "points"}
              onClick={() => setMode("points")}
            >
              {w.t("نقاط", "Points")}
            </button>
          </div>
          <small>
            {w.t(
              "التوهج حول المواقع المسجلة للعرض فقط. القطاعات 5×2 ثابتة؛ النسب من المواقع المعروفة فقط، وتشمل النتائج غير المحسومة. لا نستنتج اتجاه الهجوم أو حركة الكرة أو المواقع الناقصة.",
              "Glow surrounds recorded locations for display only. Fixed 5×2 sectors; percentages use located observations, including unresolved results. No inferred attack direction, ball movement or missing locations.",
            )}
          </small>
          {sample.bins.map((bin) => (
            <button
              key={bin.key}
              disabled={!onGroup}
              onClick={() => selectBin(bin)}
            >
              {binLabel(bin)}
            </button>
          ))}
          {!sample.points.length && (
            <small>
              {w.t(
                "لا توجد مواقع مسجلة في العينة.",
                "No recorded locations in this sample.",
              )}
            </small>
          )}
        </div>
      </details>
    </div>
  );
};
