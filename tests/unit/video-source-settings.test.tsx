// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { VideoSourceSettings } from "@/components/workspace/video-source-settings";

const workspace = vi.hoisted(() => ({
  online: true,
  role: "owner",
  lang: "en",
}));
vi.mock("@/components/workspace/provider", () => ({
  useWorkspace: () => ({ ...workspace, t: (_ar: string, en: string) => en }),
}));
afterEach(() => {
  cleanup();
  workspace.online = true;
  workspace.role = "owner";
});
const setup = () => {
  const callbacks = { onFile: vi.fn(), onOnline: vi.fn() };
  const view = render(
    <VideoSourceSettings
      {...callbacks}
      layoutControls={<span>Session controls</span>}
      isLinked={false}
      isReference
      isBusy={false}
    />,
  );
  view.container.querySelector("details")!.open = true;
  view.container.querySelector<HTMLDetailsElement>(".source-options")!.open =
    true;
  return { ...callbacks, ...view };
};
it("routes the selected file and YouTube URL to the existing attach callbacks, with Escape focus return", () => {
  const view = setup();
  const file = new File(["local"], "match.mp4", { type: "video/mp4" });
  fireEvent.change(screen.getByLabelText("Select local video"), {
    target: { files: [file] },
  });
  expect(view.onFile).toHaveBeenCalledWith(file);
  const input = screen.getByLabelText("YouTube video URL");
  fireEvent.change(input, {
    target: { value: "https://www.youtube.com/watch?v=abcdefghijk" },
  });
  fireEvent.submit(input.closest("form")!);
  expect(view.onOnline).toHaveBeenCalledWith(
    "https://www.youtube.com/watch?v=abcdefghijk",
  );
  input.focus();
  fireEvent.keyDown(input, { key: "Escape" });
  expect(view.container.querySelector("details")!.open).toBe(false);
  expect(document.activeElement?.getAttribute("aria-label")).toBe(
    "Video settings",
  );
});
it("retains local file access while disabling online attachment for offline and viewer contexts", () => {
  workspace.online = false;
  const view = setup();
  expect(
    (screen.getByRole("button", { name: "Attach source" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  expect(
    (screen.getByLabelText("Select local video") as HTMLInputElement).disabled,
  ).toBe(false);
  workspace.online = true;
  workspace.role = "viewer";
  view.rerender(
    <VideoSourceSettings
      onFile={view.onFile}
      onOnline={view.onOnline}
      layoutControls={null}
      isLinked
      isReference
      isBusy={false}
    />,
  );
  const official = screen.getByRole("button", {
    name: "Analyze official recording · YouTube",
  });
  expect((official as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(official);
  expect(view.onOnline).not.toHaveBeenCalled();
});
