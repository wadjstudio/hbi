import { afterEach, describe, expect, it, vi } from "vitest";
import { fingerprint } from "../../lib/video/fingerprint";
import {
  getLocalSource,
  registerLocalSource,
  releaseLocalSources,
} from "../../lib/video/local-sources";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe("local video identity and access", () => {
  it("matches a reselected file independently of its name and rejects changed bytes", async () => {
    const original = new File(["handball video bytes"], "match.mp4");
    const renamed = new File(["handball video bytes"], "renamed.mp4");
    const incorrect = new File(["different video bytes"], "match.mp4");
    expect(await fingerprint(renamed)).toBe(await fingerprint(original));
    expect(await fingerprint(incorrect)).not.toBe(await fingerprint(original));
  });
  it("isolates source access by account/org and revokes replaced and signed-out URLs", () => {
    vi.stubGlobal("window", new EventTarget());
    const revoked = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => {});
    registerLocalSource("user-a:org-a", "video", "blob:first");
    expect(getLocalSource("user-b:org-a", "video")).toBe("");
    expect(getLocalSource("user-a:org-b", "video")).toBe("");
    registerLocalSource("user-a:org-a", "video", "blob:replacement");
    expect(revoked).toHaveBeenCalledWith("blob:first");
    expect(getLocalSource("user-a:org-a", "video")).toBe("blob:replacement");
    releaseLocalSources("user-a:org-a");
    expect(getLocalSource("user-a:org-a", "video")).toBe("");
    expect(revoked).toHaveBeenCalledWith("blob:replacement");
  });
});
