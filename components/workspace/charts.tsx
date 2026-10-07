"use client";
import { useWorkspace } from "./provider";
import { n, s, type Row } from "@/types/workspace";
import { brand } from "@/lib/brand";
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
      role="group"
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
      {/* Kit SVG inner court is 400×200; map its -12,-4 margin at scale 2.5. */}
      <image href={brand.court} x="-30" y="-10" width="1060" height="520" />
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
                ? brand.colors.goal
                : r.result === "save"
                  ? brand.colors.save
                  : brand.colors.attack
            }
            role="button"
            aria-label={`${w.t("دليل تصويبة", "Shot evidence")}: ${s(r.result)}`}
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(r);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(r);
              }
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
