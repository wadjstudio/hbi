type SyncError = { code?: string | null; message: string };

// About two minutes at the 5 s flush interval before asking the user to review.
export const MAX_TRANSIENT_RETRIES = 24;

// Temporary failures (offline, timeouts, rate limits, gateway/unavailable
// errors, an expired session awaiting refresh) leave the queued operation
// unmarked, so the next flush retries it with the same operation id and the
// server's receipt check keeps the retry idempotent. A 500 is excluded because
// PostgREST also returns it for deterministic SQL failures.
export function isTransientSyncFailure(status: number, error: SyncError) {
  if ([0, 408, 429, 502, 503, 504].includes(status)) return true;
  return status === 401 && Boolean(error.code?.startsWith("PGRST30"));
}

// attempts counts consecutive failures of one operation, including this one.
// Past the cap the failure is surfaced for manual review, so an invalid
// session or a long outage cannot retry forever.
export function shouldRetrySync(
  status: number,
  error: SyncError,
  attempts: number,
) {
  return attempts < MAX_TRANSIENT_RETRIES && isTransientSyncFailure(status, error);
}
