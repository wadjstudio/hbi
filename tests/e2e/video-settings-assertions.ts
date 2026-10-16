import { expect, type Page } from "@playwright/test";

export const openVideoSettings = async (page: Page) => {
  const menu = page.locator(".video-settings");
  if ((await menu.getAttribute("open")) === null)
    await menu.locator(":scope > summary").click();
  await expect(menu.locator(".video-settings-popover")).toBeVisible();
};

export const verifyVideoSettings = async (page: Page) => {
  const menu = page.locator(".video-settings");
  const trigger = menu.locator(":scope > summary");
  await trigger.focus();
  await trigger.press("Space");
  await expect(menu).toHaveAttribute("open");
  const popup = menu.locator(".video-settings-popover");
  const bounds = (await popup.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height);
  await expect(menu.locator('input[type="file"]')).toBeAttached();
  await expect(menu.locator(".file-button")).toBeVisible();
  await menu.locator(".source-options > summary").click();
  const input = menu.locator('input[type="url"]');
  await input.focus();
  await input.press("ArrowRight");
  await input.press("Escape");
  await expect(menu).not.toHaveAttribute("open");
  await expect(trigger).toBeFocused();
};
