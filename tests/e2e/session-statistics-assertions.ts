import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { captureStatisticsView } from "./statistics-view-captures";

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
  await captureStatisticsView(page, "team-statistics");
  await page.getByRole("tab", { name: "Comparison", exact: true }).click();
  const comparison = page.getByRole("region", {
    name: "Team comparison",
    exact: true,
  });
  await expect(comparison.locator(".session-comparison > article")).toHaveCount(
    2,
  );
  await expect(
    comparison.locator("article").filter({
      has: page.getByRole("heading", { name: "Away", exact: true }),
    }),
  ).toContainText("22.2%");
  await captureStatisticsView(page, "team-comparison");
  await page.getByRole("tab", { name: "Player stats", exact: true }).click();
  const players = page.getByRole("region", {
    name: "Player & goalkeeper statistics",
    exact: true,
  });
  await expect(players.getByRole("row")).toHaveCount(5);
  await expect(page.locator(".match-dashboard")).toHaveCount(0);
  const beforeTableKey = await page
    .getByTestId("video")
    .evaluate((node: HTMLVideoElement) => node.currentTime);
  await players
    .getByRole("region", { name: "Player statistics table", exact: true })
    .focus();
  await page.keyboard.press("ArrowRight");
  expect(
    await page
      .getByTestId("video")
      .evaluate((node: HTMLVideoElement) => node.currentTime),
  ).toBe(beforeTableKey);
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
  const verifyPlayerEvidence = async (name: string, eventNumbers: number[]) => {
    await players.getByRole("button", { name, exact: true }).click();
    const evidence = page.getByRole("dialog", { name, exact: true });
    await expect(evidence.locator("[data-event-id]")).toHaveCount(
      eventNumbers.length,
    );
    for (const number of eventNumbers) {
      const id = `a0000000-0000-4000-8000-${String(number).padStart(12, "0")}`;
      await expect(evidence.locator(`[data-event-id="${id}"]`)).toHaveCount(1);
    }
    await page
      .getByRole("button", { name: "Close evidence", exact: true })
      .click();
  };
  await verifyPlayerEvidence(
    "Fixture Back Test · Efficiency",
    [201, 207, 213, 219],
  );
  await verifyPlayerEvidence(
    "Fixture Away Keeper Test · Saves / faced",
    [202, 206, 212, 216, 222],
  );
  const intervals = players.getByLabel(
    "Fixture Back Test · On-court intervals",
    { exact: true },
  );
  await intervals.click();
  await expect(players.locator(".player-stints[open]")).toContainText(
    "No recorded intervals.",
  );
  await intervals.click();
  const keeperIntervals = players.getByLabel(
    "Fixture Away Keeper Test · On-court intervals",
    { exact: true },
  );
  await keeperIntervals.click();
  const stints = players.locator(".player-stints[open]");
  await expect(stints).toContainText("Period 1 · GK");
  await expect(stints).toContainText("0:00 – 0:30");
  await expect(stints).toContainText("Open interval");
  await expect(keeperIntervals).toContainText("—");
  const viewport = page.viewportSize()!;
  await page.setViewportSize({ width: 1672, height: 941 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: test.info().outputPath("player-statistics-desktop.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "العربية", exact: true }).click();
  await page.setViewportSize({ width: 375, height: 844 });
  const arabicPlayers = page.locator('[data-slot="session-statistics"]');
  await arabicPlayers.scrollIntoViewIfNeeded();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(
    (await arabicPlayers
      .locator(".player-stints > summary")
      .first()
      .boundingBox())!.height,
  ).toBeGreaterThanOrEqual(44);
  await page.screenshot({
    path: test.info().outputPath("player-statistics-arabic-mobile.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "English", exact: true }).click();
  await page.setViewportSize(viewport);
  await keeperIntervals.click();
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
  await expect(report.locator(".report-insight")).toHaveCount(1);
  await expect(report.locator(".report-insight")).toContainText("Needs review");
  await report
    .getByRole("button", { name: "Watch evidence", exact: true })
    .click();
  const insightEvidence = page.getByRole("dialog", {
    name: "Fixture cross sample",
    exact: true,
  });
  await expect(insightEvidence.locator("[data-event-id]")).toHaveCount(8);
  await page
    .getByRole("button", { name: "Close evidence", exact: true })
    .click();
  await captureStatisticsView(page, "coach-report");
  await page.emulateMedia({ media: "print" });
  await expect(report).toBeVisible();
  await expect(report.locator(".session-metric").first()).toBeVisible();
  await expect(page.locator(".analysis-split")).toBeHidden();
  await expect(report.locator(".report-register")).toBeHidden();
  await page.pdf({
    path: test.info().outputPath("session-report-en-brief.pdf"),
    preferCSSPageSize: true,
    printBackground: true,
  });
  await page.emulateMedia({ media: "screen" });
  await report
    .getByRole("checkbox", {
      name: "Include event register in PDF",
      exact: true,
    })
    .check();
  await expect(report.locator("[data-report-event-id]")).toHaveCount(12);
  await report
    .getByRole("button", { name: "Open evidence 1", exact: true })
    .click();
  await expect(
    page
      .getByRole("dialog")
      .locator('[data-event-id="a0000000-0000-4000-8000-000000000201"]'),
  ).toHaveCount(1);
  await page
    .getByRole("button", { name: "Close evidence", exact: true })
    .click();
  await page.emulateMedia({ media: "print" });
  await expect(report.locator(".report-register")).toBeVisible();
  await page.pdf({
    path: test.info().outputPath("session-report-en-evidence.pdf"),
    preferCSSPageSize: true,
    printBackground: true,
  });
  await page.emulateMedia({ media: "screen" });
  await page.getByRole("button", { name: "العربية", exact: true }).click();
  await page.emulateMedia({ media: "print" });
  await page.pdf({
    path: test.info().outputPath("session-report-ar-evidence.pdf"),
    preferCSSPageSize: true,
    printBackground: true,
  });
  await page.emulateMedia({ media: "screen" });
  await page.getByRole("button", { name: "English", exact: true }).click();
  await page.getByRole("tab", { name: "Analytics", exact: true }).click();
  await expect(page.locator(".match-dashboard")).toBeVisible();
};
