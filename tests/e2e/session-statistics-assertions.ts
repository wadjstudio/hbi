import { readFile } from "node:fs/promises";
import { expect, type Page } from "@playwright/test";

export const verifySessionStatistics = async (page: Page) => {
  await page.getByRole("tab", { name: "Team stats", exact: true }).click();
  const team = page.getByRole("region", {
    name: "Team statistics",
    exact: true,
  });
  await expect(team).toContainText("One session · current filters");
  const efficiency = team
    .locator(".session-metric")
    .filter({ hasText: "Shot efficiency" });
  await expect(efficiency.locator("strong")).toHaveText("22.2%");
  await expect(efficiency).toContainText("n=9");
  await efficiency.click();
  await expect(
    page
      .getByRole("dialog", { name: "Shot efficiency", exact: true })
      .locator(".evidence-source"),
  ).toHaveCount(9);
  await page
    .getByRole("button", { name: "Close evidence", exact: true })
    .click();
  await page.getByRole("tab", { name: "Comparison", exact: true }).click();
  const comparison = page.getByRole("region", {
    name: "Team comparison",
    exact: true,
  });
  await expect(comparison.locator(".session-comparison > article")).toHaveCount(
    2,
  );
  await expect(
    comparison
      .locator("article")
      .filter({
        has: page.getByRole("heading", { name: "Away", exact: true }),
      }),
  ).toContainText("22.2%");
  await page.getByRole("tab", { name: "Player stats", exact: true }).click();
  const players = page.getByRole("region", {
    name: "Player & goalkeeper statistics",
    exact: true,
  });
  await expect(players.getByRole("row")).toHaveCount(5);
  await expect(
    players.getByRole("row").filter({ hasText: "Fixture Back Test" }),
  ).toContainText("1 / 4");
  // Profile positions are not inferred when match observations lack positions.
  await expect(
    players
      .getByRole("row")
      .filter({ hasText: "Fixture Back Test" })
      .locator("td")
      .first(),
  ).toHaveText("—");
  await page.getByRole("tab", { name: "Reports", exact: true }).click();
  const report = page.getByRole("region", {
    name: "Current session report",
    exact: true,
  });
  await expect(report).toContainText("Selected events");
  const csv = async () => {
    const completed = page.waitForEvent("download");
    await report
      .getByRole("button", { name: "Export sample shots CSV", exact: true })
      .click();
    const download = await completed;
    expect(download.suggestedFilename()).toContain(
      "50000000-0000-4000-8000-000000000001",
    );
    return readFile((await download.path())!, "utf8");
  };
  const all = await csv();
  expect(all.split("\r\n")).toHaveLength(11);
  expect(all).toContain("analysis_session_id");
  await page.getByRole("button", { name: "Goals", exact: true }).click();
  const goals = await csv();
  expect(goals.split("\r\n")).toHaveLength(3);
  expect(goals).not.toContain('"unknown"');
  await page.getByRole("button", { name: "All", exact: true }).click();
  await page.emulateMedia({ media: "print" });
  await expect(report).toBeVisible();
  await expect(report.locator(".session-metric").first()).toBeVisible();
  await expect(page.locator(".analysis-split")).toBeHidden();
  await page.emulateMedia({ media: "screen" });
  await page.getByRole("tab", { name: "Analytics", exact: true }).click();
};
