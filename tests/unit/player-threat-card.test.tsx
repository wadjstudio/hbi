// @vitest-environment jsdom
import React from "react";
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  PlayerThreatCard,
  type PlayerThreatEntry,
} from "@/components/workspace/player-threat-card";
vi.mock("@/components/workspace/provider", () => ({
  useWorkspace: () => ({ t: (_ar: string, en: string) => en }),
}));
beforeEach(() => {
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: {
      configurable: true,
      value() {
        this.open = true;
      },
    },
    close: {
      configurable: true,
      value() {
        this.open = false;
      },
    },
  });
});
afterEach(() => {
  cleanup();
  Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
  Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
});
const entries = (): PlayerThreatEntry[] =>
  Array.from({ length: 5 }, (_, i) => ({
    id: String(i),
    name: `Recorded player ${i}`,
    number: String(10 + i),
    summary:
      i === 4
        ? { sample: 0, goals: 0, pending: 1, efficiency: null }
        : { sample: 4, goals: 1, pending: 0, efficiency: 0.25 },
    onAll: vi.fn(),
    onReviewed: vi.fn(),
  }));
it("shows four summary previews and retains every scoped player with distinct pending/reviewed evidence", () => {
  const items = entries();
  const view = render(
    <PlayerThreatCard title="Player threats" entries={items} isSummary />,
  );
  expect(
    view.container.querySelectorAll(
      ".player-threat-preview .player-threat-row",
    ),
  ).toHaveLength(4);
  fireEvent.click(
    screen.getByRole("button", {
      name: "View all players · Player threats · 5",
    }),
  );
  const dialog = screen.getByRole("dialog");
  expect(dialog.querySelectorAll(".player-threat-row")).toHaveLength(5);
  expect(
    within(dialog).getByRole("button", {
      name: "Recorded player 4 · Shooting efficiency · — · 0/0",
    }),
  ).toBeDisabled();
  fireEvent.click(
    within(dialog).getByRole("button", {
      name: "Recorded player 4 · All attempts",
    }),
  );
  expect((dialog as HTMLDialogElement).open).toBe(false);
  expect(items[4]!.onAll).toHaveBeenCalledOnce();
  expect(items[4]!.onReviewed).not.toHaveBeenCalled();
  fireEvent.click(
    screen.getByRole("button", {
      name: "View all players · Player threats · 5",
    }),
  );
  fireEvent.click(
    within(dialog).getByRole("button", {
      name: "Recorded player 3 · Shooting efficiency · 25.0% · 1/4",
    }),
  );
  expect((dialog as HTMLDialogElement).open).toBe(false);
  expect(items[3]!.onReviewed).toHaveBeenCalledOnce();
  expect(items[3]!.onAll).not.toHaveBeenCalled();
});
it("keeps three rail highlights and an explicit close action", () => {
  const view = render(
    <PlayerThreatCard title="Players in sample" entries={entries()} />,
  );
  expect(
    view.container.querySelectorAll(
      ".player-threat-preview .player-threat-row",
    ),
  ).toHaveLength(3);
  fireEvent.click(screen.getByRole("button", { name: /View all players/ }));
  fireEvent.click(screen.getByRole("button", { name: "Close player list" }));
  expect(view.container.querySelector("dialog")!.open).toBe(false);
});
it("keeps empty players actionable through honest guidance without inventing a list", () => {
  render(<PlayerThreatCard title="Players in sample" entries={[]} />);
  expect(
    screen.queryByRole("button", { name: /View all players/ }),
  ).not.toBeInTheDocument();
  expect(screen.getByText(/Link shooters to attempts/)).toBeVisible();
});
