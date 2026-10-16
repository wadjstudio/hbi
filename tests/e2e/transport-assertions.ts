import { expect, type Page } from "@playwright/test";

export const verifyTransport = async (page: Page) => {
  const controls = page.locator(".video-transport");
  const isArabic = (await page.locator("html").getAttribute("lang")) === "ar";
  const seek = controls.getByRole("slider", {
    name: isArabic ? "وقت الفيديو" : "Video time",
    exact: true,
  });
  const box = (await seek.boundingBox())!;
  expect(box.width).toBeGreaterThan(150);
  for (const button of await controls.getByRole("button").all()) {
    const bounds = (await button.boundingBox())!;
    expect(bounds.height).toBeGreaterThanOrEqual(32);
    expect(bounds.width).toBeGreaterThanOrEqual(32);
  }
  const tags = page.locator(
    ".quick-tag-buttons > button, .quick-tag-buttons > .tag-transition",
  );
  const bounds = await Promise.all(
    (await tags.all()).map((tag) => tag.boundingBox()),
  );
  expect(bounds).toHaveLength(9);
  for (const tag of bounds) {
    expect(tag!.height).toBeGreaterThanOrEqual(36);
    expect(tag!.y).toBeCloseTo(bounds[0]!.y, 0);
  }
  if (!(await page.locator("video").count())) return;
  const media = page.locator("video");
  const original = await media.evaluate((v: HTMLVideoElement) => v.currentTime);
  const duration = await media.evaluate((v: HTMLVideoElement) => v.duration);
  await seek.click({ position: { x: box.width / 2, y: box.height / 2 } });
  await expect
    .poll(() => media.evaluate((v: HTMLVideoElement) => v.currentTime))
    .toBeCloseTo(duration / 2, 0);
  await seek.press("Home");
  await expect
    .poll(() => media.evaluate((v: HTMLVideoElement) => v.currentTime))
    .toBeCloseTo(0, 1);
  await seek.press("ArrowRight");
  await expect
    .poll(() => media.evaluate((v: HTMLVideoElement) => v.currentTime))
    .toBeCloseTo(0.1, 2);
  await media.evaluate((v: HTMLVideoElement, time) => {
    v.currentTime = time;
  }, original);
  await expect
    .poll(async () => Number(await seek.inputValue()))
    .toBeCloseTo(original * 1000, -1);
};
