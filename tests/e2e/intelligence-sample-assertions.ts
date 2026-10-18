import { expect, type Page } from "@playwright/test";

export const verifyIntelligenceSample = async (
  page: Page,
  isArabic = false,
  capturePath?: string,
) => {
  const choose = (ar: string, en: string) => (isArabic ? ar : en);
  const trigger = page.locator(".intelligence-sample > summary");
  await expect(trigger).toHaveText("n=12");
  await trigger.focus();
  await trigger.press("Space");
  const content = page.getByRole("region", {
    name: choose("تفاصيل عينة التحليل", "Intelligence sample details"),
    exact: true,
  });
  await expect(content).toBeVisible();
  if (capturePath) await page.screenshot({ path: capturePath });
  const bounds = (await content.boundingBox())!;
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  );
  const video = page.locator("video");
  const before = await video.evaluate((v: HTMLVideoElement) => v.currentTime);
  await content.focus();
  await content.press("ArrowRight");
  expect(await video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBe(
    before,
  );
  await content.press("Escape");
  await expect(content).not.toBeVisible();
  await expect(trigger).toBeFocused();
  for (const [label, expected] of [
    [
      choose("كفاءة التصويب", "Shot efficiency"),
      [201, 203, 207, 209, 211, 213, 217, 219, 221, 223],
    ],
    [
      choose("حجم العينة", "Sample size"),
      [201, 203, 205, 207, 209, 211, 213, 215, 217, 219, 221, 223],
    ],
  ] as const) {
    await trigger.press("Space");
    await content.getByRole("button", { name: new RegExp(label) }).click();
    const evidence = page.locator(".workbench-evidence");
    await expect(evidence.locator("[data-event-id]")).toHaveCount(
      expected.length,
    );
    for (const number of expected)
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
    await expect(content).not.toBeVisible();
  }
  await trigger.focus();
  await trigger.press("Space");
  await expect(
    content.getByRole("link", {
      name: choose("مساحة تحليل الخصم", "Opponent workspace"),
    }),
  ).toHaveAttribute("href", "/opponents");
  await content.locator("[data-goalkeeper-id]").first().click();
  const keeperEvidence = page.locator(".workbench-evidence");
  await expect(keeperEvidence.locator("[data-event-id]")).toHaveCount(5);
  for (const number of [202, 206, 212, 216, 222])
    await expect(
      keeperEvidence.locator(
        `[data-event-id="a0000000-0000-4000-8000-${String(number).padStart(12, "0")}"]`,
      ),
    ).toHaveCount(1);
  await page
    .getByRole("button", {
      name: choose("إغلاق الأدلة", "Close evidence"),
      exact: true,
    })
    .click();
  await expect(content).not.toBeVisible();
  await trigger.focus();
  await trigger.press("Space");
  await page
    .getByRole("tab", { name: choose("الإحصاءات", "Analytics"), exact: true })
    .focus();
  await expect(content).not.toBeVisible();
};
