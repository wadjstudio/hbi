export async function fingerprint(file: File): Promise<string> {
  const block = 1024 * 1024;
  const bytes = new Blob([
    await file.slice(0, block).arrayBuffer(),
    await file.slice(Math.max(block, file.size - block)).arrayBuffer(),
    String(file.size),
  ]);
  const hash = await crypto.subtle.digest("SHA-256", await bytes.arrayBuffer());
  return Array.from(new Uint8Array(hash), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
export async function inspectVideo(file: File): Promise<{
  url: string;
  duration: number;
  width: number;
  height: number;
  fingerprint: string;
}> {
  const url = URL.createObjectURL(file);
  try {
    const meta = await new Promise<{
      duration: number;
      width: number;
      height: number;
    }>((resolve, reject) => {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.src = url;
      const cleanup = () => {
        clearTimeout(timer);
        v.onloadedmetadata = null;
        v.onerror = null;
        v.removeAttribute("src");
        v.load();
      };
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error("Video metadata timed out"));
      }, 15000);
      v.onloadedmetadata = () => {
        const duration = Math.round(v.duration * 1000),
          width = v.videoWidth,
          height = v.videoHeight,
          valid = Number.isFinite(v.duration) && v.duration > 0;
        cleanup();
        if (!valid) return reject(new Error("Invalid video duration"));
        resolve({
          duration,
          width,
          height,
        });
      };
      v.onerror = () => {
        cleanup();
        reject(new Error("Unsupported video; use local MP4 H.264/AAC"));
      };
    });
    return { url, ...meta, fingerprint: await fingerprint(file) };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}
