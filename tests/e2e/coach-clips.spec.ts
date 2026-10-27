import { test, expect } from "./fixture";

test("saves a real-video clip offline and hands it to a meeting without duplicate content", async ({ page, context, request }, testInfo) => {
  test.skip(!process.env.HBI_VISUAL_MATCH, "Requires the supplied original local match");
  test.setTimeout(420000);
  const api = `http://127.0.0.1:${process.env.HBI_MOCK_PORT || 54329}/rest/v1`;
  const authResponses: { path: string; status: number }[] = [];
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (url.origin === new URL(api).origin && url.pathname.startsWith("/auth/"))
      authResponses.push({ path: url.pathname, status: response.status() });
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/login");
  await page.getByLabel("Email").fill("coach@example.test");
  await page.getByLabel("Password").fill("test-password");
  await expect(page.getByLabel("Email")).toHaveValue("coach@example.test");
  await page.getByRole("button", { name: "Enter SESEN" }).click();
  try { await expect(page.getByText("HBI Test Club").first()).toBeAttached({ timeout: 90000 }); }
  catch (error) {
    console.log(JSON.stringify({ authResponses, pagePath: new URL(page.url()).pathname,
      cookieNames: (await context.cookies()).map((cookie) => cookie.name) }));
    throw error;
  }
  const originalEvents = await (await request.get(`${api}/events`)).json();
  await page.getByRole("button", { name: "English", exact: true }).click();
  await page.getByRole("link", { name: "Video Lab", exact: true }).click();
  await page.getByLabel("Match", { exact: true }).selectOption("50000000-0000-4000-8000-000000000001");
  await page.getByLabel("Select local video", { exact: false }).setInputFiles(process.env.HBI_VISUAL_MATCH!);
  const video = page.locator("video");
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.readyState)).toBeGreaterThanOrEqual(2);
  await video.evaluate((v: HTMLVideoElement) => { v.dataset.coachAcceptance = "one-source"; v.pause(); v.currentTime = 2105.25; });
  await page.getByRole("tab", { name: "Clips & meeting", exact: true }).click();
  const workbench = page.locator('[data-slot="coach-clips"]');
  await workbench.getByRole("button", { name: "Mark start here" }).click();
  await video.evaluate((v: HTMLVideoElement) => { v.currentTime = 2112.5; });
  await workbench.getByRole("button", { name: "Mark end here" }).click();
  await workbench.getByLabel("Clip title", { exact: true }).fill("Pivot cooperation — coach review");
  await context.setOffline(true);
  await workbench.getByRole("button", { name: "Save clip", exact: true }).click();
  await expect(workbench.getByRole("status")).toContainText("Clip saved in the workspace");
  await workbench.getByRole("button", { name: "Save clip", exact: true }).click();
  await expect(workbench.getByRole("button", { name: "Save clip", exact: true })).toBeEnabled();
  await page.getByRole("tab", { name: "Analytics", exact: true }).click();
  await page.getByRole("tab", { name: "Clips & meeting", exact: true }).click();
  await expect(workbench.getByLabel("Clip title", { exact: true })).toHaveValue("Pivot cooperation — coach review");
  await expect(video).toHaveAttribute("data-coach-acceptance", "one-source");
  await workbench.getByText("Prepare meeting", { exact: true }).click();
  await workbench.getByLabel("New meeting title", { exact: true }).fill("Next training review");
  await workbench.getByRole("button", { name: "Create meeting", exact: true }).click();
  await expect(workbench.getByRole("status")).toContainText("Meeting saved");
  const meetingUrl = await workbench.getByRole("link", { name: "Open meeting" }).getAttribute("href");
  expect(meetingUrl).toMatch(/^\/meetings\//);
  await workbench.getByLabel("Presenter note for the added clip").fill("Pause and discuss the pivot's entry timing");
  await workbench.getByRole("button", { name: "Add to meeting · Pivot cooperation — coach review", exact: true }).click();
  await expect(workbench.getByRole("status")).toContainText("Clip added");
  await workbench.getByRole("button", { name: "Add to meeting · Pivot cooperation — coach review", exact: true }).click();
  await expect(workbench.getByRole("status")).toContainText("Clip already exists");
  await workbench.getByRole("button", { name: "Open start · Pivot cooperation — coach review", exact: true }).click();
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => Math.round(v.currentTime * 1000))).toBe(2105250);
  await workbench.getByRole("button", { name: "Open end · Pivot cooperation — coach review", exact: true }).click();
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => Math.round(v.currentTime * 1000))).toBe(2112499);
  expect((await (await request.get(`${api}/clips`)).json()).filter((r: { title: string }) => r.title === "Pivot cooperation — coach review")).toHaveLength(0);
  await context.setOffline(false);
  await expect.poll(async () => (await (await request.get(`${api}/clips`)).json()).filter((r: { title: string }) => r.title === "Pivot cooperation — coach review").length).toBe(1);
  await expect.poll(async () => (await (await request.get(`${api}/presentation_items`)).json()).filter((r: { speaker_note: string }) => r.speaker_note === "Pause and discuss the pivot's entry timing").length).toBe(1);
  const saved = (await (await request.get(`${api}/clips`)).json()).find((r: { title: string }) => r.title === "Pivot cooperation — coach review");
  expect(saved).toMatchObject({ start_ms: 2105250, end_ms: 2112500 });
  expect(await (await request.get(`${api}/events`)).json()).toEqual(originalEvents);
  await page.screenshot({ path: testInfo.outputPath("coach-clips-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 375, height: 844 });
  await page.getByRole("button", { name: "العربية", exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("coach-clips-ar-mobile.png"), fullPage: true });
  await page.goto(meetingUrl!);
  await expect(page.locator(".meeting-item-select").filter({ hasText: "Pivot cooperation — coach review" })).toBeVisible();
  // A full navigation releases the local file; relink the original, never upload it.
  await page.locator('input[type="file"]').setInputFiles(process.env.HBI_VISUAL_MATCH!);
  await expect(page.locator("video")).toHaveCount(1);
  await expect.poll(() => page.locator("video").evaluate((v: HTMLVideoElement) => v.readyState)).toBeGreaterThanOrEqual(2);
  await expect.poll(() => page.locator("video").evaluate((v: HTMLVideoElement) => Math.round(v.currentTime * 1000))).toBe(2105250);
  await page.locator("video").evaluate(async (v: HTMLVideoElement) => {
    v.muted = true;
    v.currentTime = 2111.5;
    await v.play();
  });
  await expect.poll(() => page.locator("video").evaluate((v: HTMLVideoElement) => v.paused)).toBe(false);
  await expect.poll(() => page.locator("video").evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
  await expect.poll(() => page.locator("video").evaluate((v: HTMLVideoElement) => Math.round(v.currentTime * 1000))).toBe(2105250);
});
