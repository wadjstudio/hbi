"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  loadYouTubeAPI,
  type OnlineController,
  type YouTubePlayer,
} from "@/lib/video/youtube";
import { youtubeIdSchema } from "@/features/video/source";
import { useWorkspace } from "./provider";
import { Notice } from "./controls";
import {
  mediaConsent,
  subscribeMediaConsent,
  acceptMediaConsent,
} from "@/stores/media-consent";

export function YouTubePlayerView({
  videoId,
  startMs = 0,
  endMs,
  autoplay = false,
  onTime,
  onMetadata,
  onController,
  onPlaybackError,
}: {
  videoId: string;
  startMs?: number;
  endMs?: number;
  autoplay?: boolean;
  onTime?: (ms: number, playing: boolean) => void;
  onMetadata?: (durationMs: number, rates: number[]) => void;
  onController?: (controller: OnlineController | null) => void;
  onPlaybackError?: (message: string) => void;
}) {
  const w = useWorkspace(),
    host = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(""),
    [retry, setRetry] = useState(0),
    [loaded, setLoaded] = useState(false);
  const scope = `${w.user}:${w.org}`;
  const consent = useSyncExternalStore(
    subscribeMediaConsent,
    () => mediaConsent(scope),
    () => false,
  );
  const callbacks = useRef({
    onTime,
    onMetadata,
    onController,
    onPlaybackError,
  });
  useEffect(() => {
    callbacks.current = { onTime, onMetadata, onController, onPlaybackError };
  });
  useEffect(() => {
    const container = host.current;
    if (!container || !w.online || !consent) return;
    let cancelled = false,
      player: YouTubePlayer | undefined,
      timer: ReturnType<typeof setInterval> | undefined;
    let metadata = false,
      ended = false;
    const fail = (message: string) => {
      if (cancelled) return;
      if (timer) clearInterval(timer);
      setError(message);
      setLoaded(false);
      callbacks.current.onController?.(null);
      callbacks.current.onPlaybackError?.(message);
    };
    const tick = () => {
      if (cancelled || !player) return;
      const duration = Math.round(player.getDuration() * 1000);
      if (!metadata && duration > 0) {
        metadata = true;
        callbacks.current.onMetadata?.(
          duration,
          player.getAvailablePlaybackRates(),
        );
      }
      let ms = Math.max(0, Math.round(player.getCurrentTime() * 1000));
      if (endMs != null && ms >= endMs && !ended) {
        ended = true;
        player.pauseVideo();
        player.seekTo(startMs / 1000, true);
        ms = startMs;
      } else if (endMs == null || ms < endMs) ended = false;
      callbacks.current.onTime?.(ms, player.getPlayerState() === 1);
    };
    const mount = document.createElement("div");
    container.appendChild(mount);
    loadYouTubeAPI()
      .then((api) => {
        if (cancelled) return;
        youtubeIdSchema.parse(videoId);
        player = new api.Player(mount, {
          host: "https://www.youtube-nocookie.com",
          videoId,
          // Retain official controls/branding. No download, proxy or undocumented messages.
          playerVars: {
            origin: window.location.origin,
            playsinline: 1,
            rel: 0,
            start: Math.floor(startMs / 1000),
            autoplay: autoplay ? 1 : 0,
          },
          events: {
            onReady: () => {
              if (cancelled || !player) return;
              setLoaded(true);
              setError("");
              callbacks.current.onController?.({
                play: () => player?.playVideo(),
                pause: () => player?.pauseVideo(),
                seek: (ms) => {
                  ended = false;
                  player?.seekTo(ms / 1000, true);
                  tick();
                },
                time: () => Math.round((player?.getCurrentTime() ?? 0) * 1000),
                muted: (value) => (value ? player?.mute() : player?.unMute()),
                volume: (value) => player?.setVolume(value * 100),
                rate: (value) => player?.setPlaybackRate(value),
              });
              tick();
              timer = setInterval(tick, 250);
            },
            onStateChange: tick,
            onError: (event) =>
              fail(
                w.t(
                  `تعذر تشغيل المصدر الرسمي (رمز ${event.data}). قد يكون غير متاح أو يمنع التضمين.`,
                  `Official source cannot play (code ${event.data}); it may be unavailable or embedding restricted.`,
                ),
              ),
          },
        });
      })
      .catch((e) =>
        fail(e instanceof Error ? e.message : "YouTube unavailable"),
      );
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      callbacks.current.onController?.(null);
      player?.destroy();
      container.replaceChildren();
    };
    // Callback refs avoid restarting playback when workspace time/state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, startMs, endMs, autoplay, retry, w.online, w.lang, consent]);
  return (
    <div className="online-video-player">
      {!consent && (
        <div className="online-source-consent">
          <b>YouTube</b>
          <p>
            {w.t(
              "المشغل يتصل بـ YouTube وقد يستخدم ملفات تعريف الارتباط والإعلانات. لا نطلب تسجيل دخول YouTube ولا نحمل الفيديو. التسجيل التحليلي الذي تضيفه يخص مؤسستك.",
              "The player contacts YouTube and may use cookies and ads. No YouTube login or video download is requested. Your analysis belongs to your organization.",
            )}
          </p>
          <p>
            <a href="/privacy" target="_blank" rel="noreferrer">
            {w.t("خصوصية SESEN وشروط الاستخدام", "SESEN privacy & terms")}
            </a>{" "}
            ·{" "}
            <a
              href="https://www.youtube.com/t/terms"
              target="_blank"
              rel="noreferrer"
            >
              YouTube Terms
            </a>{" "}
            ·{" "}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noreferrer"
            >
              Google Privacy
            </a>
          </p>
          <button
            disabled={!w.online}
            onClick={() => acceptMediaConsent(scope)}
          >
            {w.t(
              "أوافق على الخصوصية والشروط · تحميل مشغل YouTube",
              "Agree to privacy & terms · Load YouTube player",
            )}
          </button>
        </div>
      )}
      <div ref={host} className="online-video-host" />
      {!w.online ? (
        <Notice>
          {w.t(
            "المصدر الرسمي يحتاج اتصالًا. المسودات محفوظة؛ استخدم جلسة فيديو محلي للعمل دون اتصال.",
            "Official source needs internet. Drafts are retained; use a local-video session offline.",
          )}
        </Notice>
      ) : error ? (
        <div className="online-source-error">
          <Notice>{error}</Notice>
          <button onClick={() => setRetry((i) => i + 1)}>
            {w.t("إعادة المحاولة", "Retry")}
          </button>
          <a
            target="_blank"
            rel="noreferrer"
            href={`https://www.youtube.com/watch?v=${videoId}`}
          >
            {w.t("فتح المصدر", "Open source")}
          </a>
        </div>
      ) : consent && !loaded ? (
        <p className="online-source-loading">
          {w.t("تحميل المشغل الرسمي…", "Loading official player…")}
        </p>
      ) : null}
    </div>
  );
}
