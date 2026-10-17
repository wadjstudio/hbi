import { expect, type Page } from "@playwright/test";

export const verifyIntelligenceLists = async (
  page: Page,
  isArabic = false,
  capturePath?: string,
) => {
  const choose = (ar: string, en: string) => (isArabic ? ar : en);
  const checks = [
    { title: choose("أنماط الهجوم", "Attack patterns"), count: 2, sample: 8 },
    {
      title: choose("استنتاجات بالأدلة", "Evidence-backed insights"),
      count: 1,
      sample: 8,
    },
  ];
  for (const check of checks) {
    const trigger = page.getByRole("button", {
      name: `${choose("عرض الكل", "View all")} · ${check.title} · ${check.count}`,
      exact: true,
    });
    await trigger.focus();
    await trigger.press("Enter");
    const dialog = page.getByRole("dialog", {
      name: `${check.title} · ${choose("كل العناصر", "All items")} (${check.count})`,
      exact: true,
    });
    await expect(dialog).toBeVisible();
    const close = dialog.getByRole("button", {
      name: choose("إغلاق القائمة", "Close intelligence list"),
      exact: true,
    });
    await close.focus();
    await close.press("Shift+Tab");
    expect(
      await dialog.evaluate((element) =>
        element.contains(document.activeElement),
      ),
    ).toBe(true);
    await page.keyboard.press("Tab");
    await expect(close).toBeFocused();
    const box = (await dialog.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize()!.height);
    const region = dialog.getByRole("region");
    await expect(region.locator(".intelligence-evidence-action")).toHaveCount(
      check.count,
    );
    const nativeVideo = page.locator("video");
    const time = await nativeVideo.evaluate(
      (video: HTMLVideoElement) => video.currentTime,
    );
    await region.focus();
    await region.press("ArrowRight");
    expect(
      await nativeVideo.evaluate(
        (video: HTMLVideoElement) => video.currentTime,
      ),
    ).toBe(time);
    await region.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await trigger.press("Enter");
    if (capturePath && check.count === 1)
      await page.screenshot({ path: capturePath });
    const action = region.locator(".intelligence-evidence-action").first();
    expect((await action.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await action.click();
    await expect(dialog).not.toBeVisible();
    const evidence = page.locator(".workbench-evidence");
    await expect(evidence).toBeVisible();
    await expect(evidence.locator(".evidence-source")).toHaveCount(
      check.sample,
    );
    await page
      .getByRole("button", {
        name: choose("إغلاق الأدلة", "Close evidence"),
        exact: true,
      })
      .click();
    await expect(dialog).not.toBeVisible();
  }
};
