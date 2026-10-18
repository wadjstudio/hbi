import { expect, type Page } from "@playwright/test";

export const verifyIntelligenceCharts = async (
  page: Page,
  isArabic = false,
) => {
  const choose = (ar: string, en: string) => (isArabic ? ar : en);
  const check = async (ids: number[]) => {
    const dialog = page.locator(".workbench-evidence");
    await expect(dialog.locator("[data-event-id]")).toHaveCount(ids.length);
    for (const id of ids)
      await expect(
        dialog.locator(
          `[data-event-id="a0000000-0000-4000-8000-${String(id).padStart(12, "0")}"]`,
        ),
      ).toHaveCount(1);
    await page
      .getByRole("button", {
        name: choose("إغلاق الأدلة", "Close evidence"),
        exact: true,
      })
      .click();
  };
  const defense = page.locator(".defense-main-action");
  await expect(defense).toHaveAccessibleName(new RegExp("6:0.*66.7%.*8/12"));
  expect((await defense.boundingBox())!.width).toBeCloseTo(106, 0);
  await defense.focus();
  await defense.press("Enter");
  await check([202, 204, 208, 210, 214, 216, 220, 222]);
  const zones = page.getByRole("group", {
    name: choose("مناطق التصويب المسجلة", "Recorded shot zones"),
    exact: true,
  });
  await expect(zones.getByRole("button")).toHaveCount(6);
  for (const [label, ids] of [
    [choose("9م يمين", "Right 9m"), [207, 217]],
    [choose("الجناح الأيمن", "Right wing"), [201, 211, 221]],
    [choose("الدائرة", "Pivot"), [203, 213, 223]],
  ] as const) {
    await zones.getByRole("button", { name: new RegExp(label) }).click();
    await check([...ids]);
  }
  await page.locator(".shot-penalty-share").click();
  await check([209, 219]);
  for (const button of await zones.getByRole("button").all())
    expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(
      page.viewportSize()!.width < 1200 ? 44 : 24,
    );
  const method = page.locator(".shot-zones-method > summary");
  await expect(method).toHaveAccessibleName(new RegExp("10/10.*0"));
  await method.focus();
  await method.press("Space");
  const notes = page.getByRole("region", {
    name: choose("طريقة مناطق التصويب", "Shot zone method"),
    exact: true,
  });
  const time = await page
    .locator("video")
    .evaluate((video: HTMLVideoElement) => video.currentTime);
  await notes.focus();
  await notes.press("ArrowRight");
  expect(
    await page
      .locator("video")
      .evaluate((video: HTMLVideoElement) => video.currentTime),
  ).toBe(time);
  await notes.press("Escape");
  await expect(notes).not.toBeVisible();
  await expect(method).toBeFocused();
};
