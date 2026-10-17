// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  IntelligenceListCard,
  type IntelligenceListEntry,
} from "@/components/workspace/intelligence-list-card";
vi.mock("@/components/workspace/provider", () => ({
  useWorkspace: () => ({ t: (_ar: string, en: string) => en }),
}));
beforeEach(() => {
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: { configurable: true, value() {} },
    close: { configurable: true, value() {} },
  });
  vi.spyOn(HTMLDialogElement.prototype, "showModal").mockImplementation(
    function (this: HTMLDialogElement) {
      this.open = true;
    },
  );
  vi.spyOn(HTMLDialogElement.prototype, "close").mockImplementation(function (
    this: HTMLDialogElement,
  ) {
    this.open = false;
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
  Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
});
const entries = (): IntelligenceListEntry[] =>
  Array.from({ length: 6 }, (_, i) => ({
    id: String(i),
    title: `Pattern ${i}`,
    code: [
      "cross",
      "custom_term",
      "toString",
      "constructor",
      "__proto__",
      "custom_term",
    ][i],
    detail: `${i + 1}/12 sample possessions`,
    isEvidenceAvailable: i !== 5,
    onEvidence: vi.fn(),
  }));
it("keeps a compact two-pattern preview and exposes all original actions in the scoped list", () => {
  const items = entries();
  render(
    <IntelligenceListCard
      title="Attack patterns"
      entries={items}
      emptyText="Tag a possession"
    />,
  );
  expect(
    screen.getAllByRole("button", { name: /Watch evidence/ }),
  ).toHaveLength(2);
  fireEvent.click(
    screen.getByRole("button", { name: "View all · Attack patterns · 6" }),
  );
  const dialog = screen.getByRole("dialog", {
    name: "Attack patterns · All items (6)",
  });
  expect(
    within(dialog).getAllByRole("button", { name: /Watch evidence/ }),
  ).toHaveLength(6);
  expect(
    within(dialog).getByRole("button", { name: /Pattern 5/ }),
  ).toBeDisabled();
  fireEvent.click(within(dialog).getByRole("button", { name: /Pattern 4/ }));
  expect(items[4]!.onEvidence).toHaveBeenCalledTimes(1);
  expect(items[0]!.onEvidence).not.toHaveBeenCalled();
  expect(dialog).not.toHaveAttribute("open");
});
it("distinguishes reviewed from pending, retains full insight content, and closes explicitly", () => {
  const items = entries().map((entry, i) => ({
    ...entry,
    isReviewed: i === 0,
    body: `Recorded explanation ${i}`,
  }));
  const view = render(
    <IntelligenceListCard
      isInsights
      title="Insights"
      entries={items}
      emptyText="Save evidence"
    />,
  );
  expect(
    view.container.querySelectorAll(
      ".intelligence-list-preview [data-review=pending]",
    ),
  ).toHaveLength(3);
  expect(
    view.container.querySelectorAll(
      ".intelligence-list-preview [data-review=reviewed]",
    ),
  ).toHaveLength(1);
  fireEvent.click(
    screen.getByRole("button", { name: "View all · Insights · 6" }),
  );
  const dialog = screen.getByRole("dialog");
  expect(within(dialog).getByText("Recorded explanation 5")).toBeVisible();
  fireEvent.click(
    within(dialog).getByRole("button", { name: "Close intelligence list" }),
  );
  expect(dialog).not.toHaveAttribute("open");
});
it("shows actionable empty guidance without inventing rows or a view-all count", () => {
  render(
    <IntelligenceListCard
      title="Attack patterns"
      entries={[]}
      emptyText="Tag a possession"
    />,
  );
  expect(screen.getByText("Tag a possession")).toBeVisible();
  expect(screen.queryByRole("button", { name: /View all/ })).toBeNull();
  expect(screen.queryByRole("button", { name: /Watch evidence/ })).toBeNull();
});
