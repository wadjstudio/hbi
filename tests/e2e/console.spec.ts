import { test, expect } from "./fixture";
test("analysis console supports resizing, focus, keyboard tabs and narrow screens", async ({
  page,
}, testInfo) => {
  test.setTimeout(300000);
  await page.setViewportSize({ width: 1560, height: 900 });
  await page.goto("/login");
  await page.getByLabel("Email").fill("coach@example.test");
  await page.getByLabel("Password").fill("test-password");
  await page.getByRole("button", { name: "Enter HBI" }).click();
  await expect(page.getByText("HBI Test Club").first()).toBeAttached({
    timeout: 90000,
  });
  await page.getByRole("button", { name: "English", exact: true }).click();
  await page.getByRole("link", { name: "Video Lab", exact: true }).click();
  await expect(page).toHaveURL(/\/video-lab$/, { timeout: 90000 });
  await page
    .getByLabel("Match", { exact: true })
    .selectOption("50000000-0000-4000-8000-000000000001");
  const video = page.getByTestId("video"),
    rail = page.getByTestId("intelligence");
  const initial = (await video.boundingBox())!.width;
  const separator = page.getByRole("separator", {
    name: "Resize video and evidence",
  });
  await separator.focus();
  await separator.press("ArrowLeft");
  await expect
    .poll(async () => (await video.boundingBox())!.width)
    .toBeLessThan(initial);
  await page.getByRole("button", { name: "Focus video", exact: true }).click();
  await expect(rail).toBeHidden();
  await expect
    .poll(async () => (await video.boundingBox())!.width)
    .toBeGreaterThan(initial);
  await page
    .getByRole("button", { name: "Video & evidence", exact: true })
    .click();
  await page.getByRole("button", { name: "Reset layout", exact: true }).click();
  await expect(rail).toBeVisible();
  await page.getByRole("tab", { name: "events", exact: true }).focus();
  await page
    .getByRole("tab", { name: "events", exact: true })
    .press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "analytics", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel")).toContainText("Shot efficiency");
  await expect(page.locator(".dashboard-card")).toHaveCount(5);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: testInfo.outputPath("console-wide.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "العربية", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await page.screenshot({
    path: testInfo.outputPath("console-arabic.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    )
    .toBe(true);
  await expect(separator).toBeHidden();
  await expect(rail).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("console-mobile.png"),
    fullPage: true,
  });
});
