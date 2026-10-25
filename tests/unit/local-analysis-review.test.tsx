// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LocalAnalysisReview } from "@/components/workspace/local-analysis-review";
import { analysisReviews } from "@/lib/local/analysis-reviews";

const account = vi.hoisted(() => ({ user: "coach-a", org: "org-a", t: (_ar: string, en: string) => en }));
vi.mock("@/components/workspace/provider", () => ({ useWorkspace: () => account }));
const video = { id: "video-a", organization_id: "org-a", local_fingerprint: "a".repeat(64), file_size_bytes: 500, duration_ms: 60000 };
const candidate = { id: "55c9f4a1-1173-499c-bb98-9707cb40388e", kind: "score_change_candidate", video_start_ms: 5000, video_end_ms: 15000, before: [4, 4], after: [4, 5], side: "right", note: "Not a confirmed goal" };
const report = { schema: "sesen.workbench-analysis.v1", source: { name: "match.mp4", sha256: "b".repeat(64), local_fingerprint: "a".repeat(64), fingerprint_scheme: "hbi-head-tail-size-v1", size_bytes: 500, duration_ms: 60000 }, engine: { name: "OCR", model_sha256: "c".repeat(64), limitations: ["Unreviewed"] }, candidates: [candidate] };
function mount(sessionId = "session-a") {
  const onOpen = vi.fn(), onClip = vi.fn(async () => ({}));
  render(<LocalAnalysisReview sessionId={sessionId} video={video} isAvailable isCanClip onOpen={onOpen} onClip={onClip} />);
  return { onOpen, onClip };
}
async function upload(input: unknown = report) {
  const file = new File([JSON.stringify(input)], "workbench.json", { type: "application/json" });
  Object.defineProperty(file, "text", { value: async () => JSON.stringify(input) });
  fireEvent.change(await screen.findByLabelText("Import analysis or review backup"), { target: { files: [file] } });
  await screen.findByText("Possible score change");
}
afterEach(async () => { cleanup(); await analysisReviews.reviews.clear(); account.user = "coach-a"; });
describe("local engine review", () => {
  it("imports, opens source evidence, clips and preserves review after remount", async () => {
    const { onOpen, onClip } = mount();
    await upload();
    fireEvent.click(screen.getByRole("button", { name: "Open evidence" }));
    expect(onOpen).toHaveBeenCalledWith(candidate);
    fireEvent.click(screen.getByRole("button", { name: "Create review clip" }));
    await waitFor(() => expect(onClip).toHaveBeenCalledWith(candidate));
    await waitFor(() => expect((screen.getByRole("button", { name: "Mark reviewed" }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole("button", { name: "Mark reviewed" }));
    await waitFor(() => expect(screen.queryByText("Possible score change")).toBeNull());
    cleanup(); mount();
    fireEvent.change(await screen.findByLabelText("Review status"), { target: { value: "reviewed" } });
    await screen.findByText("Possible score change");
  });
  it("does not expose the previous coach or session draft", async () => {
    mount(); await upload(); cleanup();
    account.user = "coach-b"; mount();
    await screen.findByText(/Run the scoreboard tool/);
    expect(screen.queryByText("Possible score change")).toBeNull();
    cleanup(); account.user = "coach-a"; mount("session-b");
    await screen.findByText(/Run the scoreboard tool/);
    expect(screen.queryByText("Possible score change")).toBeNull();
  });
  it("rejects a different video's report without saving it", async () => {
    mount();
    const wrong = { ...report, source: { ...report.source, local_fingerprint: "d".repeat(64) } };
    const file = new File(["{}"], "wrong.json");
    Object.defineProperty(file, "text", { value: async () => JSON.stringify(wrong) });
    fireEvent.change(await screen.findByLabelText("Import analysis or review backup"), { target: { files: [file] } });
    await screen.findByRole("alert");
    expect(await analysisReviews.reviews.count()).toBe(0);
  });
});
