// @vitest-environment jsdom
import { webcrypto } from "node:crypto";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CoachClips } from "@/components/workspace/coach-clips";
import type { Row, Rows, Table } from "@/types/workspace";

let workspace: { org: string; role: string; rows: Rows; t: (ar: string, en: string) => string;
  list: (table: Table) => Row[]; save: ReturnType<typeof vi.fn> };
vi.mock("@/components/workspace/provider", () => ({ useWorkspace: () => workspace }));
const scope = { organizationId: "org", matchId: "match", sessionId: "session", videoId: "video" };
const capture = vi.fn(), seek = vi.fn();
const row = (id: string, values: Partial<Row> = {}): Row => ({ id, organization_id: "org", ...values });
function setup() {
  const rows: Rows = { matches: [row("match")], analysis_sessions: [row("session", { match_id: "match", video_id: "video" })],
    videos: [row("video", { match_id: "match", duration_ms: 10000 })], clips: [],
    presentations: [row("meeting", { title: "Before training" })], presentation_items: [] };
  workspace = { org: "org", role: "analyst", rows, t: (_ar, en) => en, list: (table) => rows[table] ?? [],
    save: vi.fn(async (table: Table, input: Partial<Row>) => {
      const result = row(input.id!, input); rows[table] = [...(rows[table] ?? []).filter((r) => r.id !== result.id), result]; return result;
    }) };
  capture.mockReturnValue(2750);
}
const view = (key = "account/org/session/video", available = true) => <CoachClips key={key} scope={scope}
  timeMs={2500} isAvailable={available} captureTime={capture} onSeek={seek} />;
beforeEach(() => { vi.stubGlobal("crypto", webcrypto); setup(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); capture.mockClear(); seek.mockClear(); });

it("marks exact source bounds, saves one retry-stable clip and adds its note to a meeting", async () => {
  render(view());
  fireEvent.click(screen.getByRole("button", { name: "Mark start here" }));
  capture.mockReturnValue(6500);
  fireEvent.click(screen.getByRole("button", { name: "Mark end here" }));
  fireEvent.change(screen.getByLabelText("Clip title"), { target: { value: "Pivot timing" } });
  fireEvent.click(screen.getByRole("button", { name: "Save clip" }));
  await screen.findByText("Clip saved in the workspace; synchronization runs when connected.");
  expect(workspace.rows.clips?.[0]).toMatchObject({ title: "Pivot timing", start_ms: 2750, end_ms: 6500, video_id: "video", match_id: "match" });
  fireEvent.click(screen.getByRole("button", { name: "Save clip" }));
  await waitFor(() => expect((screen.getByRole("button", { name: "Save clip" }) as HTMLButtonElement).disabled).toBe(false));
  expect(workspace.save.mock.calls.filter(([table]) => table === "clips")).toHaveLength(1);
  fireEvent.click(screen.getByText("Prepare meeting", { exact: true }));
  fireEvent.change(screen.getByLabelText("Target meeting"), { target: { value: "meeting" } });
  fireEvent.change(screen.getByLabelText("Presenter note for the added clip"), { target: { value: "Pause at the pivot's entry" } });
  fireEvent.click(screen.getByRole("button", { name: "Add to meeting · Pivot timing" }));
  await screen.findByText("Clip added to the meeting with its presenter note.");
  expect(workspace.rows.presentation_items?.[0]).toMatchObject({ clip_id: workspace.rows.clips![0]!.id,
    presentation_id: "meeting", speaker_note: "Pause at the pivot's entry", position: 0, autoplay: false });
  fireEvent.click(screen.getByRole("button", { name: "Add to meeting · Pivot timing" }));
  await screen.findByText("Clip already exists in the meeting; it was not duplicated or its note changed.");
  fireEvent.click(screen.getByRole("button", { name: "Open start · Pivot timing" }));
  fireEvent.click(screen.getByRole("button", { name: "Open end · Pivot timing" }));
  expect(seek.mock.calls).toEqual([[2750], [6499]]);
  expect(workspace.save.mock.calls.every(([table]) => ["clips", "presentation_items"].includes(table))).toBe(true);
});

it("retains a failed draft and retry ID, rejects bad ranges and keeps read-only playback available", async () => {
  const { rerender } = render(view());
  fireEvent.change(screen.getByLabelText("Clip title"), { target: { value: "Wing entry" } });
  fireEvent.change(screen.getByLabelText("End / source seconds"), { target: { value: "0" } });
  expect((screen.getByRole("button", { name: "Save clip" }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.change(screen.getByLabelText("End / source seconds"), { target: { value: "3.125" } });
  workspace.save.mockRejectedValueOnce(new Error("Temporary failure"));
  fireEvent.click(screen.getByRole("button", { name: "Save clip" }));
  await screen.findByRole("alert");
  expect((screen.getByLabelText("Clip title") as HTMLInputElement).value).toBe("Wing entry");
  fireEvent.click(screen.getByRole("button", { name: "Save clip" }));
  await screen.findByText("Clip saved in the workspace; synchronization runs when connected.");
  expect(workspace.save.mock.calls[0]![1].id).toBe(workspace.save.mock.calls[1]![1].id);
  workspace.role = "viewer"; rerender(view());
  expect((screen.getByRole("button", { name: "Save clip" }) as HTMLButtonElement).disabled).toBe(true);
  expect((screen.getByRole("button", { name: "Open start · Wing entry" }) as HTMLButtonElement).disabled).toBe(false);
});

it("creates a meeting, suppresses marker actions without media and clears drafts on scope remount", async () => {
  const { rerender } = render(view("first", false));
  expect((screen.getByRole("button", { name: "Mark start here" }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByText("Prepare meeting", { exact: true }));
  fireEvent.change(screen.getByLabelText("New meeting title"), { target: { value: "Opponent preparation" } });
  fireEvent.click(screen.getByRole("button", { name: "Create meeting" }));
  await screen.findByText("Meeting saved; choose the clips to add.");
  expect(screen.getByRole("link", { name: "Open meeting →" }).getAttribute("href")).toMatch(/^\/meetings\//);
  fireEvent.change(screen.getByLabelText("Clip title"), { target: { value: "Private draft" } });
  rerender(view("second", false));
  expect((screen.getByLabelText("Clip title") as HTMLInputElement).value).toBe("");
});
