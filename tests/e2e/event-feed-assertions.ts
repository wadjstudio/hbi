import { expect, test, type Page } from "@playwright/test";
export const verifyEventFeed = async (page: Page) => {
  await page.getByRole("tab", { name: "Events", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Session event feed", exact: true }),
  ).toBeVisible();
  const feed = page.locator('[data-slot="event-feed"]');
  await expect(feed.locator("[data-feed-event-id]")).toHaveCount(24);
  await expect(feed.locator(".event-review-state")).toHaveCount(1);
  const selected = feed.locator(
    '[data-feed-event-id="a0000000-0000-4000-8000-000000000201"]',
  );
  await expect(selected).toContainText("Shot · Save");
  await expect(selected).toContainText("Fixture Back Test");
  await selected.getByRole("button", { name: "Evidence", exact: true }).click();
  await expect(
    page
      .getByRole("dialog")
      .locator('[data-event-id="a0000000-0000-4000-8000-000000000201"]'),
  ).toHaveCount(1);
  await page
    .getByRole("button", { name: "Close evidence", exact: true })
    .click();
  await page
    .getByLabel("Event feed filter", { exact: true })
    .selectOption("result:goal");
  await expect(feed.locator("[data-feed-event-id]")).toHaveCount(5);
  await page
    .getByLabel("Event feed filter", { exact: true })
    .selectOption("all");
  const viewport = page.viewportSize()!;
  await page.setViewportSize({ width: 1672, height: 941 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: test.info().outputPath("events-desktop.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "العربية", exact: true }).click();
  await page.setViewportSize({ width: 375, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  await expect(feed.getByRole("button").first()).toHaveCSS(
    "min-height",
    "44px",
  );
  await page.screenshot({
    path: test.info().outputPath("events-arabic-mobile.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "English", exact: true }).click();
  await page.setViewportSize(viewport);
  await page.getByRole("tab", { name: "Analytics", exact: true }).click();
};
