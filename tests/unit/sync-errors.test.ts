import { describe, expect, it } from "vitest";
import {
  MAX_TRANSIENT_RETRIES,
  isTransientSyncFailure,
  shouldRetrySync,
} from "../../features/workspace/sync-errors";

const network = { code: "", message: "TypeError: Failed to fetch" };

describe("sync failure classification", () => {
  it("keeps temporary failures retryable", () => {
    for (const status of [0, 408, 429, 502, 503, 504])
      expect(isTransientSyncFailure(status, network)).toBe(true);
    expect(
      isTransientSyncFailure(401, { code: "PGRST303", message: "JWT expired" }),
    ).toBe(true);
  });

  it("stops the queue for real rejections", () => {
    expect(
      isTransientSyncFailure(400, { code: "P0001", message: "Write denied" }),
    ).toBe(false);
    expect(
      isTransientSyncFailure(403, { code: "42501", message: "permission denied" }),
    ).toBe(false);
    expect(
      isTransientSyncFailure(401, { code: "42501", message: "unauthorized" }),
    ).toBe(false);
    expect(
      isTransientSyncFailure(500, { code: "XX000", message: "internal error" }),
    ).toBe(false);
  });

  it("caps retries so a lasting failure is surfaced for review", () => {
    expect(shouldRetrySync(0, network, 1)).toBe(true);
    expect(shouldRetrySync(0, network, MAX_TRANSIENT_RETRIES - 1)).toBe(true);
    expect(shouldRetrySync(0, network, MAX_TRANSIENT_RETRIES)).toBe(false);
    expect(
      shouldRetrySync(400, { code: "P0001", message: "Write denied" }, 1),
    ).toBe(false);
  });
});
