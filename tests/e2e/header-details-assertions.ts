import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
type RecordRow = { id: string; revision: number; [key: string]: unknown };
export const verifyHeaderDetails = async (
  page: Page,
  request: APIRequestContext,
) => {
  const base = `http://127.0.0.1:${process.env.HBI_MOCK_PORT || 54329}/rest/v1`;
  const list = async (table: string) =>
    (await (await request.get(`${base}/${table}`)).json()) as RecordRow[];
  const match = (await list("matches")).find(
    (row) => row.id === "50000000-0000-4000-8000-000000000001",
  )!;
  const home = (await list("teams")).find(
    (row) => row.id === match.home_team_id,
  )!;
  const away = (await list("teams")).find(
    (row) => row.id === match.away_team_id,
  )!;
  const competition = (await list("competitions")).find(
    (row) => row.id === match.competition_id,
  )!;
  const update = async (table: string, value: RecordRow) => {
    const current = (await list(table)).find((row) => row.id === value.id)!;
    const response = await request.post(`${base}/rpc/apply_workspace_change`, {
      data: {
        p_table: table,
        p_row: value,
        p_expected_revision: current.revision,
        p_operation_id: randomUUID(),
        p_delete: false,
      },
    });
    expect(response.ok()).toBe(true);
    expect((await response.json()).status).toBe("applied");
  };
  const longHome = `نادي الفريق الأول لكرة اليد ${"HOMEIDENTITY".repeat(12)}`;
  const longAway = `نادي الفريق المنافس لكرة اليد ${"AWAYIDENTITY".repeat(12)}`;
  const longCompetition = `بطولة تجريبية لا تمثل بيانات مباراة ${"COMPETITION".repeat(12)}`;
  const longVenue = `صالة تجريبية ببيانات طويلة ${"VENUE".repeat(30)}`;
  const originals: [string, RecordRow][] = [
    ["matches", match],
    ["teams", home],
    ["teams", away],
    ["competitions", competition],
  ];
  try {
    await update("teams", { ...home, name: longHome, short_name: null });
    await update("teams", { ...away, name: longAway, short_name: null });
    await update("competitions", { ...competition, name: longCompetition });
    await update("matches", {
      ...match,
      starts_at: "2025-01-24T12:00:00Z",
      venue: longVenue,
    });
    await page.setViewportSize({ width: 1672, height: 941 });
    await page.goto(`/matches/${match.id}`);
    if (process.env.HBI_VISUAL_MATCH) {
      await page
        .getByLabel(/Select local video|Relink/)
        .setInputFiles(process.env.HBI_VISUAL_MATCH);
      await expect(page.locator("video")).toBeVisible();
      await expect
        .poll(() =>
          page
            .locator("video")
            .evaluate(
              (video: HTMLVideoElement) =>
                video.readyState >= 2 && !video.seeking,
            ),
        )
        .toBe(true);
    }
    const details = page.locator(".match-info");
    const summary = details.locator("summary");
    const panel = details.getByRole("region");
    await expect(page.locator(".match-competition")).toContainText(
      longCompetition,
    );
    for (const width of [1672, 1024, 768, 375]) {
      await page.setViewportSize({ width, height: 941 });
      await summary.focus();
      await summary.press("Space");
      await expect(panel).toBeVisible();
      await panel.focus();
      const nativeVideo = page.locator("video");
      const sourceTime = (await nativeVideo.count())
        ? await nativeVideo.evaluate(
            (video: HTMLVideoElement) => video.currentTime,
          )
        : null;
      await panel.press("ArrowDown");
      if (sourceTime != null)
        expect(
          await nativeVideo.evaluate(
            (video: HTMLVideoElement) => video.currentTime,
          ),
        ).toBeCloseTo(sourceTime, 1);
      await expect(panel).toContainText(longHome);
      await expect(panel).toContainText(longAway);
      await expect(panel).toContainText(longVenue);
      await expect(panel).toContainText("24 Jan 2025");
      const pageBounds = await page.evaluate(() => ({
        width: innerWidth,
        scroll: document.documentElement.scrollWidth,
        overflow: Array.from(document.querySelectorAll("body *"))
          .map((element) => {
            const box = element.getBoundingClientRect();
            return {
              tag: element.tagName,
              class: element.className,
              x: box.x,
              right: box.right,
              width: box.width,
            };
          })
          .filter(
            (box) =>
              box.width > 0 && (box.x < -1 || box.right > innerWidth + 1),
          )
          .slice(0, 25),
      }));
      if (pageBounds.scroll > width + 1)
        await page.screenshot({
          path: `test-results/header-overflow-${width}.png`,
          fullPage: true,
        });
      expect(pageBounds.scroll, JSON.stringify(pageBounds)).toBeLessThanOrEqual(
        width + 1,
      );
      const bounds = (await panel.boundingBox())!;
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width + 1);
      if (width === 1672 || width === 375)
        await page.screenshot({
          path: `test-results/header-long-${width}.png`,
          fullPage: true,
        });
      await summary.press("Escape");
      await expect(details).not.toHaveAttribute("open");
      await expect(summary).toBeFocused();
    }
    await page.getByRole("button", { name: "العربية", exact: true }).click();
    await summary.click();
    await expect(panel).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await expect(panel).toContainText(longHome);
    await page.screenshot({
      path: "test-results/header-long-arabic-mobile.png",
      fullPage: true,
    });
    expect((await summary.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await page.getByRole("button", { name: "English", exact: true }).click();
    await expect(details).not.toHaveAttribute("open");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await update("matches", { ...match, starts_at: null, venue: "" });
    await page.reload();
    await summary.click();
    await expect(panel).toContainText("Date not recorded");
    await expect(panel).toContainText("Venue not set");
  } finally {
    for (const [table, row] of originals) await update(table, row);
    await page.reload();
  }
};
