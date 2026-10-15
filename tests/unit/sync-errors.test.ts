import { describe, expect, it } from "vitest";
import { isTransientSyncFailure } from "../../features/workspace/sync-errors";

describe("sync failure classification", () => {
  it("keeps temporary failures retryable", () => {
    const network = { code: "", message: "TypeError: Failed to fetch" };
    expect(isTransientSyncFailure(0, network)).toBe(true);
    expect(isTransientSyncFailure(408, network)).toBe(true);
    expect(isTransientSyncFailure(429, network)).toBe(true);
    expect(isTransientSyncFailure(503, network)).toBe(true);
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
  });
});
