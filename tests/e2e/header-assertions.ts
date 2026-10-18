import { expect, type Page } from "@playwright/test";
import { openVideoSettings } from "./video-settings-assertions";
export const verifyHeader = async (page: Page) => {
  const account = page.locator(".account-menu");
  await account.locator("summary").click();
  await expect(account).toContainText("coach@example.test");
  await expect(account.locator(".account-identity")).toContainText("Owner");
  await account
    .getByRole("link", { name: "Workspace settings", exact: true })
    .focus();
  await page.keyboard.press("Escape");
  await expect(account).not.toHaveAttribute("open");
  await expect(account.locator("summary")).toBeFocused();
  const share = page.locator(".match-share-menu");
  await share.locator("summary").click();
  // The link is filled by the details toggle event, which fires after open.
  const link = share.getByLabel("Match and session link", { exact: true });
  await expect(link).toHaveValue(/^https?:\/\//);
  const url = await link.inputValue();
  const parsed = new URL(url);
  expect(parsed.pathname).toBe("/matches/50000000-0000-4000-8000-000000000001");
  expect(parsed.searchParams.get("session")).toBeTruthy();
  await expect(share).toContainText("Local video is not transferred");
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await share.getByRole("button", { name: "Copy link", exact: true }).click();
  await expect(share.getByRole("status")).toHaveText("Link copied");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(url);
  await page.keyboard.press("Escape");
  await expect(share).not.toHaveAttribute("open");
  const presentation = page.locator(".match-header-menu").first();
  await presentation.locator("summary").click();
  await expect(presentation).toContainText("Meetings linked to this match");
  await expect(
    presentation.getByRole("link", { name: "All meetings", exact: false }),
  ).toHaveAttribute("href", "/meetings");
  await page.locator(".video-matte").click({ position: { x: 10, y: 60 } });
  await expect(presentation).not.toHaveAttribute("open");
  // A shared link must retain its explicit session and source position after a fresh load.
  parsed.searchParams.set("at", "12000");
  await page.goto(parsed.toString());
  await expect(page.locator("#match-header-slot")).toContainText("Video 0:12");
  await openVideoSettings(page);
  await page.getByText("Layout & sessions", { exact: true }).click();
  await page.getByText("Analysis sessions & settings", { exact: true }).click();
  await expect(
    page.getByLabel("Analysis session", { exact: true }),
  ).toHaveValue(parsed.searchParams.get("session")!);
  await page.keyboard.press("Escape");
  const bad = new URL(parsed);
  bad.searchParams.set("session", "00000000-0000-4000-8000-000000000099");
  await page.goto(bad.toString());
  await expect(
    page.getByText(
      "The requested session is unavailable for this match and organization. Choose a session in analysis settings.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.goto(parsed.toString());
  if (process.env.HBI_VISUAL_MATCH) {
    await page
      .getByLabel(/Select local video|Relink/)
      .setInputFiles(process.env.HBI_VISUAL_MATCH);
    await expect
      .poll(() =>
        page.locator("video").evaluate((v: HTMLVideoElement) => v.currentTime),
      )
      .toBeCloseTo(12, 1);
    await expect
      .poll(() =>
        page.locator("video").evaluate((video: HTMLVideoElement) => {
          if (video.readyState < 2 || video.seeking || !video.videoWidth)
            return false;
          const canvas = document.createElement("canvas");
          canvas.width = 16;
          canvas.height = 9;
          const context = canvas.getContext("2d")!;
          context.drawImage(video, 0, 0, 16, 9);
          const pixels = context.getImageData(0, 0, 16, 9).data;
          const brightness: number[] = [];
          for (let i = 0; i < pixels.length; i += 4)
            brightness.push(pixels[i]! + pixels[i + 1]! + pixels[i + 2]!);
          return Math.max(...brightness) - Math.min(...brightness) > 20;
        }),
      )
      .toBe(true);
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
  }
};
