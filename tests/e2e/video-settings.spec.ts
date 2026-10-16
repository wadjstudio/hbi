import { test, expect } from "./fixture";
import { openVideoSettings } from "./video-settings-assertions";

test("empty source opens bounded setup with nested keyboard dismissal and Arabic mobile targets", async ({
  page,
}, testInfo) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 1672, height: 941 });
  await page.goto("/login");
  await page.getByLabel("Email").fill("coach@example.test");
  await page.getByLabel("Password").fill("test-password");
  await page.getByRole("button", { name: "Enter SESEN" }).click();
  await expect(page.getByText("HBI Test Club").first()).toBeAttached({
    timeout: 90000,
  });
  await page.getByRole("button", { name: "English", exact: true }).click();
  await page.getByRole("link", { name: "Video Lab", exact: true }).click();
  await page
    .getByLabel("Match", { exact: true })
    .selectOption("50000000-0000-4000-8000-000000000001");
  await page
    .getByRole("button", { name: "Choose video source", exact: true })
    .click();
  const menu = page.locator(".video-settings");
  const trigger = menu.locator(":scope > summary");
  await expect(menu).toHaveAttribute("open");
  await expect(trigger).toBeFocused();
  await page.getByText("Layout & sessions", { exact: true }).click();
  await page.getByRole("button", { name: "Reset layout", exact: true }).focus();
  await page.keyboard.press("Escape");
  await expect(page.locator(".layout-menu")).not.toHaveAttribute("open");
  await expect(menu).toHaveAttribute("open");
  await page.keyboard.press("Escape");
  await expect(menu).not.toHaveAttribute("open");
  await expect(trigger).toBeFocused();
  await openVideoSettings(page);
  await page.screenshot({
    path: testInfo.outputPath("video-settings-1672.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Close video settings", exact: true })
    .click();
  await page.getByRole("button", { name: "العربية", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await openVideoSettings(page);
  const popup = menu.locator(".video-settings-popover");
  const bounds = (await popup.boundingBox())!;
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(844);
  const close = page.getByRole("button", {
    name: "إغلاق إعدادات الفيديو",
    exact: true,
  });
  for (const control of [trigger, close]) {
    const box = (await control.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
  await page.screenshot({
    path: testInfo.outputPath("video-settings-arabic-mobile.png"),
    fullPage: true,
  });
  await page.getByText("العرض والجلسات", { exact: true }).click();
  await page.getByText("جلسات التحليل وإعداداتها", { exact: true }).click();
  await expect(
    page.getByRole("button", { name: "اعتماد للتحليلات المجمعة", exact: true }),
  ).toBeVisible();
  await close.click();
  await expect(menu).not.toHaveAttribute("open");
  await expect(trigger).toBeFocused();
});
