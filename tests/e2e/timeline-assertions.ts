import { expect, type Page } from "@playwright/test";

export const verifyTimelineClusters = async (page: Page) => {
  const timeline = page.getByRole("region", {
    name: "Analysis timeline",
    exact: true,
  });
  const cluster = timeline.locator(".timeline-cluster").first();
  const trigger = cluster.locator("summary");
  await expect(trigger).toBeVisible();
  await trigger.focus();
  await trigger.press("Space");
  const list = cluster.getByRole("region", { name: "Choose timeline event" });
  await expect(list).toBeVisible();
  const box = (await list.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(375);
  const video = page.locator("video");
  const before = await video.evaluate((v: HTMLVideoElement) => v.currentTime);
  await list.focus();
  await list.press("ArrowRight");
  expect(await video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBe(
    before,
  );
  await list.press("Escape");
  await expect(trigger).toBeFocused();
  await expect(cluster).not.toHaveAttribute("open");
  await trigger.press("Space");
  const choice = list.getByRole("button").last();
  const id = await choice.getAttribute("data-event-id");
  const bounds = (await choice.boundingBox())!;
  expect(bounds.height).toBeGreaterThanOrEqual(44);
  await choice.click();
  const evidence = page.getByRole("dialog", {
    name: "Event evidence",
    exact: true,
  });
  await expect(evidence.locator("[data-event-id]")).toHaveCount(1);
  await expect(evidence.locator(`[data-event-id="${id}"]`)).toHaveCount(1);
  await page
    .getByRole("button", { name: "Close evidence", exact: true })
    .click();
  await expect(cluster).not.toHaveAttribute("open");
};
