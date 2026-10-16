import { expect, test, type Page } from "@playwright/test";

export const captureStatisticsView = async (page: Page, name: string) => {
  const viewport = page.viewportSize()!;
  await page.setViewportSize({ width: 1672, height: 941 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: test.info().outputPath(`${name}-desktop.png`),
    fullPage: true,
  });
  await page.getByRole("button", { name: "العربية", exact: true }).click();
  await page.setViewportSize({ width: 375, height: 844 });
  await page
    .locator('[data-slot="session-statistics"]')
    .scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  await page.screenshot({
    path: test.info().outputPath(`${name}-arabic-mobile.png`),
    fullPage: true,
  });
  await page.getByRole("button", { name: "English", exact: true }).click();
  await page.setViewportSize(viewport);
};
