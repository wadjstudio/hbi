// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TrackingReview } from "@/components/workspace/tracking-review";
import { useTrackingReview } from "@/features/analysis/use-tracking-review";
import { analysisReviews } from "@/lib/local/analysis-reviews";
import { crossingFixture } from "@/tests/fixtures/tactical-results";
import { preparationFixture } from "@/tests/fixtures/spatial-preparation";
vi.mock("@/components/workspace/provider", () => ({ useWorkspace: () => ({ t: (_ar: string, en: string) => en }) }));
const report = crossingFixture();
const video = { id: "v", organization_id: "org", local_fingerprint: report.source.local_fingerprint,
  file_size_bytes: report.source.size_bytes, duration_ms: report.source.duration_ms,
  width: report.source.width, height: report.source.height };
const seek = vi.fn();
function Harness({ scope = "account-a/org/session/video" }) {
  const state = useTrackingReview(scope, video);
  return <TrackingReview scope={scope} video={video} {...state} timeMs={1000}
    selection={{ scope, frame: 0, track: 1 }} isAvailable isVisible
    onVisibility={() => {}} onSeek={seek} onSelect={() => {}} />;
}
afterEach(async () => { cleanup(); seek.mockClear(); await analysisReviews.tracking.clear(); });
it("imports unreviewed preparation, restores it locally and invalidates it after a box correction", async () => {
  const scope = "account-a/org/session/video";
  await analysisReviews.tracking.put({ key: scope, report, corrections: {} });
  render(<Harness />);
  const input = await screen.findByLabelText("Import automatic team and court preparation");
  const preparation = preparationFixture();
  const file = new File([JSON.stringify(preparation)], "preparation.json", { type: "application/json" });
  Object.defineProperty(file, "text", { value: async () => JSON.stringify(preparation) });
  fireEvent.change(input, { target: { files: [file] } });
  await screen.findByText("Team and court preparation — unreviewed");
  await waitFor(async () => expect((await analysisReviews.tracking.get(scope))?.tactics?.preparation).toEqual(preparation));
  cleanup(); render(<Harness />);
  await screen.findByText("Team and court preparation — unreviewed");
  fireEvent.change(screen.getByLabelText("x1"), { target: { value: ".19" } });
  fireEvent.click(screen.getByRole("button", { name: "Save frame correction" }));
  await waitFor(async () => expect((await analysisReviews.tracking.get(scope))?.tactics).toBeUndefined());
  await waitFor(() => expect(screen.queryByText("Team and court preparation — unreviewed")).toBeNull());
});
it("extracts on import, opens evidence and retains reviewed/rejected notes after reload", async () => {
  const scope = "account-a/org/session/video";
  await analysisReviews.tracking.put({ key: scope, report, corrections: {} });
  render(<Harness />);
  await screen.findByText(/Possible path crossing/);
  expect(screen.getByText("Extraction evidence coverage and continuity")).toBeDefined();
  fireEvent.click(screen.getByRole("button", { name: "Watch evidence" }));
  expect(seek).toHaveBeenCalledWith(1000);
  fireEvent.change(screen.getByLabelText("Tactical note"), { target: { value: "Not an attacking cross" } });
  fireEvent.change(screen.getByLabelText("Coach decision"), { target: { value: "rejected" } });
  fireEvent.click(screen.getByRole("button", { name: "Save proposal review" }));
  await screen.findByText(/Rejected/);
  cleanup(); render(<Harness />);
  await waitFor(() => expect((screen.getByLabelText("Tactical note") as HTMLInputElement).value).toBe("Not an attacking cross"));
  expect((await analysisReviews.tracking.get(scope))?.tactics?.decisions).toBeDefined();
});
it("clears tactical approvals after box edits and hides prior-account proposals immediately", async () => {
  const scope = "account-a/org/session/video";
  await analysisReviews.tracking.put({ key: scope, report, corrections: {} });
  const { rerender } = render(<Harness />);
  await screen.findByText(/Possible path crossing/);
  fireEvent.click(screen.getByRole("button", { name: "Save proposal review" }));
  await waitFor(async () => expect((await analysisReviews.tracking.get(scope))?.tactics).toBeDefined());
  fireEvent.change(screen.getByLabelText("x1"), { target: { value: ".19" } });
  fireEvent.click(screen.getByRole("button", { name: "Save frame correction" }));
  await waitFor(async () => expect((await analysisReviews.tracking.get(scope))?.tactics).toBeUndefined());
  rerender(<Harness scope="account-b/org/session/video" />);
  expect(screen.queryByText(/Possible path crossing/)).toBeNull();
  await screen.findByText(/Import the source-bound local ByteTrack sample/);
});
