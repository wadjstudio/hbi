import { expect, type Page } from "@playwright/test";
export const verifyAnnotations = async (page: Page) => {
  await page.getByRole("tab", { name: "Annotations", exact: true }).click();
  const library = page.locator('[data-slot="annotation-library"]');
  await expect(library.locator("article")).toHaveCount(2);
  const first = library.locator("article").first();
  await expect(first).toContainText("Pause on entry");
  await first.getByRole("button", { name: "Edit", exact: true }).click();
  const draft = page.locator('.video-surface [data-slot="drawing-editor"]');
  await expect(draft).toHaveCount(1); // editing hides the old saved rendering
  await draft.locator("summary").click();
  const object = draft.getByRole("button", {
    name: "1 · Arrow · Fixture cross",
    exact: true,
  });
  await object.click();
  await expect(draft.getByLabel("Color", { exact: true })).toHaveValue(
    "#00cccc",
  );
  const mediaTime = await page
    .locator("video")
    .evaluate((video: HTMLVideoElement) => video.currentTime);
  await object.press("Shift+ArrowRight");
  await expect(draft.locator("g path").first()).toHaveAttribute(
    "d",
    "M350 200 L 550 250",
  );
  expect(
    await page
      .locator("video")
      .evaluate((video: HTMLVideoElement) => video.currentTime),
  ).toBeCloseTo(mediaTime, 1);
  await draft.locator("summary").click();
  await page.screenshot({
    path: "test-results/annotation-editor-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Save drawing", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Save drawing", exact: true }),
  ).toHaveCount(0);
  await expect(first.locator("g path").first()).toHaveAttribute(
    "d",
    "M350 200 L 550 250",
  );
  await page.locator("video").evaluate((video: HTMLVideoElement) => {
    video.currentTime = 11;
  });
  await expect(
    page.locator('.video-surface [data-slot="drawing-editor"]'),
  ).toHaveCount(0);
  await first.getByRole("button", { name: "View frame", exact: true }).click();
  expect(
    await page
      .locator("video")
      .evaluate((video: HTMLVideoElement) => video.paused),
  ).toBe(true);
  await expect(
    page.locator('.video-surface [data-slot="drawing-editor"]'),
  ).toHaveCount(1);
  await page.screenshot({
    path: "test-results/annotations-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "العربية", exact: true }).click();
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(library.locator("article")).toHaveCount(2);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  for (const button of await first.getByRole("button").all())
    expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await page.screenshot({
    path: "test-results/annotations-arabic-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "English", exact: true }).click();
  await page.setViewportSize({ width: 1672, height: 941 });
  await page.getByRole("tab", { name: "Analytics", exact: true }).click();
};
