import { test, expect } from "./fixture";
import { verifyHistoricalEvidence } from "./history-assertions";
import { verifySessionStatistics } from "./session-statistics-assertions";
import { verifyHeader } from "./header-assertions";
import { verifySpatialMaps } from "./spatial-map-assertions";
import { verifyTypography } from "./typography-assertions";
import { verifyLineup } from "./lineup-assertions";
import { verifyEventFeed } from "./event-feed-assertions";
import { verifyAnnotations } from "./annotation-assertions";
import { verifyReview } from "./review-assertions";
import { verifyPresentation } from "./presentation-assertions";
import { verifyHeaderDetails } from "./header-details-assertions";
import { verifyBrandHeader } from "./brand-header-assertions";
import { verifyTransport } from "./transport-assertions";
import { verifyEfficiencyCards } from "./efficiency-card-assertions";
import {
  openVideoSettings,
  verifyVideoSettings,
} from "./video-settings-assertions";
test("analysis console supports resizing, focus, keyboard tabs and narrow screens", async ({
  page,
  request,
}, testInfo) => {
  test.setTimeout(300000);
  await page.setViewportSize({ width: 1560, height: 900 });
  await page.goto("/login");
  await verifyTypography(page);
  await page.getByLabel("Email").fill("coach@example.test");
  await page.getByLabel("Password").fill("test-password");
  await page.getByRole("button", { name: "Enter SESEN" }).click();
  await expect(page.getByText("HBI Test Club").first()).toBeAttached({
    timeout: 90000,
  });
  await page.getByRole("button", { name: "English", exact: true }).click();
  await page.getByRole("link", { name: "Video Lab", exact: true }).click();
  await expect(page).toHaveURL(/\/video-lab$/, { timeout: 90000 });
  await page
    .getByLabel("Match", { exact: true })
    .selectOption("50000000-0000-4000-8000-000000000001");
  const video = page.getByTestId("video"),
    rail = page.getByTestId("intelligence");
  const initial = (await video.boundingBox())!.width;
  const separator = page.getByRole("separator", {
    name: "Resize video and evidence",
  });
  await separator.focus();
  await separator.press("ArrowLeft");
  await expect
    .poll(async () => (await video.boundingBox())!.width)
    .toBeLessThan(initial);
  await verifyVideoSettings(page);
  await openVideoSettings(page);
  await page.getByText("Layout & sessions", { exact: true }).focus();
  await page.keyboard.press("Space");
  await page.getByRole("button", { name: "Focus video", exact: true }).click();
  await expect(rail).toBeHidden();
  await expect
    .poll(async () => (await video.boundingBox())!.width)
    .toBeGreaterThan(initial);
  await page
    .getByRole("button", { name: "Video & evidence", exact: true })
    .click();
  await page.getByRole("button", { name: "Reset layout", exact: true }).click();
  await expect(rail).toBeVisible();
  const surface = page.locator(".video-surface");
  const fittedHeight = (await surface.boundingBox())!.height;
  await expect(
    page.getByRole("button", { name: "Fit workspace", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Fit workspace", exact: true })
    .click();
  await expect
    .poll(async () => (await surface.boundingBox())!.height)
    .toBeGreaterThan(fittedHeight);
  await page
    .getByRole("button", { name: "Fit workspace", exact: true })
    .click();
  await expect
    .poll(async () => (await surface.boundingBox())!.height)
    .toBeLessThan(430);
  await page.keyboard.press("Escape");
  await expect(page.locator(".layout-menu")).not.toHaveAttribute("open");
  await expect(
    page.getByText("Layout & sessions", { exact: true }),
  ).toBeFocused();
  // Optional local footage is used only in the isolated test account, never seeded into production.
  if (process.env.HBI_VISUAL_MATCH) {
    await page
      .getByLabel("Select local video", { exact: false })
      .setInputFiles(process.env.HBI_VISUAL_MATCH);
    await expect(page.locator("video")).toBeVisible();
    await expect
      .poll(() =>
        page
          .locator("video")
          .evaluate((element: HTMLVideoElement) => element.readyState),
      )
      .toBeGreaterThanOrEqual(2);
    const mounted = await page.locator("video").elementHandle();
    await page.locator("video").evaluate((v: HTMLVideoElement) => {
      v.currentTime = 12;
    });
    await page.getByText("Layout & sessions", { exact: true }).click();
    await page
      .getByRole("button", { name: "Focus video", exact: true })
      .click();
    expect(await mounted!.evaluate((node) => node.isConnected)).toBe(true);
    await expect
      .poll(() =>
        page.locator("video").evaluate((v: HTMLVideoElement) => v.currentTime),
      )
      .toBeCloseTo(12, 1);
    await page
      .getByRole("button", { name: "Video & evidence", exact: true })
      .click();
    await page.keyboard.press("Escape");
    await separator.focus();
    await separator.press("ArrowRight");
    await expect
      .poll(() =>
        page.locator("video").evaluate((v: HTMLVideoElement) => v.currentTime),
      )
      .toBeCloseTo(12, 1);
    await page.getByText("Layout & sessions", { exact: true }).click();
    await page
      .getByRole("button", { name: "Reset layout", exact: true })
      .click();
    await page.keyboard.press("Escape");
  }
  const layers = page.getByRole("button", {
    name: "Possessions & clips",
    exact: true,
  });
  await expect(layers).toHaveAttribute("aria-expanded", "false");
  await layers.click();
  await expect(page.locator(".timeline-lane")).toHaveCount(3);
  await layers.click();
  await expect(page.locator(".timeline-lane")).toHaveCount(1);
  const breakdown = page.locator(".threat-breakdown");
  await expect(breakdown).not.toHaveAttribute("open");
  await breakdown.locator("summary").click();
  await expect(breakdown.locator(".threat-zone-list")).toBeVisible();
  await breakdown.locator("summary").click();
  await expect
    .poll(
      async () => (await page.locator(".threat-profile").boundingBox())!.height,
    )
    .toBeLessThan(240);
  await page.getByRole("tab", { name: "Lineups", exact: true }).focus();
  await page
    .getByRole("tab", { name: "Lineups", exact: true })
    .press("ArrowLeft");
  await expect(
    page.getByRole("tab", { name: "Analytics", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel")).toContainText("Shot efficiency");
  if (process.env.HBI_VISUAL_MATCH)
    await expect
      .poll(() =>
        page.locator("video").evaluate((v: HTMLVideoElement) => v.currentTime),
      )
      .toBeCloseTo(12, 1);
  await expect(page.locator(".dashboard-card")).toHaveCount(5);
  await expect(page.locator("#match-header-slot .match-context")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Video Lab", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  // Populated acceptance is isolated to the mock account; none of these values describe the footage.
  if (process.env.HBI_VISUAL_MATCH) {
    // File decoding can finish before the offline queue reaches the mock backend.
    await expect
      .poll(async () => {
        const response = await request.get(
          `http://127.0.0.1:${process.env.HBI_MOCK_PORT || 54329}/rest/v1/analysis_sessions`,
        );
        const sessions = (await response.json()) as {
          match_id: string;
          is_primary: boolean;
          video_id: string | null;
        }[];
        return sessions.some(
          (session) =>
            session.match_id === "50000000-0000-4000-8000-000000000001" &&
            session.is_primary &&
            session.video_id,
        );
      })
      .toBe(true);
  }
  const seeded = await request.post(
    `http://127.0.0.1:${process.env.HBI_MOCK_PORT || 54329}/test/console-data`,
  );
  expect(seeded.ok()).toBe(true);
  await page.reload();
  await page
    .getByLabel("Match", { exact: true })
    .selectOption("50000000-0000-4000-8000-000000000001");
  if (process.env.HBI_VISUAL_MATCH) {
    await page
      .getByLabel(/Select local video|Relink/)
      .setInputFiles(process.env.HBI_VISUAL_MATCH);
    await expect(page.locator("video")).toBeVisible();
  }
  await page.getByRole("tab", { name: "Analytics", exact: true }).click();
  await expect(page.locator("#match-header-slot")).toContainText(
    "VISUAL TEST DATA",
  );
  const shotTrend = page.getByTestId("shot-efficiency-trend");
  await verifyEfficiencyCards(page);
  await verifySessionStatistics(page);
  await verifyLineup(page);
  await verifyEventFeed(page);
  if (process.env.HBI_VISUAL_MATCH) await verifyAnnotations(page);
  const possessionTrend = page.getByTestId("possession-efficiency-trend");
  await expect(shotTrend.getByRole("button")).toHaveCount(9);
  await expect(possessionTrend.getByRole("button")).toHaveCount(6);
  await expect(
    page.getByText("Wrong session insight", { exact: true }),
  ).toHaveCount(0);
  await shotTrend.getByRole("button").last().focus();
  await page.keyboard.press("Enter");
  const shotEvidence = page.getByRole("dialog", {
    name: "Shot trend sample",
    exact: true,
  });
  await expect(shotEvidence.locator(".evidence-source")).toHaveCount(9);
  await page
    .getByRole("button", { name: "Close evidence", exact: true })
    .click();
  await possessionTrend.getByRole("button").last().click();
  await expect(
    page
      .getByRole("dialog", { name: "Possession trend sample", exact: true })
      .locator(".evidence-source"),
  ).toHaveCount(11);
  await page
    .getByRole("button", { name: "Close evidence", exact: true })
    .click();
  await verifySpatialMaps(page);
  await expect(
    page.getByRole("button", {
      name: "Turnover location evidence",
      exact: true,
    }),
  ).toHaveCount(1);
  await page
    .getByRole("button", { name: "Turnover location evidence", exact: true })
    .click();
  await expect(
    page
      .getByRole("dialog", { name: "Turnover location", exact: true })
      .locator(".evidence-source"),
  ).toHaveCount(1);
  await page
    .getByRole("button", { name: "Close evidence", exact: true })
    .click();
  await expect(page.locator(".recent-form .form-outcome")).toHaveCount(5);
  await page.getByRole("button", { name: /Fixture cross sample/ }).click();
  await expect(
    page
      .getByRole("dialog", { name: "Fixture cross sample", exact: true })
      .locator(".evidence-source"),
  ).toHaveCount(8);
  await page
    .getByRole("button", { name: "Close evidence", exact: true })
    .click();
  await page.getByRole("button", { name: "Goals", exact: true }).click();
  await expect(shotTrend.getByRole("button")).toHaveCount(2);
  await page.getByRole("button", { name: /Fixture cross sample/ }).click();
  await expect(
    page
      .getByRole("dialog", { name: "Fixture cross sample", exact: true })
      .locator(".evidence-source"),
  ).toHaveCount(2);
  await page
    .getByRole("button", { name: "Close evidence", exact: true })
    .click();
  await page.getByRole("button", { name: "All", exact: true }).click();
  if (process.env.HBI_VISUAL_MATCH) {
    await page
      .getByRole("button", { name: "Turnover location evidence", exact: true })
      .click();
    await page
      .getByRole("dialog", { name: "Turnover location", exact: true })
      .getByRole("button", { name: "Edit", exact: true })
      .click();
    await page
      .getByLabel("Event horizontal coordinate", { exact: true })
      .fill("0.33");
    await page
      .getByLabel("Event vertical coordinate", { exact: true })
      .fill("0.66");
    await page
      .getByRole("button", { name: "Save event [T]", exact: true })
      .click();
    await expect(
      page.getByLabel("Event horizontal coordinate", { exact: true }),
    ).toHaveValue("");
    await expect(
      page.getByLabel("Event vertical coordinate", { exact: true }),
    ).toHaveValue("");
    await expect(page.locator(".turnover-point")).toHaveAttribute("cx", "330");
    await expect(page.locator(".turnover-point")).toHaveAttribute("cy", "330");
    await page.locator(".event-editor > summary").click();
  }
  await verifyHistoricalEvidence(page, request);
  await verifyHeader(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: testInfo.outputPath("console-wide.png"),
    fullPage: true,
  });
  for (const width of [1672, 1440, 1024, 768, 375]) {
    await page.setViewportSize({ width, height: 941 });
    await verifyBrandHeader(page, width);
    expect(
      (await page
        .locator(".shot-profile-card .efficiency-ring-large")
        .boundingBox())!.width,
    ).toBeCloseTo(106, 0);
    if (width < 1200) {
      for (const button of await page
        .locator(".player-threat-efficiency")
        .all()) {
        const bounds = (await button.boundingBox())!;
        expect(bounds.width).toBeGreaterThanOrEqual(44);
        expect(bounds.height).toBeGreaterThanOrEqual(44);
      }
    }
    if (width === 1672) await verifyTransport(page);
    if (width === 1672 && process.env.HBI_VISUAL_MATCH) {
      await testInfo.attach("console-geometry", {
        body: JSON.stringify(
          await page.evaluate(() =>
            [
              ".analysis-split",
              ".session-rail",
              ".intelligence-heading",
              ".rail-summary",
              ".intelligence-footer",
              ".workbench-video-column",
              ".video-transport",
              ".analysis-timeline",
              ".quick-tag-dock",
              ".match-dashboard",
            ].map((selector) => {
              const element = document.querySelector(selector)!;
              const box = element.getBoundingClientRect();
              const style = getComputedStyle(element);
              return {
                selector,
                y: box.y,
                height: box.height,
                margin: style.margin,
                padding: style.padding,
              };
            }),
          ),
          null,
          2,
        ),
        contentType: "application/json",
      });
      await expect
        .poll(
          async () => (await page.locator(".match-dashboard").boundingBox())!.y,
        )
        .toBeLessThan(760);
      await expect
        .poll(async () => {
          const box = (await page.locator(".match-dashboard").boundingBox())!;
          return box.y + box.height;
        })
        .toBeLessThanOrEqual(941);
    }
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
      path: testInfo.outputPath(`console-${width}.png`),
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1560, height: 900 });
  await page.getByRole("button", { name: "العربية", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await verifyBrandHeader(page, 1560);
  await page.screenshot({
    path: testInfo.outputPath("console-arabic.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "فتح القائمة", exact: true }).click();
  const navigation = page.getByRole("dialog", { name: "التنقل الرئيسي" });
  await expect(navigation).toBeVisible();
  await navigation
    .getByRole("link", { name: "معمل الفيديو", exact: true })
    .focus();
  await page.keyboard.press("Escape");
  await expect(navigation).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "فتح القائمة", exact: true }),
  ).toBeFocused();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    )
    .toBe(true);
  await expect(separator).toBeHidden();
  await expect(rail).toBeVisible();
  const layoutTrigger = page.locator(".layout-menu > summary");
  await openVideoSettings(page);
  await expect
    .poll(async () => (await layoutTrigger.boundingBox())!.height)
    .toBeGreaterThanOrEqual(44);
  await layoutTrigger.click();
  await expect(page.locator(".layout-menu > .layout-controls")).toBeVisible();
  const menuBox = (await page
    .locator(".layout-menu > .layout-controls")
    .boundingBox())!;
  expect(menuBox.x).toBeGreaterThanOrEqual(0);
  expect(menuBox.x + menuBox.width).toBeLessThanOrEqual(390);
  await page.keyboard.press("Escape");
  await expect(layoutTrigger).toBeFocused();
  await layoutTrigger.click();
  await page.locator(".video-settings > summary").click();
  await expect(page.locator(".layout-menu")).not.toHaveAttribute("open");
  await expect(page.locator(".video-settings")).not.toHaveAttribute("open");
  await page.screenshot({
    path: testInfo.outputPath("console-mobile.png"),
    fullPage: true,
  });
  await verifyReview(page);
  if (process.env.HBI_VISUAL_MATCH) await verifyPresentation(page);
  await verifyHeaderDetails(page, request);
});
