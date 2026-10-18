"use client";
import { useState } from "react";
import { useWorkspace } from "./provider";
import type { useAction } from "./controls";
import { formatTime } from "@/lib/video/time";
import { n, type Row } from "@/types/workspace";
import { canWrite } from "@/lib/permissions/roles";

// period and segment end stay with the workspace: events fall back to the
// period, and attaching a source resets the end to its duration.
export function ClockCalibration({
  sessionId,
  segments,
  period,
  onPeriod,
  segEnd,
  onSegEnd,
  isAvailable,
  captureTime,
  action,
}: {
  sessionId: string;
  segments: Row[];
  period: number;
  onPeriod: (period: number) => void;
  segEnd: number;
  onSegEnd: (seconds: number) => void;
  isAvailable: boolean;
  captureTime: () => number;
  action: ReturnType<typeof useAction>;
}) {
  const w = useWorkspace();
  const [clockStart, setClockStart] = useState(0),
    [segStart, setSegStart] = useState(0),
    [running, setRunning] = useState(true);
  return (
    <details className="clock-tools">
      <summary>{w.t("معايرة ساعة المباراة", "Calibrate match clock")}</summary>
      <form
        className="editor form-grid"
        onSubmit={(e) => {
          e.preventDefault();
          void action.run(() =>
            w.save("video_clock_segments", {
              analysis_session_id: sessionId,
              period,
              video_start_ms: Math.round(segStart * 1000),
              video_end_ms: Math.round(segEnd * 1000),
              clock_start_ms: Math.round(clockStart * 1000),
              running,
            }),
          );
        }}
      >
        <label>
          {w.t("الشوط", "Period")}
          <input
            type="number"
            min="1"
            max="4"
            value={period}
            onChange={(e) => onPeriod(Number(e.target.value))}
          />
        </label>
        <label>
          {w.t("بداية الفيديو / ثانية", "Video start / sec")}
          <input
            type="number"
            min="0"
            value={segStart}
            step={0.001}
            onChange={(e) => setSegStart(Number(e.target.value))}
          />
        </label>
        <label>
          {w.t("نهاية الفيديو / ثانية", "Video end / sec")}
          <input
            type="number"
            min="0"
            value={segEnd}
            step={0.001}
            onChange={(e) => onSegEnd(Number(e.target.value))}
          />
        </label>
        <label>
          {w.t("ساعة الشوط / ثانية", "Period clock / sec")}
          <input
            type="number"
            min="0"
            value={clockStart}
            step={0.001}
            onChange={(e) => setClockStart(Number(e.target.value))}
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={running}
            onChange={(e) => setRunning(e.target.checked)}
          />
          {w.t("الساعة تعمل", "Clock running")}
        </label>
        <div className="toolbar">
          <button
            type="button"
            disabled={!isAvailable}
            onClick={() =>
              void action.run(async () => {
                setSegStart(captureTime() / 1000);
              })
            }
          >
            {w.t("البداية عند اللقطة الحالية", "Start at current frame")}
          </button>
          <button
            type="button"
            disabled={!isAvailable}
            onClick={() =>
              void action.run(async () => {
                onSegEnd(captureTime() / 1000);
              })
            }
          >
            {w.t("النهاية عند اللقطة الحالية", "End at current frame")}
          </button>
          <button>{w.t("إضافة مقطع معايرة", "Add clock segment")}</button>
        </div>
      </form>
      {segments.map((r) => (
        <div key={r.id}>
          {formatTime(n(r.video_start_ms))} → {formatTime(n(r.video_end_ms))}{" "}
          · {n(r.period)}{" "}
          <button
            type="button"
            aria-label={w.t("حذف مقطع المعايرة", "Delete clock segment")}
            disabled={!canWrite(w.role, "video_clock_segments") || action.busy}
            onClick={() =>
              void action.run(() => w.save("video_clock_segments", r, true))
            }
          >
            ×
          </button>
        </div>
      ))}
    </details>
  );
}
