import { test, expect } from "./fixture";

test("uses supplied identities, preserves image geometry and updates only the own account profile", async ({
  page,
  request,
}, testInfo) => {
  test.setTimeout(240000);
  const imageRequests: string[] = [];
  await page.route("https://identity.sesen.test/**", async (route) => {
    imageRequests.push(route.request().url());
    expect(route.request().headers().referer).toBeUndefined();
    // Abstract test identities, not official club emblems or athlete photographs.
    const isTeam = route.request().url().includes("team-");
    await route.fulfill({
      contentType: "image/svg+xml",
      body: `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="96" viewBox="0 0 80 96"><rect width="80" height="96" rx="12" fill="#102b30"/><${isTeam ? 'path d="M40 10 68 28 60 70 40 86 20 70 12 28Z"' : 'circle cx="40" cy="30" r="15"'} fill="#d8b476"/>${isTeam ? "" : '<path d="M10 90Q10 49 40 49T70 90" fill="#00c7ce"/>'}<text x="40" y="92" fill="white" text-anchor="middle" font-size="8">SAMPLE</text></svg>`,
    });
  });
  await request.post(
    `http://127.0.0.1:${process.env.HBI_MOCK_PORT || 54329}/test/console-data`,
    { data: { dense: true, identity: true } },
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
  const crests = page.locator('[data-slot="team-crest"] img.identity-photo');
  await expect(crests).toHaveCount(2);
  await expect
    .poll(() =>
      crests.evaluateAll((images) =>
        images.every(
          (image) =>
            (image as HTMLImageElement).complete &&
            (image as HTMLImageElement).naturalWidth > 0,
        ),
      ),
    )
    .toBe(true);
  await expect(crests.first()).toHaveCSS("object-fit", "contain");
  const playerPhoto = page
    .locator(".player-threat-row img.identity-photo")
    .first();
  await expect(playerPhoto).toBeVisible();
  await expect(playerPhoto).toHaveCSS("object-fit", "cover");
  const crest = page.locator('[data-slot="team-crest"]').first();
  const geometry = await crest.boundingBox();
  const imageBounds = (await crests.first().boundingBox())!;
  expect(imageBounds.height).toBeLessThanOrEqual(geometry!.height);
  expect(imageBounds.width).toBeLessThanOrEqual(geometry!.width);
  await crests.first().dispatchEvent("error");
  await expect(crests).toHaveCount(1);
  const fallback = page.locator('[data-slot="team-crest"]').first();
  expect((await fallback.boundingBox())!.width).toBeCloseTo(geometry!.width, 0);
  expect((await fallback.boundingBox())!.height).toBeCloseTo(
    geometry!.height,
    0,
  );
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect(crests).toHaveCount(2);
  if (process.env.HBI_VISUAL_MATCH) {
    await page
      .getByLabel("Select local video", { exact: false })
      .setInputFiles(process.env.HBI_VISUAL_MATCH);
    await expect(page.locator("video")).toBeVisible();
    await expect
      .poll(() =>
        page
          .locator("video")
          .evaluate(
            (video: HTMLVideoElement) =>
              Number.isFinite(video.duration) && video.duration > 0,
          ),
      )
      .toBe(true);
    await page.locator("video").evaluate(async (video: HTMLVideoElement) => {
      const target = Math.min(12, video.duration / 2);
      video.currentTime = target;
      await new Promise<void>((resolve) => {
        const painted = (_now: number, frame: VideoFrameCallbackMetadata) => {
          if (Math.abs(frame.mediaTime - target) < 0.1) resolve();
          else video.requestVideoFrameCallback(painted);
        };
        video.requestVideoFrameCallback(painted);
      });
    });
  }
  for (const language of ["en", "ar"]) {
    if (language === "ar")
      await page.getByRole("button", { name: "العربية", exact: true }).click();
    for (const width of [1672, 1440, 1024, 768, 375]) {
      await page.setViewportSize({ width, height: width === 375 ? 844 : 941 });
      await expect(crests).toHaveCount(2);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    }
  }
  await page.setViewportSize({ width: 1672, height: 941 });
  await page.getByRole("button", { name: "English", exact: true }).click();
  await page.screenshot({
    path: testInfo.outputPath("identities-en-1672.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "العربية", exact: true }).click();
  await page.screenshot({
    path: testInfo.outputPath("identities-ar-1672.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "English", exact: true }).click();
  await page.goto("/settings");
  const apiBase = `http://127.0.0.1:${process.env.HBI_MOCK_PORT || 54329}/rest/v1`;
  const teamsPanel = page
    .locator(".panel")
    .filter({ has: page.getByRole("heading", { name: "Teams", exact: true }) });
  await teamsPanel
    .getByRole("button", { name: "Edit", exact: true })
    .first()
    .click();
  await teamsPanel
    .getByLabel("Team logo URL", { exact: true })
    .fill("https://identity.sesen.test/team-replacement.svg");
  await teamsPanel
    .getByRole("button", { name: "Preview image", exact: true })
    .click();
  await expect(teamsPanel.locator(".identity-url-preview img")).toHaveAttribute(
    "src",
    "https://identity.sesen.test/team-replacement.svg",
  );
  await teamsPanel.getByRole("button", { name: "Save", exact: true }).click();
  const savedLogo = async () =>
    (
      (await (await request.get(`${apiBase}/teams`)).json()) as {
        id: string;
        logo_url: string | null;
      }[]
    ).find((team) => team.id === "30000000-0000-4000-8000-000000000001")
      ?.logo_url;
  await expect
    .poll(savedLogo)
    .toBe("https://identity.sesen.test/team-replacement.svg");
  await page.reload();
  await teamsPanel
    .getByRole("button", { name: "Edit", exact: true })
    .first()
    .click();
  await expect(
    teamsPanel.getByLabel("Team logo URL", { exact: true }),
  ).toHaveValue("https://identity.sesen.test/team-replacement.svg");
  await teamsPanel.getByLabel("Team logo URL", { exact: true }).fill("");
  await teamsPanel.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(savedLogo).toBeNull();
  const membershipUrl = `http://127.0.0.1:${process.env.HBI_MOCK_PORT || 54329}/rest/v1/organization_members`;
  const memberships = await (await request.get(membershipUrl)).json();
  const profile = page.locator('[data-slot="account-profile"]');
  await profile
    .getByLabel("Display name", { exact: true })
    .fill("Synthetic review coach");
  await profile
    .getByLabel("Account photo URL", { exact: true })
    .fill("https://identity.sesen.test/account.svg");
  const update = page.waitForRequest(
    (req) =>
      req.method() === "PUT" && new URL(req.url()).pathname === "/auth/v1/user",
  );
  await profile
    .getByRole("button", { name: "Save profile", exact: true })
    .click();
  expect((await update).postDataJSON()).toEqual({
    code_challenge: null,
    code_challenge_method: null,
    data: {
      display_name: "Synthetic review coach",
      avatar_url: "https://identity.sesen.test/account.svg",
    },
  });
  await expect(profile.getByRole("status")).toHaveText("Profile saved.");
  expect(await (await request.get(membershipUrl)).json()).toEqual(memberships);
  await expect(
    page.locator(".account-avatar img.identity-photo"),
  ).toHaveAttribute("src", "https://identity.sesen.test/account.svg");
  await expect
    .poll(() =>
      page
        .locator(".account-avatar img.identity-photo")
        .evaluate(
          (image: HTMLImageElement) => image.complete && image.naturalWidth > 0,
        ),
    )
    .toBe(true);
  const photoBounds = (await page
    .locator(".account-avatar img.identity-photo")
    .boundingBox())!;
  const avatarBounds = (await page.locator(".account-avatar").boundingBox())!;
  expect(photoBounds.height).toBeLessThanOrEqual(avatarBounds.height);
  expect(photoBounds.width).toBeLessThanOrEqual(avatarBounds.width);
  await page.reload();
  await expect(
    page.locator(".account-avatar img.identity-photo"),
  ).toHaveAttribute("src", "https://identity.sesen.test/account.svg");
  await expect(profile).toBeVisible();
  await page.setViewportSize({ width: 375, height: 844 });
  await page.getByRole("button", { name: "العربية", exact: true }).click();
  await expect(profile.getByLabel("اسم العرض", { exact: true })).toBeVisible();
  for (const control of await profile.locator("input,button").all()) {
    const bounds = (await control.boundingBox())!;
    expect(bounds.height).toBeGreaterThanOrEqual(44);
    expect(bounds.width).toBeGreaterThanOrEqual(44);
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("profile-ar-375.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "English", exact: true }).click();
  await profile.getByLabel("Account photo URL", { exact: true }).fill("");
  await profile
    .getByRole("button", { name: "Save profile", exact: true })
    .click();
  await expect(profile.getByRole("status")).toHaveText("Profile saved.");
  await expect(page.locator(".account-avatar img.identity-photo")).toHaveCount(
    0,
  );
  await page.context().setOffline(true);
  await expect(
    profile.getByRole("button", { name: "Save profile", exact: true }),
  ).toBeDisabled();
  await page.context().setOffline(false);
  expect(imageRequests.length).toBeGreaterThan(4);
});
