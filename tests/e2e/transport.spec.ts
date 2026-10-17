import { test, expect } from "./fixture";
import { verifyTransport } from "./transport-assertions";

test("wide transport retains physical seeking in English and Arabic", async ({
  page,
  request,
}, testInfo) => {
  test.setTimeout(180000);
  test.skip(
    !process.env.HBI_VISUAL_MATCH,
    "Requires explicitly supplied local test footage",
  );
  await page.setViewportSize({ width: 1672, height: 941 });
  await page.goto("/login");
  await page.getByLabel("Email").fill("coach@example.test");
  await page.getByLabel("Password").fill("test-password");
  await page.getByRole("button", { name: "Enter SESEN" }).click();
  await expect(page.getByText("HBI Test Club").first()).toBeAttached({
    timeout: 90000,
  });
  await page.getByRole("button", { name: "English", exact: true }).click();
  await page.getByRole("link", { name: "Video Lab", exact: true }).click();
  await page
    .getByLabel("Match", { exact: true })
    .selectOption("50000000-0000-4000-8000-000000000001");
  await page
    .getByLabel("Select local video", { exact: false })
    .setInputFiles(process.env.HBI_VISUAL_MATCH!);
  await expect
    .poll(() =>
      page.locator("video").evaluate((v: HTMLVideoElement) => v.readyState),
    )
    .toBeGreaterThanOrEqual(2);
  const mock = `http://127.0.0.1:${process.env.HBI_MOCK_PORT || 54329}`;
  await expect
    .poll(async () => {
      const response = await request.get(`${mock}/rest/v1/analysis_sessions`);
      const rows = (await response.json()) as {
        match_id: string;
        is_primary: boolean;
        video_id: string | null;
      }[];
      return rows.some(
        (row) =>
          row.match_id === "50000000-0000-4000-8000-000000000001" &&
          row.is_primary &&
          row.video_id,
      );
    })
    .toBe(true);
  expect((await request.post(`${mock}/test/console-data`)).ok()).toBe(true);
  await page.reload();
  await page
    .getByLabel("Match", { exact: true })
    .selectOption("50000000-0000-4000-8000-000000000001");
  await page
    .getByLabel(/Select local video|Relink/)
    .setInputFiles(process.env.HBI_VISUAL_MATCH!);
  await expect
    .poll(() =>
      page.locator("video").evaluate((v: HTMLVideoElement) => v.readyState),
    )
    .toBeGreaterThanOrEqual(2);
  await verifyTransport(page);
  await page.getByRole("button", { name: "العربية", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await verifyTransport(page);
  await page.getByRole("slider", { name: "وقت الفيديو", exact: true }).blur();
  await expect(page.locator(".match-dashboard .player-threat-row")).toHaveCount(
    3,
  );
  const summary = (await page.locator(".match-dashboard").boundingBox())!;
  await testInfo.attach("arabic-layout", {
    body: JSON.stringify(
      await page.evaluate(() =>
        [
          ".analysis-split",
          ".session-rail",
          ".intelligence-heading",
          ".rail-summary",
          ".intelligence-footer",
          ".match-dashboard",
          ...Array.from(
            { length: 5 },
            (_, i) => `.dashboard-card:nth-child(${i + 1})`,
          ),
        ].map((selector) => {
          const node = document.querySelector(selector)!;
          const box = node.getBoundingClientRect();
          return { selector, y: box.y, height: box.height, bottom: box.bottom };
        }),
      ),
    ),
    contentType: "application/json",
  });
  await page.screenshot({
    path: testInfo.outputPath("transport-arabic-1672.png"),
    fullPage: true,
  });
  expect(summary.y).toBeLessThan(760);
  expect(summary.y + summary.height).toBeLessThanOrEqual(941);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    )
    .toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("transport-arabic-1672.png"),
    fullPage: true,
  });
});
