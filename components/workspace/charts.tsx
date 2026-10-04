"use client";
import { useWorkspace } from "./provider";
import { n, s, type Row } from "@/types/workspace";
export function Court({
  children,
  onClick,
}: {
  children?: React.ReactNode;
  onClick?: (x: number, y: number) => void;
}) {
  return (
    <svg
      className="court"
      viewBox="0 0 1000 500"
      role="img"
      aria-label="Handball court"
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const scale = Math.min(r.width / 1000, r.height / 500);
        onClick?.(
          Math.max(
            0,
            Math.min(
              1,
              (e.clientX - r.left - (r.width - 1000 * scale) / 2) /
                (1000 * scale),
            ),
          ),
          Math.max(
            0,
            Math.min(
              1,
              (e.clientY - r.top - (r.height - 500 * scale) / 2) /
                (500 * scale),
            ),
          ),
        );
      }}
    >
      <rect
        x="4"
        y="4"
        width="992"
        height="492"
        rx="4"
        fill="#102a36"
        stroke="#7693a2"
      />
      <line x1="500" x2="500" y1="4" y2="496" stroke="#7693a2" />
      <path
        d="M4 85 A165 165 0 0 1 4 415 M996 85 A165 165 0 0 0 996 415"
        fill="none"
        stroke="#7693a2"
      />
      <path
        d="M4 35 A215 215 0 0 1 4 465 M996 35 A215 215 0 0 0 996 465"
        fill="none"
        stroke="#7693a2"
        strokeDasharray="10 10"
      />
      <rect x="0" y="215" width="12" height="70" fill="#ff6b35" />
      <rect x="988" y="215" width="12" height="70" fill="#ff6b35" />
      {children}
    </svg>
  );
}
export function ShotMap({
  shots,
  onSelect,
}: {
  shots: Row[];
  onSelect: (shot: Row) => void;
}) {
  const w = useWorkspace();
  const located = shots.filter((r) => r.court_x != null && r.court_y != null);
  return (
    <>
      <Court>
        {located.map((r) => (
          <circle
            key={r.id}
            cx={n(r.court_x) * 1000}
            cy={n(r.court_y) * 500}
            r="11"
            fill={
              r.result === "goal"
                ? "#b7f34a"
                : r.result === "save"
                  ? "#25d9f5"
                  : "#ff6b35"
            }
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(r);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSelect(r);
            }}
          >
            <title>{s(r.result)}</title>
          </circle>
        ))}
      </Court>
      <small>
        {located.length}/{shots.length}{" "}
        {w.t(
          "تصويبة لها إحداثيات · اضغط لعرض الدليل",
          "shots with coordinates · select for evidence",
        )}
      </small>
    </>
  );
}
