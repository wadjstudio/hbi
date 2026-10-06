"use client";
import { useState, type RefObject } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Maximize,
  Volume2,
  VolumeX,
} from "lucide-react";
import { formatTime } from "@/lib/video/time";
import { useWorkspace } from "./provider";
import { Notice, useAction } from "./controls";

export function VideoTransport({
  player,
  playing,
  available,
  timeMs,
  durationMs,
  onSeek,
  onMute,
  onVolume,
  onRate,
}: {
  player: RefObject<HTMLVideoElement | null>;
  playing: boolean;
  available: boolean;
  timeMs: number;
  durationMs: number;
  onSeek: (ms: number) => void;
  onMute: (muted: boolean) => void;
  onVolume: (volume: number) => void;
  onRate: (rate: number) => void;
}) {
  const w = useWorkspace(),
    a = useAction();
  const [muted, setMuted] = useState(false);
  const duration = Math.max(0, durationMs);
  const seek = (ms: number) => onSeek(Math.max(0, Math.min(duration, ms)));
  return (
    <>
      <div className="video-transport" dir="ltr">
        <button
          disabled={!available}
          aria-label={w.t(
            playing ? "إيقاف الفيديو" : "تشغيل الفيديو",
            playing ? "Pause video" : "Play video",
          )}
          onClick={() =>
            void a.run(async () => {
              const video = player.current;
              if (!video) return;
              if (video.paused) await video.play();
              else video.pause();
            })
          }
        >
          {playing ? <Pause size={17} /> : <Play size={17} />}
        </button>
        <button
          disabled={!available}
          aria-label={w.t("رجوع 5 ثوان", "Back 5 seconds")}
          onClick={() => seek(timeMs - 5000)}
        >
          <RotateCcw size={15} />
          <small>5</small>
        </button>
        <button
          disabled={!available}
          aria-label={w.t("تقديم 5 ثوان", "Forward 5 seconds")}
          onClick={() => seek(timeMs + 5000)}
        >
          <RotateCw size={15} />
          <small>5</small>
        </button>
        <span className="transport-time">
          {formatTime(timeMs)} / {formatTime(duration)}
        </span>
        <input
          type="range"
          min="0"
          max={duration || 1}
          value={Math.min(timeMs, duration)}
          step="100"
          disabled={!available || !duration}
          aria-label={w.t("وقت الفيديو", "Video time")}
          onChange={(e) => seek(Number(e.target.value))}
        />
        <button
          disabled={!available}
          aria-label={w.t(
            muted ? "تشغيل الصوت" : "كتم الصوت",
            muted ? "Unmute" : "Mute",
          )}
          onClick={() => {
            onMute(!muted);
            setMuted(!muted);
          }}
        >
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
        <label className="transport-volume">
          <input
            type="range"
            min="0"
            max="1"
            step=".05"
            defaultValue="1"
            disabled={!available}
            aria-label={w.t("الصوت", "Volume")}
            onChange={(e) => {
              onVolume(Number(e.target.value));
            }}
          />
        </label>
        <select
          disabled={!available}
          defaultValue="1"
          aria-label={w.t("سرعة التشغيل", "Playback speed")}
          onChange={(e) => {
            onRate(Number(e.target.value));
          }}
        >
          {[0.25, 0.5, 1, 1.5, 2].map((rate) => (
            <option key={rate} value={rate}>
              {rate}×
            </option>
          ))}
        </select>
        <button
          disabled={!available}
          aria-label={w.t("ملء شاشة الفيديو", "Video fullscreen")}
          onClick={() =>
            void a.run(async () => {
              if (document.fullscreenElement) await document.exitFullscreen();
              else await player.current?.parentElement?.requestFullscreen();
            })
          }
        >
          <Maximize size={16} />
        </button>
      </div>
      {a.error && <Notice>{a.error}</Notice>}
    </>
  );
}
