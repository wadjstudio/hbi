import { expect, test, type Page } from "@playwright/test";

export const verifyLineup = async (page: Page) => {
  await page.getByRole("tab", { name: "Lineups", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Lineup at game clock", exact: true }),
  ).toBeVisible();
  const lineup = page.locator('[data-slot="lineup-overview"]');
  await lineup
    .getByRole("combobox", { name: "Lineup and recording team", exact: true })
    .selectOption("30000000-0000-4000-8000-000000000002");
  await expect(lineup.locator(".lineup-court button")).toHaveCount(6);
  await expect(lineup.locator(".lineup-court .needs-review")).toHaveCount(1);
  await expect(
    lineup.getByLabel("RB · Not recorded", { exact: true }),
  ).toBeVisible();
  const keeper = lineup.getByRole("button", {
    name: "Fixture Away Keeper Test · GK",
    exact: true,
  });
  await keeper.focus();
  await page.keyboard.press("Enter");
  await expect(lineup.locator(".lineup-interval-detail")).toContainText("0:30");
  await expect(lineup.locator(".lineup-interval-detail")).toContainText(
    "Verified",
  );
  const positions = () =>
    lineup.locator(".lineup-position").evaluateAll((nodes) =>
      nodes.map((node) => {
        const court = node.closest(".lineup-court")!.getBoundingClientRect();
        const box = node.getBoundingClientRect();
        return {
          left: (node as HTMLElement).style.left,
          top: (node as HTMLElement).style.top,
          x:
            Math.round(
              ((box.x + box.width / 2 - court.x) / court.width) * 100,
            ) / 100,
          y:
            Math.round(
              ((box.y + box.height / 2 - court.y) / court.height) * 100,
            ) / 100,
        };
      }),
    );
  const before = await positions();
  const viewport = page.viewportSize()!;
  await page.setViewportSize({ width: 1672, height: 941 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: test.info().outputPath("lineup-desktop.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "العربية", exact: true }).click();
  await page.setViewportSize({ width: 375, height: 844 });
  expect(await positions()).toEqual(before);
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  await page.screenshot({
    path: test.info().outputPath("lineup-arabic-mobile.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "English", exact: true }).click();
  await page.setViewportSize(viewport);
  await page
    .getByText("Roster, interval and substitution tools", { exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Open interval", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Substitute", exact: true }),
  ).toBeDisabled();
  const nativeVideo = page.locator("video");
  if (await nativeVideo.count()) {
    await nativeVideo.evaluate((video: HTMLVideoElement) => {
      video.pause();
      video.currentTime = 30;
    });
    await expect(lineup.locator(".lineup-court button")).toHaveCount(0);
    await nativeVideo.evaluate((video: HTMLVideoElement) => {
      video.currentTime = 0;
    });
    await expect(lineup.locator(".lineup-court button")).toHaveCount(6);
  }
  await lineup
    .getByRole("combobox", { name: "Lineup and recording team", exact: true })
    .selectOption("30000000-0000-4000-8000-000000000001");
  await page.getByRole("tab", { name: "Analytics", exact: true }).click();
};
