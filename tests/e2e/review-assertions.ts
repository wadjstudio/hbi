import { expect, type Page } from "@playwright/test";
export const verifyReview = async (page: Page) => {
  await page.getByRole("button", { name: "English", exact: true }).click();
  await page.setViewportSize({ width: 1672, height: 941 });
  await page
    .locator(".workbench-filters")
    .getByRole("button", { name: "All", exact: true })
    .click();
  await page.getByRole("tab", { name: "Review", exact: true }).click();
  const queue = page.locator('[data-slot="review-queue"]');
  await expect(queue.locator("article")).toHaveCount(2);
  const pending = queue.locator('[data-review-status="result"]');
  await expect(
    pending.getByRole("button", { name: "Close legacy review", exact: true }),
  ).toBeDisabled();
  await pending.getByRole("button", { name: "Evidence", exact: true }).click();
  const evidence = page.getByRole("dialog", {
    name: "Review evidence",
    exact: true,
  });
  await expect(evidence.locator(".evidence-source")).toHaveCount(1);
  await expect(evidence.locator(".evidence-source")).toHaveAttribute(
    "data-event-id",
    "a0000000-0000-4000-8000-000000000223",
  );
  await page
    .getByRole("button", { name: "Close evidence", exact: true })
    .click();
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({
    path: "test-results/review-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "العربية", exact: true }).click();
  await page.setViewportSize({ width: 375, height: 812 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  for (const button of await pending.getByRole("button").all())
    expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await page.screenshot({
    path: "test-results/review-arabic-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "English", exact: true }).click();
  await page.setViewportSize({ width: 1672, height: 941 });
  await pending
    .getByRole("button", { name: "Correct attempt", exact: true })
    .click();
  await expect(
    page.getByRole("tab", { name: "Events", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByRole("combobox", { name: "Result", exact: true }),
  ).toHaveValue("unknown");
  await page
    .getByRole("combobox", { name: "Result", exact: true })
    .selectOption("goal");
  await page
    .getByRole("button", { name: "Save event [T]", exact: true })
    .click();
  await page.getByRole("tab", { name: "Review", exact: true }).click();
  const corrected = queue.locator(
    '[data-review-event-id="a0000000-0000-4000-8000-000000000223"]',
  );
  await expect(corrected).toHaveAttribute("data-review-status", "ready");
  await corrected
    .getByRole("button", { name: "Close legacy review", exact: true })
    .click();
  await expect(corrected).toHaveCount(0);
  await expect(queue.locator("article")).toHaveCount(1);
};
