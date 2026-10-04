// Session-only object URLs. Files never enter the database, outbox or backups.
const sources = new Map<string, Map<string, string>>();
export function getLocalSource(scope: string, videoId: string) {
  return sources.get(scope)?.get(videoId) ?? "";
}
export function registerLocalSource(
  scope: string,
  videoId: string,
  url: string,
) {
  const byVideo = sources.get(scope) ?? new Map<string, string>();
  const previous = byVideo.get(videoId);
  if (previous && previous !== url) URL.revokeObjectURL(previous);
  byVideo.set(videoId, url);
  sources.set(scope, byVideo);
  window.dispatchEvent(new Event("hbi-local-source"));
}
export function releaseLocalSources(scope: string) {
  for (const url of sources.get(scope)?.values() ?? [])
    URL.revokeObjectURL(url);
  sources.delete(scope);
}
