import { expect, type Page } from "@playwright/test";

export const verifyPlayerLists = async (
  page: Page,
  isArabic: boolean,
  capture?: string,
) => {
  const choose = (ar: string, en: string) => (isArabic ? ar : en);
  const check = async (ids: number[]) => {
    const evidence = page.locator(".workbench-evidence");
    await expect(evidence.locator("[data-event-id]")).toHaveCount(ids.length);
    for (const number of ids)
      await expect(
        evidence.locator(
          `[data-event-id="a0000000-0000-4000-8000-${String(number).padStart(12, "0")}"]`,
        ),
      ).toHaveCount(1);
    await page
      .getByRole("button", {
        name: choose("إغلاق الأدلة", "Close evidence"),
        exact: true,
      })
      .click();
  };
  for (const [selector, count] of [
    [".session-rail > .player-threat-card", 3],
    [".match-dashboard > .player-threat-card", 4],
  ] as const) {
    const card = page.locator(selector);
    await expect(
      card.locator(".player-threat-preview .player-threat-row"),
    ).toHaveCount(count);
    const trigger = card.getByRole("button", {
      name: new RegExp(choose("عرض كل اللاعبين", "View all players")),
    });
    await trigger.click();
    const dialog = page.getByRole("dialog", {
      name: new RegExp(choose("كل اللاعبين", "All players")),
    });
    await expect(dialog.locator(".player-threat-row")).toHaveCount(5);
    const box = (await dialog.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize()!.height);
    const close = dialog.getByRole("button", {
      name: choose("إغلاق قائمة اللاعبين", "Close player list"),
      exact: true,
    });
    const pending = dialog.locator(".player-threat-row").last();
    await expect(
      pending.getByRole("button", {
        name: new RegExp(choose("كفاءة التصويب", "Shooting efficiency")),
      }),
    ).toBeDisabled();
    const last = pending.getByRole("button", {
      name: new RegExp(choose("كل المحاولات", "All attempts")),
    });
    await expect(last).toContainText("اسم لاعب تجريبي طويل");
    await last.focus();
    await last.press("Tab");
    await expect(close).toBeFocused();
    await close.press("Shift+Tab");
    await expect(last).toBeFocused();
    const time = await page
      .locator("video")
      .evaluate((video: HTMLVideoElement) => video.currentTime);
    await dialog.getByRole("region").focus();
    await page.keyboard.press("ArrowRight");
    expect(
      await page
        .locator("video")
        .evaluate((video: HTMLVideoElement) => video.currentTime),
    ).toBe(time);
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await trigger.click();
    if (capture && selector.startsWith(".match-dashboard"))
      await dialog.screenshot({ path: capture });
    await last.click();
    await expect(dialog).not.toBeVisible();
    await check([223]);
    await trigger.click();
    await dialog
      .getByRole("button", {
        name: new RegExp(
          "Fixture extra shooter Test.*" +
            choose("كفاءة التصويب", "Shooting efficiency"),
        ),
      })
      .click();
    await expect(dialog).not.toBeVisible();
    await check([209, 219]);
  }
};
