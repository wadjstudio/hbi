import { expect, type Page } from "@playwright/test";

export const verifyEfficiencyCards = async (page: Page) => {
  const check = async (numbers: number[]) => {
    const dialog = page.getByRole("dialog");
    await expect(dialog.locator("[data-event-id]")).toHaveCount(numbers.length);
    for (const number of numbers) {
      await expect(
        dialog.locator(
          `[data-event-id="a0000000-0000-4000-8000-${String(number).padStart(12, "0")}"]`,
        ),
      ).toHaveCount(1);
    }
    await page
      .getByRole("button", { name: "Close evidence", exact: true })
      .click();
  };
  const profile = page.locator(".shot-profile-card");
  await profile
    .getByRole("button", { name: "Shot efficiency · 22.2% · 2/9", exact: true })
    .click();
  await check([201, 203, 207, 209, 211, 213, 217, 219, 221]);
  await profile
    .getByRole("button", { name: "2 Reviewed goals", exact: true })
    .click();
  await check([207, 217]);
  await profile
    .getByRole("button", { name: "1 Attempts to review", exact: true })
    .click();
  await check([223]);
  for (const region of [
    page.locator(".match-dashboard"),
    page.locator(".session-rail"),
  ]) {
    await region
      .getByRole("button", {
        name: "Fixture Wing Test · All attempts",
        exact: true,
      })
      .click();
    await check([211, 217, 223]);
    await region
      .getByRole("button", {
        name: "Fixture Wing Test · Shooting efficiency · 50.0% · 1/2",
        exact: true,
      })
      .click();
    await check([211, 217]);
  }
  const trigger = profile.locator(".shot-profile-method > summary");
  await trigger.focus();
  await trigger.press("Space");
  const method = profile.locator(".shot-profile-method-content");
  await expect(method).toBeVisible();
  await expect(method).toContainText("Pending attempts are excluded");
  const box = (await method.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  const nativeVideo = page.locator("video");
  const before = (await nativeVideo.count())
    ? await nativeVideo.evaluate((v: HTMLVideoElement) => v.currentTime)
    : null;
  await method.focus();
  await method.press("ArrowRight");
  if (before != null)
    expect(
      await nativeVideo.evaluate((v: HTMLVideoElement) => v.currentTime),
    ).toBe(before);
  await method.press("Escape");
  await expect(profile.locator(".shot-profile-method")).not.toHaveAttribute(
    "open",
  );
  await expect(trigger).toBeFocused();
};
