import { percent } from "@/lib/analytics/metrics";

export const EfficiencyRing = ({
  value,
  isLarge = false,
  caption,
}: {
  value: number | null;
  isLarge?: boolean;
  caption?: string;
}) => {
  const valid =
    value != null && Number.isFinite(value) && value >= 0 && value <= 1
      ? value
      : null;
  return (
    <span
      className={`efficiency-ring${isLarge ? " efficiency-ring-large" : ""}`}
      data-slot="efficiency-ring"
      data-state={valid == null ? "unknown" : "known"}
      aria-hidden="true"
      dir="ltr"
    >
      <svg viewBox="0 0 40 40" focusable="false">
        <circle className="efficiency-track" cx="20" cy="20" r="17" />
        {valid != null && (
          <circle
            className="efficiency-progress"
            cx="20"
            cy="20"
            r="17"
            pathLength="100"
            strokeDasharray={`${valid * 100} 100`}
            transform="rotate(-90 20 20)"
          />
        )}
      </svg>
      <span className="efficiency-reading">
        <b>{percent(valid)}</b>
        {caption && <small>{caption}</small>}
      </span>
    </span>
  );
};
