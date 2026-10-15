type SyncError = { code?: string | null; message: string };

// Temporary failures (offline, timeouts, rate limits, server errors, an expired
// session awaiting refresh) leave the queued operation unmarked, so the next
// flush retries it with the same operation id and the server's receipt check
// keeps the retry idempotent. Anything else is a real rejection for review.
export function isTransientSyncFailure(status: number, error: SyncError) {
  if (status === 0 || status === 408 || status === 429 || status >= 500)
    return true;
  return status === 401 && Boolean(error.code?.startsWith("PGRST30"));
}
