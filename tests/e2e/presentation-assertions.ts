import { expect, type Page } from "@playwright/test";
export const verifyPresentation = async (page: Page) => {
  const menu = page.locator(".match-header-menu").first();
  await menu.locator("summary").click();
  await menu
    .getByRole("link", { name: "Fixture match meeting", exact: true })
    .click();
  await expect(page).toHaveURL(
    /\/meetings\/a0000000-0000-4000-8000-000000004000$/,
  );
  const workbench = page.locator('[data-slot="meeting-workbench"]');
  await expect(workbench.locator(".meeting-item-list article")).toHaveCount(4);
  await expect(workbench.locator(".meeting-speaker-note")).toContainText(
    "PRIVATE COACH NOTE",
  );
  await expect(workbench.locator("video")).toHaveAttribute("src", /^blob:/);
  await expect
    .poll(() =>
      workbench
        .locator("video")
        .evaluate((video: HTMLVideoElement) => video.readyState),
    )
    .toBeGreaterThanOrEqual(2);
  await workbench.locator("video").evaluate((video: HTMLVideoElement) => {
    video.currentTime = 0;
  });
  await expect
    .poll(() =>
      workbench
        .locator("video")
        .evaluate((video: HTMLVideoElement) => video.currentTime),
    )
    .toBeGreaterThanOrEqual(6);
  await workbench.locator("video").evaluate((video: HTMLVideoElement) => {
    video.currentTime = 30;
  });
  await expect
    .poll(() =>
      workbench
        .locator("video")
        .evaluate((video: HTMLVideoElement) => video.currentTime),
    )
    .toBeLessThan(11);
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({
    path: "test-results/meeting-preview-desktop.png",
    fullPage: true,
  });
  await workbench.getByRole("button", { name: "Present", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        document.fullscreenElement?.getAttribute("data-slot"),
      ),
    )
    .toBe("meeting-workbench");
  await expect(workbench.locator(".meeting-speaker-note")).toHaveCount(0);
  await expect(workbench.locator(".meeting-agenda")).toHaveCount(0);
  await workbench.focus();
  await page.keyboard.press("ArrowRight");
  await expect(workbench.getByText("2/4", { exact: true })).toBeVisible();
  await expect(
    workbench.getByRole("heading", {
      name: "Fixture cross sample",
      exact: true,
    }),
  ).toBeVisible();
  await expect(workbench.locator(".meeting-insight a")).toHaveCount(8);
  await expect(
    workbench.getByText("Insight needs review", { exact: true }),
  ).toBeVisible();
  await expect(
    workbench.locator(".meeting-evidence-grid a").first(),
  ).toHaveAttribute(
    "href",
    "/matches/50000000-0000-4000-8000-000000000001?event=a0000000-0000-4000-8000-000000000201",
  );
  await expect(
    workbench.locator(".meeting-evidence-grid a b").first(),
  ).toHaveText("0:04");
  await page.screenshot({
    path: "test-results/meeting-insight-stage.png",
    fullPage: true,
  });
  const next = workbench.getByRole("button", { name: "Next", exact: true });
  await next.focus();
  await next.press("ArrowRight");
  await expect(workbench.getByText("2/4", { exact: true })).toBeVisible();
  await workbench.focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    workbench.getByText("Breathe. Reset. Attack.", { exact: true }),
  ).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(workbench.getByText("4/4", { exact: true })).toBeVisible();
  await expect(
    workbench.getByRole("img", { name: "Tactical drawing" }),
  ).toBeVisible();
  const drawingBounds = (await workbench
    .locator(".drawing-surface")
    .boundingBox())!;
  expect(drawingBounds.width / drawingBounds.height).toBeCloseTo(2, 1);
  const navigationBounds = (await workbench
    .locator(".meeting-navigation")
    .boundingBox())!;
  expect(navigationBounds.y + navigationBounds.height).toBeLessThanOrEqual(942);
  await page.screenshot({
    path: "test-results/meeting-board-stage.png",
    fullPage: true,
  });
  await page.evaluate(() => document.exitFullscreen());
  await expect(
    workbench.getByRole("button", { name: "Present", exact: true }),
  ).toBeVisible();
  await workbench
    .getByRole("button", { name: "1 · Fixture evidence clip", exact: true })
    .click();
  await expect(workbench.locator(".meeting-speaker-note")).toBeVisible();
  await page.getByRole("button", { name: "العربية", exact: true }).click();
  await page.setViewportSize({ width: 375, height: 812 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  for (const button of await workbench
    .locator(".meeting-navigation button")
    .all())
    expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await expect
    .poll(() =>
      workbench.locator("video").evaluate((video: HTMLVideoElement) => {
        if (video.readyState < 2 || video.seeking || !video.videoWidth)
          return false;
        const canvas = document.createElement("canvas");
        canvas.width = 16;
        canvas.height = 9;
        const context = canvas.getContext("2d")!;
        context.drawImage(video, 0, 0, 16, 9);
        const pixels = context.getImageData(0, 0, 16, 9).data;
        const values: number[] = [];
        for (let index = 0; index < pixels.length; index += 4)
          values.push(pixels[index]! + pixels[index + 1]! + pixels[index + 2]!);
        return Math.max(...values) - Math.min(...values) > 20;
      }),
    )
    .toBe(true);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await page.screenshot({
    path: "test-results/meeting-arabic-mobile.png",
    fullPage: true,
  });
  await workbench
    .getByRole("button", { name: "وضع العرض", exact: true })
    .click();
  await expect
    .poll(() =>
      workbench
        .locator("video")
        .evaluate(
          (video: HTMLVideoElement) => video.readyState >= 2 && !video.seeking,
        ),
    )
    .toBe(true);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await expect(workbench.locator(".meeting-speaker-note")).toHaveCount(0);
  await page.screenshot({
    path: "test-results/meeting-arabic-stage.png",
    fullPage: true,
  });
  await workbench.getByRole("button", { name: "إنهاء", exact: true }).click();
  await expect(workbench).not.toHaveClass(/presentation-stage/);
  await page.getByRole("button", { name: "English", exact: true }).click();
  await page.reload();
  await expect(
    workbench.getByText("Relink source video to watch clip", { exact: true }),
  ).toBeVisible();
  await workbench
    .getByLabel("Relink source", { exact: true })
    .setInputFiles(process.env.HBI_VISUAL_MATCH!);
  await expect(workbench.locator("video")).toHaveAttribute("src", /^blob:/);
  await workbench.evaluate((element) => {
    Object.defineProperty(element, "requestFullscreen", {
      value: () =>
        Promise.reject(new DOMException("Blocked in test", "NotAllowedError")),
    });
  });
  await workbench.getByRole("button", { name: "Present", exact: true }).click();
  await expect(
    workbench.getByText(
      "Presentation mode is active; fullscreen is unavailable in this browser.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(workbench.locator(".meeting-speaker-note")).toHaveCount(0);
  const exit = workbench.getByRole("button", { name: "Exit", exact: true });
  const fallbackNext = workbench.getByRole("button", {
    name: "Next",
    exact: true,
  });
  await fallbackNext.focus();
  await fallbackNext.press("Tab");
  await expect(exit).toBeFocused();
  await exit.press("Shift+Tab");
  await expect(fallbackNext).toBeFocused();
  await exit.click();
  await expect(
    workbench.getByRole("button", { name: "Present", exact: true }),
  ).toBeFocused();
};
