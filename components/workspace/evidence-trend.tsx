"use client";
import type { ComponentProps } from "react";
import type { EvidenceTrendPoint } from "@/features/analysis/match-dashboard";
import { percent } from "@/lib/analytics/metrics";

type EvidenceTrendProps = Omit<ComponentProps<"svg">, "points"> & {
  points: EvidenceTrendPoint[];
  label: string;
  onEvidence: (point: EvidenceTrendPoint) => void;
};

export const EvidenceTrend = ({
  points,
  label,
  onEvidence,
  ...props
}: EvidenceTrendProps) => {
  // Display actual cumulative readings, never an invented baseline or interpolated observations.
  const readings = points;
  if (!readings.length) return null;
  const total = points.at(-1)!.sample;
  const x = (point: EvidenceTrendPoint) =>
    total === 1 ? 160 : 12 + (296 * (point.sample - 1)) / (total - 1);
  const y = (value: number) => 46 - 34 * value;
  return (
    <svg
      {...props}
      className={`evidence-trend ${props.className ?? ""}`}
      data-slot="evidence-trend"
      viewBox="0 0 320 58"
      role="group"
      aria-label={label}
      direction="ltr"
    >
      <title>{label}</title>
      <path d="M12 12H308 M12 46H308" className="trend-guide" />
      {readings.length > 1 && (
        <polyline
          points={readings
            .map((point) => `${x(point)},${y(point.value)}`)
            .join(" ")}
          className="trend-line"
        />
      )}
      {readings.map((point) => (
        <g key={point.sample}>
          <circle
            cx={x(point)}
            cy={y(point.value)}
            r="11"
            className="trend-target"
            role="button"
            tabIndex={0}
            aria-label={`${label} · n=${point.sample} · ${percent(point.value)}`}
            onClick={() => onEvidence(point)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onEvidence(point);
              }
            }}
          >
            <title>{`n=${point.sample} · ${percent(point.value)}`}</title>
          </circle>
          <circle
            cx={x(point)}
            cy={y(point.value)}
            r="2.5"
            className="trend-dot"
            pointerEvents="none"
          />
        </g>
      ))}
    </svg>
  );
};
