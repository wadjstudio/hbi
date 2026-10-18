import { expect, type Page, type APIRequestContext } from "@playwright/test";

export async function verifyHistoricalEvidence(
  page: Page,
  request: APIRequestContext,
) {
  const primarySession = await page
    .getByLabel("Analysis session", { exact: true })
    .inputValue();
  const scope = page.getByRole("group", {
    name: "Team intelligence scope",
    exact: true,
  });
  await scope.getByRole("button", { name: "Last 3", exact: true }).click();
  await expect(page.locator(".intelligence-coverage")).toContainText("2/3");
  await page.locator(".intelligence-sample > summary").click();
  await expect(
    page.getByRole("button", { name: /Sample size 13/ }),
  ).toBeVisible();
  await expect(
    page.getByText("Wrong session insight", { exact: true }),
  ).toHaveCount(0);
  await scope.getByRole("button", { name: "Last 5", exact: true }).click();
  await expect(page.locator(".intelligence-coverage")).toContainText("2/5");
  await scope.getByRole("button", { name: "Last 10", exact: true }).click();
  await expect(page.locator(".intelligence-coverage")).toContainText("2/5");
  await page.getByRole("button", { name: /Fixture historical goal/ }).click();
  const drawer = page.getByRole("dialog", {
    name: "Fixture historical goal",
    exact: true,
  });
  await expect(drawer.locator(".evidence-source")).toHaveCount(1);
  await expect(drawer.locator(".evidence-origin")).toContainText("2025-01-20");
  await expect(drawer).toContainText(
    "Local video needs relinking before viewing",
  );
  const href =
    "/matches/a0000000-0000-4000-8000-000000000600?event=a0000000-0000-4000-8000-000000002002";
  await expect(
    drawer.getByRole("link", { name: "Open source moment", exact: true }),
  ).toHaveAttribute("href", href);
  await expect(
    drawer.getByRole("link", { name: "Open source to edit", exact: true }),
  ).toHaveAttribute("href", `${href}&edit=1`);
  await drawer
    .getByRole("button", { name: "Evidence clip", exact: true })
    .click();
  await expect
    .poll(async () => {
      const response = await request.get(
        `http://127.0.0.1:${process.env.HBI_MOCK_PORT || 54329}/rest/v1/clips`,
      );
      const clips = (await response.json()) as {
        video_id: string;
        match_id: string;
        start_ms: number;
        end_ms: number;
      }[];
      return clips.some(
        (clip) =>
          clip.match_id === "a0000000-0000-4000-8000-000000000600" &&
          clip.video_id === "a0000000-0000-4000-8000-000000002000" &&
          clip.start_ms === 0 &&
          clip.end_ms === 10000,
      );
    })
    .toBe(true);
  // Creating a historical clip must not silently replace the active match/source.
  await expect(page.getByLabel("Match", { exact: true })).toHaveValue(
    "50000000-0000-4000-8000-000000000001",
  );
  await drawer
    .getByRole("link", { name: "Open source moment", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(href.replace("?", "\\?")));
  await expect(page.getByLabel("Match", { exact: true })).toHaveValue(
    "a0000000-0000-4000-8000-000000000600",
  );
  await expect(
    page.getByLabel("Analysis session", { exact: true }),
  ).toHaveValue("a0000000-0000-4000-8000-000000002001");
  await expect(page.locator("video")).toHaveCount(0);
  await expect(page.locator(".event-editor")).not.toHaveAttribute("open");
  if (process.env.HBI_VISUAL_MATCH) {
    await page
      .getByLabel(/Select local video|Relink/)
      .setInputFiles(process.env.HBI_VISUAL_MATCH);
    await expect(page.locator("video")).toBeVisible();
    await expect
      .poll(() =>
        page.locator("video").evaluate((v: HTMLVideoElement) => v.currentTime),
      )
      .toBeCloseTo(6, 1);
    await expect
      .poll(() =>
        page.locator("video").evaluate((v: HTMLVideoElement) => v.readyState),
      )
      .toBeGreaterThanOrEqual(2);
  }
  await page.goto(`${href}&edit=1`);
  await expect(page.locator(".event-editor")).toHaveAttribute("open");
  await expect
    .poll(() =>
      page
        .locator(".event-editor")
        .getByLabel("Team", { exact: true })
        .evaluate(
          (select: HTMLSelectElement) => select.selectedOptions[0]?.textContent,
        ),
    )
    .toBe("Away");
  await expect(page.locator(".event-editor textarea").first()).toHaveValue(
    "SYNTHETIC HISTORICAL EVIDENCE",
  );
  // A direct event link also chooses its actual secondary session, never the primary by assumption.
  await page.goto(
    "/matches/50000000-0000-4000-8000-000000000001?event=a0000000-0000-4000-8000-000000001001",
  );
  await expect(
    page.getByLabel("Analysis session", { exact: true }),
  ).toHaveValue("a0000000-0000-4000-8000-000000001000");
  await expect(page.locator(".analysis-timeline")).toContainText("n=1");
  await page
    .getByRole("group", { name: "Team intelligence scope", exact: true })
    .getByRole("button", { name: "Last 3", exact: true })
    .click();
  await page.getByRole("button", { name: /Fixture cross sample/ }).click();
  await page
    .getByRole("dialog", { name: "Fixture cross sample", exact: true })
    .getByRole("link", { name: "Open source moment", exact: true })
    .first()
    .click();
  await expect(
    page.getByLabel("Analysis session", { exact: true }),
  ).toHaveValue(primarySession);
  await expect(page.locator(".event-editor")).not.toHaveAttribute("open");
  await page.getByRole("link", { name: "Video Lab", exact: true }).click();
  await expect(page).toHaveURL(/\/video-lab$/);
  await expect(page.getByLabel("Match", { exact: true })).toHaveValue("");
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
}
