"use client";
import { useState } from "react";
import { type Drawing } from "@/types/workspace";
import { useWorkspace } from "./provider";
import { brand } from "@/lib/brand";
export function DrawingEditor({
  objects,
  onChange,
  overlay = false,
  editable = true,
}: {
  objects: Drawing[];
  onChange: (objects: Drawing[]) => void;
  overlay?: boolean;
  editable?: boolean;
}) {
  const w = useWorkspace();
  const [kind, setKind] = useState<Drawing["kind"]>("player"),
    [label, setLabel] = useState(""),
    [color, setColor] = useState<string>(brand.colors.cyan),
    [selected, setSelected] = useState("");
  function point(e: React.MouseEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
      y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)),
    };
  }
  return (
    <div className={overlay ? "drawing-overlay" : "drawing-editor"}>
      {editable && (
        <div className="toolbar drawing-tools">
          <select
            aria-label="Object"
            value={kind}
            onChange={(e) => setKind(e.target.value as Drawing["kind"])}
          >
            {(["player", "ball", "arrow", "path", "zone", "text"] as const).map(
              (k) => (
                <option key={k}>{k}</option>
              ),
            )}
          </select>
          <input
            aria-label="Label"
            placeholder={w.t("النص / الرقم", "Label / number")}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <input
            aria-label="Color"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
          <button
            onClick={() => {
              onChange(objects.filter((o) => o.id !== selected));
              setSelected("");
            }}
          >
            {w.t("حذف المحدد", "Delete selected")}
          </button>
          <button
            onClick={() => {
              const o = objects.find((o) => o.id === selected);
              if (o)
                onChange(
                  objects.map((r) =>
                    r.id === selected ? { ...r, label, color } : r,
                  ),
                );
            }}
          >
            {w.t("تعديل المحدد", "Update selected")}
          </button>
          <small>
            {w.t("اضغط لإضافة · اسحب للتحريك", "Click to add · drag to move")}
          </small>
        </div>
      )}
      <svg
        viewBox="0 0 1000 500"
        preserveAspectRatio="none"
        className="drawing-surface"
        role="img"
        aria-label="Tactical drawing"
        onClick={(e) => {
          if (!editable) return;
          const p = point(e);
          onChange([
            ...objects,
            {
              id: crypto.randomUUID(),
              kind,
              label,
              color,
              ...p,
              x2: Math.min(1, p.x + 0.12),
              y2: Math.min(1, p.y + 0.05),
            },
          ]);
        }}
      >
        {!overlay && (
          <>
            <rect width="1000" height="500" fill="#102a36" />
            <rect
              x="5"
              y="5"
              width="990"
              height="490"
              fill="none"
              stroke="#78919f"
            />
            <line x1="500" x2="500" y1="5" y2="495" stroke="#78919f" />
            <path
              d="M5 85 A165 165 0 0 1 5 415 M995 85 A165 165 0 0 0 995 415"
              fill="none"
              stroke="#78919f"
            />
          </>
        )}
        {objects.map((o) => (
          <g
            key={o.id}
            style={{ cursor: editable ? "grab" : "default" }}
            onClick={(e) => {
              e.stopPropagation();
              setSelected(o.id);
            }}
            onPointerDown={(e) => {
              if (editable) {
                e.currentTarget.setPointerCapture(e.pointerId);
                setSelected(o.id);
              }
            }}
            onPointerMove={(e) => {
              if (!editable || !e.currentTarget.hasPointerCapture(e.pointerId))
                return;
              const rect =
                e.currentTarget.ownerSVGElement!.getBoundingClientRect();
              const x = Math.max(
                  0,
                  Math.min(1, (e.clientX - rect.left) / rect.width),
                ),
                y = Math.max(
                  0,
                  Math.min(1, (e.clientY - rect.top) / rect.height),
                );
              onChange(
                objects.map((r) => (r.id === o.id ? { ...r, x, y } : r)),
              );
            }}
          >
            {o.kind === "player" || o.kind === "ball" ? (
              <circle
                cx={o.x * 1000}
                cy={o.y * 500}
                r={o.kind === "ball" ? 10 : 23}
                fill={o.color}
                stroke={selected === o.id ? "white" : "#0a1017"}
                strokeWidth="3"
              />
            ) : o.kind === "zone" ? (
              <rect
                x={o.x * 1000}
                y={o.y * 500}
                width="100"
                height="60"
                fill={o.color}
                fillOpacity=".25"
                stroke={o.color}
              />
            ) : o.kind === "arrow" || o.kind === "path" ? (
              <>
                <path
                  d={`M${o.x * 1000} ${o.y * 500} ${o.kind === "path" ? "Q" + ((o.x + (o.x2 ?? o.x)) / 2) * 1000 + " " + (o.y * 500 - 40) : "L"} ${(o.x2 ?? o.x + 0.1) * 1000} ${(o.y2 ?? o.y + 0.05) * 500}`}
                  fill="none"
                  stroke={o.color}
                  strokeWidth="5"
                />
                <circle
                  cx={(o.x2 ?? o.x + 0.1) * 1000}
                  cy={(o.y2 ?? o.y + 0.05) * 500}
                  r="6"
                  fill={o.color}
                />
              </>
            ) : null}
            <text
              x={o.x * 1000}
              y={o.y * 500 + 5}
              fill={o.kind === "player" ? "#07101a" : o.color}
              textAnchor="middle"
              fontSize="20"
              fontWeight="bold"
            >
              {o.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
