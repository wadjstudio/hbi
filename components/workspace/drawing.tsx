"use client";
import { useId, useState } from "react";
import {
  Circle,
  MousePointer2,
  MoveUpRight,
  Route,
  Scan,
  Type,
  UserRound,
} from "lucide-react";
import { type Drawing } from "@/types/workspace";
import { moveDrawing } from "@/features/tactics/drawing-motion";
import { useWorkspace } from "./provider";
import { brand } from "@/lib/brand";
export const DrawingEditor = ({
  objects,
  onChange,
  overlay = false,
  editable = true,
}: {
  objects: Drawing[];
  onChange: (objects: Drawing[]) => void;
  overlay?: boolean;
  editable?: boolean;
}) => {
  const w = useWorkspace();
  const markerId = useId().replaceAll(":", "");
  const [kind, setKind] = useState<Drawing["kind"]>("player"),
    [label, setLabel] = useState(""),
    [color, setColor] = useState<string>(brand.colors.cyan),
    [selected, setSelected] = useState(""),
    [isSelectMode, setSelectMode] = useState(false);
  const tools = [
    { kind: "player", ar: "لاعب", en: "Player", Icon: UserRound },
    { kind: "ball", ar: "كرة", en: "Ball", Icon: Circle },
    { kind: "arrow", ar: "سهم", en: "Arrow", Icon: MoveUpRight },
    { kind: "path", ar: "مسار", en: "Path", Icon: Route },
    { kind: "zone", ar: "منطقة", en: "Zone", Icon: Scan },
    { kind: "text", ar: "نص", en: "Text", Icon: Type },
  ] as const;
  const selectObject = (object: Drawing) => {
    setSelected(object.id);
    setLabel(object.label);
    setColor(object.color);
  };
  function point(e: React.MouseEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
      y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)),
    };
  }
  return (
    <div
      data-slot="drawing-editor"
      className={overlay ? "drawing-overlay" : "drawing-editor"}
    >
      {editable && (
        <div className="toolbar drawing-tools">
          <div
            className="drawing-tool-picker"
            role="group"
            aria-label={w.t("أدوات الرسم", "Drawing tools")}
          >
            <button
              type="button"
              aria-pressed={isSelectMode}
              onClick={() => setSelectMode(true)}
            >
              <MousePointer2 size={16} aria-hidden="true" />
              {w.t("تحديد", "Select")}
            </button>
            {tools.map(({ kind: value, ar, en, Icon }) => (
              <button
                key={value}
                type="button"
                aria-pressed={!isSelectMode && kind === value}
                onClick={() => {
                  setKind(value);
                  setSelectMode(false);
                }}
              >
                <Icon size={16} aria-hidden="true" />
                {w.t(ar, en)}
              </button>
            ))}
          </div>
          <input
            aria-label={w.t("النص / الرقم", "Label")}
            maxLength={200}
            placeholder={w.t("النص / الرقم", "Label / number")}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <input
            aria-label={w.t("لون الرسم", "Color")}
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
          <button
            type="button"
            disabled={!objects.some((object) => object.id === selected)}
            onClick={() => {
              onChange(objects.filter((o) => o.id !== selected));
              setSelected("");
            }}
          >
            {w.t("حذف المحدد", "Delete selected")}
          </button>
          <button
            type="button"
            disabled={!objects.some((object) => object.id === selected)}
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
          <details className="drawing-object-picker">
            <summary>
              {w.t("العناصر", "Objects")} · {objects.length}
            </summary>
            <p>
              {w.t(
                "حدد عنصرًا؛ الأسهم تحركه 1% وShift يضاعف الخطوة لخمس مرات.",
                "Select an object; arrow keys move 1%, Shift moves 5%.",
              )}
            </p>
            {objects.map((object, index) => (
              <button
                key={object.id}
                type="button"
                aria-pressed={selected === object.id}
                onClick={() => {
                  selectObject(object);
                  setSelectMode(true);
                }}
                onKeyDown={(event) => {
                  const directions: Record<string, [number, number]> = {
                    ArrowLeft: [-1, 0],
                    ArrowRight: [1, 0],
                    ArrowUp: [0, -1],
                    ArrowDown: [0, 1],
                  };
                  const direction = directions[event.key];
                  if (!direction) return;
                  event.preventDefault();
                  event.stopPropagation();
                  const step = event.shiftKey ? 0.05 : 0.01;
                  onChange(
                    objects.map((row) =>
                      row.id === object.id
                        ? moveDrawing(
                            row,
                            direction[0] * step,
                            direction[1] * step,
                          )
                        : row,
                    ),
                  );
                }}
              >
                {index + 1} ·{" "}
                {w.t(
                  tools.find((tool) => tool.kind === object.kind)!.ar,
                  tools.find((tool) => tool.kind === object.kind)!.en,
                )}{" "}
                · {object.label || "—"}
              </button>
            ))}
          </details>
          <small>
            {isSelectMode
              ? w.t(
                  "حدد عنصرًا لتحريره أو تحريكه",
                  "Select an object to edit or move",
                )
              : w.t(
                  "اضغط لإضافة · اسحب للتحريك",
                  "Click to add · drag to move",
                )}
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
          if (!editable || isSelectMode) return;
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
        <defs>
          <marker
            id={markerId}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="4"
            markerHeight="4"
            orient="auto-start-reverse"
          >
            <path d="M0 0 L10 5 L0 10 Z" fill="context-stroke" />
          </marker>
        </defs>
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
              selectObject(o);
            }}
            onPointerDown={(e) => {
              if (editable) {
                e.currentTarget.setPointerCapture(e.pointerId);
                selectObject(o);
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
                objects.map((r) =>
                  r.id === o.id ? moveDrawing(r, x - r.x, y - r.y) : r,
                ),
              );
            }}
          >
            {editable && selected === o.id && (
              <circle
                cx={o.x * 1000}
                cy={o.y * 500}
                r="30"
                fill="none"
                stroke="white"
                strokeDasharray="4 3"
                strokeWidth="2"
              />
            )}
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
                  markerEnd={
                    o.kind === "arrow" ? `url(#${markerId})` : undefined
                  }
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
};
