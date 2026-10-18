import { test, expect } from "./fixture";

test("dense tactical intelligence retains the reference composition and all scoped evidence", async ({
  page,
  request,
}, testInfo) => {
  test.setTimeout(240000);
  test.skip(
    !process.env.HBI_VISUAL_MATCH,
    "Requires explicitly supplied local footage",
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
  const match = "50000000-0000-4000-8000-000000000001";
  await page.getByLabel("Match", { exact: true }).selectOption(match);
  await page
    .getByLabel("Select local video", { exact: false })
    .setInputFiles(process.env.HBI_VISUAL_MATCH!);
  const mock = `http://127.0.0.1:${process.env.HBI_MOCK_PORT || 54329}`;
  await expect
    .poll(async () => {
      const rows = (await (
        await request.get(`${mock}/rest/v1/analysis_sessions`)
      ).json()) as {
        match_id: string;
        is_primary: boolean;
        video_id: string | null;
      }[];
      return rows.some(
        (row) => row.match_id === match && row.is_primary && row.video_id,
      );
    })
    .toBe(true);
  expect(
    (
      await request.post(`${mock}/test/console-data`, { data: { dense: true } })
    ).ok(),
  ).toBe(true);
  await page.reload();
  await page.getByLabel("Match", { exact: true }).selectOption(match);
  await page
    .getByLabel(/Select local video|Relink/)
    .setInputFiles(process.env.HBI_VISUAL_MATCH!);
  await expect
    .poll(() =>
      page.locator("video").evaluate((v: HTMLVideoElement) => v.readyState),
    )
    .toBeGreaterThanOrEqual(2);
  for (const language of ["en", "ar"] as const) {
    if (language === "ar")
      await page.getByRole("button", { name: "العربية", exact: true }).click();
    const choose = (ar: string, en: string) => (language === "ar" ? ar : en);
    const insightCard = page.getByRole("region", {
      name: choose("استنتاجات بالأدلة", "Evidence-backed insights"),
      exact: true,
    });
    const patternCard = page.getByRole("region", {
      name: choose("أنماط الهجوم", "Attack patterns"),
      exact: true,
    });
    await expect(
      insightCard.locator(
        ".intelligence-list-preview .intelligence-evidence-action",
      ),
    ).toHaveCount(4);
    await expect(
      patternCard.locator(
        ".intelligence-list-preview .intelligence-evidence-action",
      ),
    ).toHaveCount(2);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: testInfo.outputPath(`dense-${language}-1672.png`),
      fullPage: true,
    });
    const summary = (await page.locator(".match-dashboard").boundingBox())!;
    await testInfo.attach(`dense-${language}-geometry`, {
      body: JSON.stringify({
        y: summary.y,
        bottom: summary.y + summary.height,
      }),
      contentType: "application/json",
    });
    expect(summary.y).toBeLessThan(760);
    expect(summary.y + summary.height).toBeLessThanOrEqual(941);
    for (const width of [1672, 1440, 1024, 768, 375]) {
      await page.setViewportSize({ width, height: 941 });
      await insightCard
        .getByRole("button", {
          name: new RegExp(choose("عرض الكل", "View all")),
        })
        .click();
      const dialog = page.getByRole("dialog", {
        name: new RegExp(
          choose("استنتاجات بالأدلة", "Evidence-backed insights"),
        ),
      });
      const actions = dialog.locator(".intelligence-evidence-action");
      await expect(actions).toHaveCount(6);
      const box = (await dialog.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      expect(box.y + box.height).toBeLessThanOrEqual(941);
      await actions.last().scrollIntoViewIfNeeded();
      await page.screenshot({
        path: testInfo.outputPath(`dense-list-${language}-${width}.png`),
      });
      await actions.last().click();
      const evidence = page.locator(".workbench-evidence");
      await expect(evidence.locator("[data-event-id]")).toHaveCount(3);
      for (const number of [201, 203, 209])
        await expect(
          evidence.locator(
            `[data-event-id="a0000000-0000-4000-8000-${String(number).padStart(12, "0")}"]`,
          ),
        ).toHaveCount(1);
      await page
        .getByRole("button", {
          name: choose("إغلاق الأدلة", "Close evidence"),
          exact: true,
        })
        .click();
      await patternCard
        .getByRole("button", {
          name: new RegExp(choose("عرض الكل", "View all")),
        })
        .click();
      const patterns = page.getByRole("dialog", {
        name: new RegExp(choose("أنماط الهجوم", "Attack patterns")),
      });
      await expect(
        patterns.locator(".intelligence-evidence-action"),
      ).toHaveCount(6);
      await patterns.locator(".intelligence-evidence-action").last().click();
      await expect(evidence.locator("[data-event-id]")).toHaveCount(2);
      for (const number of [201, 203])
        await expect(
          evidence.locator(
            `[data-event-id="a0000000-0000-4000-8000-${String(number).padStart(12, "0")}"]`,
          ),
        ).toHaveCount(1);
      await page
        .getByRole("button", {
          name: choose("إغلاق الأدلة", "Close evidence"),
          exact: true,
        })
        .click();
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ),
      ).toBe(true);
    }
    await page.setViewportSize({ width: 1672, height: 941 });
  }
});
