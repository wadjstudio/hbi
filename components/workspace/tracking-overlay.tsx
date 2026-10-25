"use client";
import { useEffect, useState, type RefObject } from "react";
import { trackingCorrectionKey, trackingFrameIndex, visibleTrackingBox,
  type TrackingReport, type TrackingCorrections } from "@/features/analysis/tracking-results";

export function TrackingOverlay({ report, corrections, videoRef, timeMs, onSelect }: {
  report: TrackingReport; corrections: TrackingCorrections;
  videoRef: RefObject<HTMLVideoElement | null>; timeMs: number;
  onSelect: (frame: number, track: number) => void;
}) {
  const [paintedTime, setPaintedTime] = useState<number | null>(null);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let handle = 0, cancelled = false;
    const update = () => setPaintedTime(video.currentTime * 1000);
    const painted = (_now: number, metadata: VideoFrameCallbackMetadata) => {
      if (cancelled) return;
      setPaintedTime(metadata.mediaTime * 1000);
      handle = video.requestVideoFrameCallback(painted);
    };
    if (typeof video.requestVideoFrameCallback === "function") handle = video.requestVideoFrameCallback(painted);
    video.addEventListener("seeked", update);
    video.addEventListener("timeupdate", update);
    return () => {
      cancelled = true;
      if (handle) video.cancelVideoFrameCallback(handle);
      video.removeEventListener("seeked", update);
      video.removeEventListener("timeupdate", update);
    };
  }, [videoRef]);
  const index = trackingFrameIndex(report, paintedTime ?? timeMs), frame = report.frames[index];
  if (!frame) return null;
  const width = report.source.width, height = report.source.height;
  return <svg className="tracking-overlay" data-slot="tracking-overlay" data-frame-index={index}
    viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" role="img"
    aria-label="Scene-local person track proposals; not player identities">
    {frame.persons.map((person) => {
      const correction = corrections[trackingCorrectionKey(index, frame.scene, person.track_id)];
      const raw = correction ? correction.box : person.box;
      const box = raw ? visibleTrackingBox(raw) : null;
      if (!box) return null;
      const [x1, y1, x2, y2] = box;
      const label = `${frame.scene}:${person.track_id}`;
      return <g key={person.track_id} data-track-id={label} data-manual={Boolean(correction)}
        onClick={() => onSelect(index, person.track_id)} style={{ pointerEvents: "auto", cursor: "pointer" }}>
        <rect x={x1 * width} y={y1 * height} width={(x2 - x1) * width} height={(y2 - y1) * height}
          fill="transparent" stroke={correction ? "#d8b476" : "#00d9e0"} strokeWidth="2" vectorEffect="non-scaling-stroke" />
        <text x={x1 * width + 3} y={Math.max(20, y1 * height - 5)} fontSize="18" fill="white"
          stroke="#071014" strokeWidth="3" paintOrder="stroke">{label}{correction ? " *" : ""}</text>
      </g>;
    })}
  </svg>;
}
