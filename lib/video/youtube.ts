export type OnlineController = {
  play: () => void;
  pause: () => void;
  seek: (ms: number) => void;
  time: () => number;
  muted: (muted: boolean) => void;
  volume: (volume: number) => void;
  rate: (rate: number) => void;
};
export type YouTubePlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  mute: () => void;
  unMute: () => void;
  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;
  getAvailablePlaybackRates: () => number[];
  destroy: () => void;
};
type YouTubeAPI = {
  Player: new (
    element: HTMLElement,
    options: {
      host: string;
      videoId: string;
      playerVars: Record<string, string | number>;
      events: {
        onReady: () => void;
        onStateChange: () => void;
        onError: (event: { data: number }) => void;
      };
    },
  ) => YouTubePlayer;
};
declare global {
  interface Window {
    YT?: YouTubeAPI;
    onYouTubeIframeAPIReady?: () => void;
  }
}
let loading: Promise<YouTubeAPI> | undefined;
export function loadYouTubeAPI() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (loading) return loading;
  loading = new Promise<YouTubeAPI>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    const timeout = window.setTimeout(() => {
      loading = undefined;
      reject(new Error("YouTube player timed out; check connection and retry"));
    }, 20000);
    window.onYouTubeIframeAPIReady = () => {
      clearTimeout(timeout);
      previous?.();
      if (window.YT?.Player) resolve(window.YT);
      else {
        loading = undefined;
        reject(new Error("YouTube player API unavailable"));
      }
    };
    const old = document.querySelector<HTMLScriptElement>(
      "script[data-hbi-youtube]",
    );
    if (old) old.remove();
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.dataset.hbiYoutube = "true";
    script.onerror = () => {
      clearTimeout(timeout);
      loading = undefined;
      script.remove();
      reject(new Error("Unable to load YouTube player"));
    };
    document.head.appendChild(script);
  });
  return loading;
}
