"use client";
import { useState } from "react";
import { LocateFixed, Minus, Plus } from "lucide-react";
import { eventColor, timelineWindow } from "@/features/analysis/workbench";
import { n, s, type Row } from "@/types/workspace";
import { formatTime } from "@/lib/video/time";
import { useWorkspace } from "./provider";

export function AnalysisTimeline({
  events,
  shots,
  possessions,
  clips,
  durationMs,
  timeMs,
  selectedId,
  onEvent,
  onSeek,
}: {
  events: Row[];
  shots: Row[];
  possessions: Row[];
  clips: Row[];
  durationMs: number;
  timeMs: number;
  selectedId: string;
  onEvent: (event: Row) => void;
  onSeek: (ms: number) => void;
}) {
  const w = useWorkspace();
  const [zoom, setZoom] = useState(1),
    [start, setStart] = useState(0);
  const window = timelineWindow(durationMs, start, zoom);
  const left = (ms: number) =>
    `${(100 * (ms - window.start)) / Math.max(1, window.width)}%`;
  const visible = (ms: number) =>
    window.duration > 0 && ms >= window.start && ms <= window.end;
  const bands = (rows: Row[], lane: string) =>
    rows
      .filter(
        (r) =>
          window.duration > 0 &&
          n(r.start_ms) <= window.end &&
          n(r.end_ms ?? timeMs) >= window.start,
      )
      .map((r) => {
        const begin = Math.max(window.start, n(r.start_ms));
        const end = Math.min(window.end, n(r.end_ms ?? timeMs));
        return (
          <button
            key={r.id}
            className={`timeline-band ${lane}`}
            style={{
              left: left(begin),
              width: `${Math.max(0.8, (100 * (end - begin)) / Math.max(1, window.width))}%`,
            }}
            title={`${s(r.title) || lane} · ${formatTime(n(r.start_ms))}–${r.end_ms == null ? "…" : formatTime(n(r.end_ms))}`}
            aria-label={`${lane} ${formatTime(n(r.start_ms))}`}
            onClick={() => onSeek(n(r.start_ms))}
          />
        );
      });
  return (
    <section
      className="analysis-timeline"
      aria-label={w.t("تايملاين التحليل", "Analysis timeline")}
    >
      <header>
        <b>{w.t("خط أحداث الفيديو", "Video event timeline")}</b>
        <small>n={events.length}</small>
        <div className="timeline-zoom">
          <button
            aria-label={w.t("تصغير التايملاين", "Zoom out timeline")}
            disabled={zoom <= 1 || !window.duration}
            onClick={() => setZoom(Math.max(1, zoom / 2))}
          >
            <Minus size={13} />
          </button>
          <span>{zoom}×</span>
          <button
            aria-label={w.t("تكبير التايملاين", "Zoom in timeline")}
            disabled={zoom >= 16 || !window.duration}
            onClick={() => {
              setStart(Math.max(0, timeMs - window.width / 4));
              setZoom(Math.min(16, zoom * 2));
            }}
          >
            <Plus size={13} />
          </button>
          <button
            aria-label={w.t("إلى موضع التشغيل", "Center playhead")}
            disabled={!window.duration}
            onClick={() => setStart(Math.max(0, timeMs - window.width / 2))}
          >
            <LocateFixed size={14} />
          </button>
        </div>
      </header>
      <div className="timeline-lanes" dir="ltr">
        <div className="timeline-scale">
          <span />
          {Array.from({ length: 6 }, (_, i) => (
            <small key={i}>
              {formatTime(window.start + (window.width * i) / 5)}
            </small>
          ))}
        </div>
        <div className="timeline-lane">
          <span>{w.t("أحداث", "Events")}</span>
          <div className="timeline-track">
            {events
              .filter((e) => visible(n(e.timestamp_ms)))
              .map((e) => (
                <button
                  key={e.id}
                  className={`timeline-event ${selectedId === e.id ? "selected" : ""}`}
                  style={{
                    left: left(n(e.timestamp_ms)),
                    color: eventColor(e, shots),
                  }}
                  aria-label={`${formatTime(n(e.timestamp_ms))} · ${s(e.event_type)}`}
                  title={`${formatTime(n(e.timestamp_ms))} · ${s(e.event_type)}`}
                  onClick={() => onEvent(e)}
                />
              ))}
            {visible(timeMs) && (
              <i className="timeline-playhead" style={{ left: left(timeMs) }} />
            )}
          </div>
        </div>
        <div className="timeline-lane">
          <span>{w.t("هجمات", "Possessions")}</span>
          <div className="timeline-track">
            {bands(possessions, "possession")}
          </div>
        </div>
        <div className="timeline-lane">
          <span>{w.t("مقاطع", "Clips")}</span>
          <div className="timeline-track">{bands(clips, "clip")}</div>
        </div>
      </div>
      {zoom > 1 && (
        <input
          type="range"
          min="0"
          max={Math.max(0, window.duration - window.width)}
          step="100"
          value={window.start}
          dir="ltr"
          aria-label={w.t("بداية النطاق الزمني", "Timeline range start")}
          onChange={(e) => setStart(Number(e.target.value))}
        />
      )}
      {!window.duration && (
        <small className="timeline-empty">
          {w.t(
            "اربط مصدر الفيديو لتفعيل التوقيت. لا نفترض أن مدة المباراة تساوي مدة التسجيل.",
            "Link video to enable time. Match duration is not recording duration.",
          )}
        </small>
      )}
    </section>
  );
}
