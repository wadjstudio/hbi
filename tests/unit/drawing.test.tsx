// @vitest-environment jsdom
import React, { useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DrawingEditor } from "@/components/workspace/drawing";
import { AnnotationLibrary } from "@/components/workspace/annotation-library";
import { moveDrawing } from "@/features/tactics/drawing-motion";
import type { Drawing, Row } from "@/types/workspace";
vi.mock("@/components/workspace/provider", () => ({
  useWorkspace: () => ({ t: (_ar: string, en: string) => en }),
}));
afterEach(cleanup);
const arrow: Drawing = {
  id: "a0000000-0000-4000-8000-000000000001",
  kind: "arrow",
  label: "Cross",
  color: "#00cccc",
  x: 0.3,
  y: 0.4,
  x2: 0.5,
  y2: 0.5,
};
it("moves a whole arrow without changing its vector, clamping both anchors at edges", () => {
  const moved = moveDrawing(arrow, 0.8, -0.9);
  expect(moved.x).toBeCloseTo(0.8);
  expect(moved.x2).toBe(1);
  expect(moved.y).toBe(0);
  expect(moved.y2).toBeCloseTo(0.1);
  expect(moved.id).toBe(arrow.id);
});
it("selects without rewriting style, moves with keyboard, and prevents accidental creation in Select mode", () => {
  const change = vi.fn();
  const Harness = () => {
    const [objects, setObjects] = useState([arrow]);
    return (
      <DrawingEditor
        objects={objects}
        onChange={(next) => {
          change(next);
          setObjects(next);
        }}
      />
    );
  };
  render(<Harness />);
  fireEvent.click(screen.getByText("Objects · 1"));
  const item = screen.getByRole("button", { name: "1 · Arrow · Cross" });
  fireEvent.click(item);
  expect((screen.getByLabelText("Color") as HTMLInputElement).value).toBe(
    "#00cccc",
  );
  fireEvent.keyDown(item, { key: "ArrowRight", shiftKey: true });
  expect(change.mock.calls[0]![0][0].x).toBeCloseTo(0.35);
  expect(change.mock.calls[0]![0][0].x2).toBeCloseTo(0.55);
  fireEvent.click(screen.getByRole("img", { name: "Tactical drawing" }));
  expect(change).toHaveBeenCalledTimes(1);
  fireEvent.change(screen.getByLabelText("Label"), {
    target: { value: "Updated" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Update selected" }));
  expect(change.mock.calls[1]![0][0].label).toBe("Updated");
});
it("shows only the exact source/session layers and keeps view actions available to read-only users", () => {
  const row: Row = {
    id: "layer",
    organization_id: "org",
    analysis_session_id: "session",
    video_id: "video",
    start_ms: 1000,
    end_ms: 3000,
    objects: [arrow],
    pause_on_entry: true,
  };
  const onSeek = vi.fn();
  render(
    <AnnotationLibrary
      rows={[
        row,
        { ...row, id: "wrong-video", video_id: "other" },
        { ...row, id: "wrong-org", organization_id: "other" },
        { ...row, id: "wrong-session", analysis_session_id: "other" },
      ]}
      organizationId="org"
      sessionId="session"
      videoId="video"
      isCanEdit={false}
      isCanSeek
      onSeek={onSeek}
      onEdit={vi.fn()}
      onRemove={vi.fn()}
    />,
  );
  expect(screen.getAllByRole("article")).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "View frame" }));
  expect(onSeek).toHaveBeenCalledWith(row);
  expect(
    (screen.getByRole("button", { name: "Edit" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  expect(
    (screen.getByRole("button", { name: "Delete" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
});
