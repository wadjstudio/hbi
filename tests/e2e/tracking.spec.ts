import { readFile } from "node:fs/promises";
import { test, expect } from "./fixture";

test("reviews source-bound tracks with correct overlay geometry and frame-local edits", async ({ page, request }, testInfo) => {
  test.skip(!process.env.HBI_VISUAL_MATCH || !process.env.HBI_TRACKING_REPORT,
    "Requires the supplied original video and bound local ByteTrack report");
  test.setTimeout(360000);
  const report = JSON.parse(await readFile(process.env.HBI_TRACKING_REPORT!, "utf8"));
  const frameIndex = report.frames.findIndex((frame: { persons: { box: number[] }[] }) => frame.persons.some((p) => p.box.every((n) => n >= 0 && n <= 1) && p.box[2]! - p.box[0]! > .02));
  expect(frameIndex).toBeGreaterThanOrEqual(0);
  const frame = report.frames[frameIndex];
  const person = frame.persons.find((p: { box: number[] }) => p.box.every((n) => n >= 0 && n <= 1) && p.box[2]! - p.box[0]! > .02);
  const api = `http://127.0.0.1:${process.env.HBI_MOCK_PORT || 54329}/rest/v1`;
  const beforeEvents = await (await request.get(`${api}/events`)).json();
  await page.setViewportSize({ width: 1672, height: 941 });
  await page.goto("/login");
  await page.getByLabel("Email").fill("coach@example.test");
  await page.getByLabel("Password").fill("test-password");
  await page.getByRole("button", { name: "Enter SESEN" }).click();
  await expect(page.getByText("HBI Test Club").first()).toBeAttached({ timeout: 90000 });
  await page.getByRole("button", { name: "English", exact: true }).click();
  await page.getByRole("link", { name: "Video Lab", exact: true }).click();
  await page.getByLabel("Match", { exact: true }).selectOption("50000000-0000-4000-8000-000000000001");
  await page.getByLabel("Select local video", { exact: false }).setInputFiles(process.env.HBI_VISUAL_MATCH!);
  await expect.poll(() => page.locator("video").evaluate((v: HTMLVideoElement) => v.readyState)).toBeGreaterThanOrEqual(2);
  await page.getByRole("tab", { name: "Automatic analysis", exact: true }).click();
  const panel = page.locator('[data-slot="tracking-review"]');
  await panel.getByLabel("Import tracking sample or review").setInputFiles(process.env.HBI_TRACKING_REPORT!);
  const tactics = panel.locator('[data-slot="tactical-proposals"]');
  await expect(tactics.getByRole("heading", { name: "Automatic motion patterns and defensive shapes" })).toBeVisible();
  await expect(tactics.getByText(/Defensive extraction is gated/)).toBeVisible();
  const proposalDownload = page.waitForEvent("download");
  await tactics.getByRole("button", { name: "Export proposals and evidence" }).click();
  const proposals = JSON.parse(await readFile((await (await proposalDownload).path())!, "utf8"));
  expect(proposals.schema).toBe("sesen.tactical-proposals.v1");
  expect(proposals.source.sha256).toBe(report.source.sha256);
  expect(proposals.engine.calibrated_probability).toBe(false);
  expect(proposals.engine.tracking_model_sha256).toBe(report.engine.model_sha256);
  expect(proposals.evidence_basis.corrections).toEqual({});
  expect(proposals.decisions).toEqual({});
  expect(proposals).not.toHaveProperty("events");
  expect(proposals.proposals.every((p: { kind: string }) => p.kind === "crossing_motion")).toBe(true);
  await panel.getByRole("button", { name: "Sample start", exact: true }).click();
  if (process.env.HBI_SPATIAL_PREPARATION) {
    await tactics.getByLabel("Import automatic team and court preparation").setInputFiles(process.env.HBI_SPATIAL_PREPARATION);
    await expect(tactics.getByText("Team and court preparation — unreviewed", { exact: true })).toBeVisible();
    await expect(tactics.locator('[data-slot="spatial-preparation"] svg')).toBeVisible();
    const preparedDownload = page.waitForEvent("download");
    await panel.getByRole("button", { name: "Export tracking corrections" }).click();
    const preparedBackup = JSON.parse(await readFile((await (await preparedDownload).path())!, "utf8"));
    expect(preparedBackup.tactics.preparation.status).toBe("unreviewed");
    expect(preparedBackup.tactics.preparation.confirmed_events).toEqual([]);
    expect(preparedBackup.tactics.preparation.source.sha256).toBe(report.source.sha256);
  }
  await panel.getByLabel("Sample frame", { exact: true }).focus();
  for (let i = 0; i < frameIndex; i++) await page.keyboard.press("ArrowRight");
  await panel.getByRole("button", { name: `Track ${frame.scene}:${person.track_id}`, exact: true }).click();
  const overlay = page.locator('[data-slot="tracking-overlay"]');
  const track = overlay.locator(`[data-track-id="${frame.scene}:${person.track_id}"]`);
  await expect(track).toBeVisible();
  await expect(overlay).toHaveAttribute("preserveAspectRatio", "xMidYMid meet");
  const x = person.box[0] + .005;
  await panel.getByLabel("x1", { exact: true }).fill(String(x));
  await panel.getByLabel("Correction note").fill("Synthetic geometry correction for acceptance; not a ground-truth label");
  await panel.getByRole("button", { name: "Save frame correction" }).click();
  if (process.env.HBI_SPATIAL_PREPARATION)
    await expect(tactics.locator('[data-slot="spatial-preparation"]')).toHaveCount(0);
  await expect(track).toHaveAttribute("data-manual", "true");
  for (const width of [1672, 1024, 375]) {
    await page.setViewportSize({ width, height: width === 375 ? 844 : 941 });
    const alignment = await track.locator("rect").evaluate((rect) => {
      const video = document.querySelector("video")!;
      const v = video.getBoundingClientRect(), b = rect.getBoundingClientRect();
      const scale = Math.min(v.width / video.videoWidth, v.height / video.videoHeight);
      const contentWidth = video.videoWidth * scale;
      const contentHeight = video.videoHeight * scale;
      return { x: (b.left - v.left - (v.width - contentWidth) / 2) / contentWidth,
        y: (b.top - v.top - (v.height - contentHeight) / 2) / contentHeight,
        width: b.width / contentWidth, height: b.height / contentHeight,
        inside: b.left >= v.left - 1 && b.right <= v.right + 1 && b.top >= v.top - 1 && b.bottom <= v.bottom + 1 };
    });
    expect(alignment.x).toBeCloseTo(x, 3);
    expect(alignment.y).toBeCloseTo(person.box[1], 3);
    expect(alignment.width).toBeCloseTo(person.box[2] - x, 3);
    expect(alignment.height).toBeCloseTo(person.box[3] - person.box[1], 3);
    expect(alignment.inside).toBe(true);
  }
  await page.setViewportSize({ width: 1672, height: 941 });
  await page.screenshot({ path: testInfo.outputPath("tracking-en-1672.png"), fullPage: true });
  const pendingDownload = page.waitForEvent("download");
  await panel.getByRole("button", { name: "Export tracking corrections" }).click();
  const backup = JSON.parse(await readFile((await (await pendingDownload).path())!, "utf8"));
  expect(backup.schema).toBe("sesen.tracking-review.v1");
  expect(Object.keys(backup.corrections)).toEqual([`${frameIndex}:${frame.scene}:${person.track_id}`]);
  await page.locator("video").evaluate((v: HTMLVideoElement, end: number) => { v.currentTime = end / 1000; }, report.end_ms + 1000);
  await expect(overlay).toHaveCount(0);
  await expect(panel.getByRole("status")).toContainText("Outside sample interval");
  await page.reload();
  await page.getByLabel("Match", { exact: true }).selectOption("50000000-0000-4000-8000-000000000001");
  await page.getByLabel("Select local video", { exact: false }).setInputFiles(process.env.HBI_VISUAL_MATCH!);
  await page.getByRole("tab", { name: "Automatic analysis", exact: true }).click();
  await panel.getByLabel("Show track boxes").check();
  await panel.getByRole("button", { name: "Sample start", exact: true }).click();
  await panel.getByLabel("Sample frame", { exact: true }).focus();
  for (let i = 0; i < frameIndex; i++) await page.keyboard.press("ArrowRight");
  await panel.getByRole("button", { name: `Track ${frame.scene}:${person.track_id}`, exact: true }).click();
  await expect(panel.getByLabel("x1", { exact: true })).toHaveValue(String(x));
  await expect(track).toHaveAttribute("data-manual", "true");
  expect(await (await request.get(`${api}/events`)).json()).toEqual(beforeEvents);
  await page.setViewportSize({ width: 375, height: 844 });
  await page.getByRole("button", { name: "العربية", exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("tracking-ar-375.png"), fullPage: true });
});
