import { test, expect } from "./fixture";
test("online source API contract: timing, shots, offline guard and evidence clip", async ({
  page,
  context,
}) => {
  test.setTimeout(300000);
  // Contract fixture only: no fabricated events enter the production database.
  await page.route("https://www.youtube.com/iframe_api", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: `
    window.YT={Player:class {
      constructor(mount,options){this.time=0;this.state=2;this.options=options;this.frame=document.createElement('iframe');this.frame.title='YouTube contract fixture';mount.replaceWith(this.frame);queueMicrotask(()=>options.events.onReady());}
      getDuration(){return 60;}getCurrentTime(){return this.time;}getPlayerState(){return this.state;}
      getAvailablePlaybackRates(){return [.5,1,2];}seekTo(time){this.time=time;this.options.events.onStateChange();}
      playVideo(){this.state=1;this.options.events.onStateChange();}pauseVideo(){this.state=2;this.options.events.onStateChange();}
      mute(){}unMute(){}setVolume(){}setPlaybackRate(){}destroy(){this.frame.remove();}
    }};window.onYouTubeIframeAPIReady();
  `,
    }),
  );
  await page.goto("/login");
  await page.getByLabel("Email").fill("coach@example.test");
  await page.getByLabel("Password").fill("test-password");
  await page.getByRole("button", { name: "Enter HBI" }).click();
  await expect(page.getByText("HBI Test Club").first()).toBeAttached();
  await page.getByRole("button", { name: "English", exact: true }).click();
  await page.getByRole("link", { name: "Video Lab", exact: true }).click();
  await page
    .getByLabel("Match", { exact: true })
    .selectOption("50000000-0000-4000-8000-000000000001");
  await page
    .getByLabel("YouTube video URL")
    .fill("https://youtu.be/q-_grNLweEE");
  await page
    .getByRole("button", { name: "Attach source", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Agree to privacy & terms · Load YouTube player",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", { name: "Forward 5 seconds", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Forward 5 seconds", exact: true })
    .click();
  await expect(page.locator(".transport-time")).toHaveText("0:05 / 1:00");
  await page.getByRole("button", { name: "Goal", exact: true }).click();
  await expect(
    page.locator(".entity-list article").filter({ hasText: "shot" }),
  ).toHaveCount(1);
  await expect(
    page.locator(".entity-list article").filter({ hasText: "shot" }),
  ).toContainText("0:05");
  await context.setOffline(true);
  await expect(
    page.getByRole("button", { name: "Goal", exact: true }),
  ).toBeDisabled();
  await context.setOffline(false);
  await expect(
    page.getByRole("button", { name: "Forward 5 seconds", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Evidence clip" }).first().click();
  await page.getByRole("link", { name: "Playlists", exact: true }).click();
  await page.getByText("All clips", { exact: true }).click();
  await page.getByRole("button", { name: "shot 0:05", exact: true }).click();
  // The same workspace's explicit choice carries into its meeting/clip players.
  await expect(page.locator(".clip-player iframe")).toBeVisible();
});
