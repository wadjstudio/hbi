import { test, expect } from "./fixture";
test("local video to offline shot, opponent evidence and meeting", async ({
  page,
  context,
}) => {
  test.setTimeout(300000);
  await page.goto("/login");
  await page.getByLabel("Email").fill("coach@example.test");
  await page.getByLabel("Password").fill("test-password");
  await page.getByRole("button", { name: "Enter HBI" }).click();
  await expect(page.getByText("HBI Test Club").first()).toBeAttached();
  await page.getByRole("button", { name: "English", exact: true }).click();
  // A small local fixture generated entirely through browser media APIs.
  const media = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#102536";
    ctx.fillRect(0, 0, 640, 360);
    const stream = canvas.captureStream(25),
      mime = "video/mp4";
    if (!MediaRecorder.isTypeSupported(mime)) {
      stream.getTracks().forEach((t) => t.stop());
      return null;
    }
    const recorder = new MediaRecorder(stream, { mimeType: mime }),
      chunks: Blob[] = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    const stopped = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });
    recorder.start();
    let frame = 0;
    const draw = setInterval(() => {
      ctx.fillStyle = frame++ % 2 ? "#183d53" : "#102536";
      ctx.fillRect(0, 0, 640, 360);
    }, 40);
    await new Promise((resolve) => setTimeout(resolve, 2100));
    clearInterval(draw);
    recorder.stop();
    await stopped;
    stream.getTracks().forEach((t) => t.stop());
    return {
      mime,
      bytes: Array.from(
        new Uint8Array(await new Blob(chunks, { type: mime }).arrayBuffer()),
      ),
    };
  });
  test.skip(!media, "Browser cannot record MP4 fixtures");
  await page.getByRole("link", { name: "Video Lab", exact: true }).click();
  await page
    .getByLabel("Match", { exact: true })
    .selectOption("50000000-0000-4000-8000-000000000001");
  await page.getByLabel("Select local video", { exact: false }).setInputFiles({
    name: "match.mp4",
    mimeType: media!.mime,
    buffer: Buffer.from(media!.bytes),
  });
  await expect(page.locator("video")).toBeVisible();
  await page.getByText("Calibrate match clock", { exact: true }).click();
  await page.getByRole("button", { name: "Add clock segment" }).click();
  await expect(
    page.getByText("Match clock not calibrated", { exact: true }),
  ).toHaveCount(0);
  await page
    .getByText("Tagging details · team, participants & context", {
      exact: true,
    })
    .click();
  await page
    .getByRole("combobox", { name: "Result", exact: true })
    .selectOption("goal");
  await page
    .getByText("Drawing, clips & source sharing", { exact: true })
    .click();
  await page
    .getByLabel("Team", { exact: true })
    .selectOption("30000000-0000-4000-8000-000000000002");
  await page
    .getByLabel("Player", { exact: true })
    .first()
    .selectOption("40000000-0000-4000-8000-000000000002");
  await page
    .getByLabel("Goalkeeper", { exact: true })
    .selectOption("40000000-0000-4000-8000-000000000001");
  await page.getByText("Possession tactics", { exact: true }).click();
  await page.getByLabel("Cross attack_action").check();
  for (let i = 0; i < 3; i++) {
    await page.locator("video").evaluate(
      (video, seconds) => {
        const v = video as HTMLVideoElement;
        v.currentTime = seconds;
        v.dispatchEvent(new Event("timeupdate"));
      },
      i * 0.5 + 0.1,
    );
    await page
      .getByRole("button", { name: "Start possession", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "End possession", exact: true }),
    ).toBeEnabled();
    if (i === 0) await context.setOffline(true);
    await page
      .getByRole("button", { name: "Save event [T]", exact: true })
      .click();
    await expect(
      page.locator(".entity-list article").filter({ hasText: "shot" }),
    ).toHaveCount(i + 1);
    if (i === 0) {
      await page.getByRole("button", { name: "Undo", exact: true }).click();
      await expect(
        page.locator(".entity-list article").filter({ hasText: "shot" }),
      ).toHaveCount(0);
      await page.getByRole("button", { name: "Redo", exact: true }).click();
      await expect(
        page.locator(".entity-list article").filter({ hasText: "shot" }),
      ).toHaveCount(1);
    }
    await page.locator("video").evaluate(
      (video, seconds) => {
        const v = video as HTMLVideoElement;
        v.currentTime = seconds;
        v.dispatchEvent(new Event("timeupdate"));
      },
      i * 0.5 + 0.4,
    );
    await page
      .getByRole("button", { name: "End possession", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "End possession", exact: true }),
    ).toBeDisabled();
    if (i === 0) {
      await context.setOffline(false);
      await page.getByRole("button", { name: "Sync & backup" }).click();
      await page.getByRole("button", { name: "Sync", exact: true }).click();
      await page.getByRole("button", { name: "Sync & backup" }).click();
    }
  }
  await page.getByRole("button", { name: "Evidence clip" }).first().click();
  await page.getByRole("link", { name: "Opponents", exact: true }).click();
  await page
    .getByRole("button", { name: "Save evidence-backed insight" })
    .click();
  await page.getByRole("button", { name: "Watch evidence" }).first().click();
  await expect(page.locator('a[href*="?event="]').first()).toBeVisible();
  await page.getByRole("link", { name: "Meetings", exact: true }).click();
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByLabel("Meeting title").fill("Opponent preparation");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("link", { name: "Opponent preparation" }).click();
  await page
    .getByLabel("Content type", { exact: true })
    .selectOption("insight");
  await page.getByLabel("Content", { exact: true }).selectOption({ index: 1 });
  await page.getByRole("button", { name: "Add to meeting" }).click();
  await expect(
    page.getByRole("heading", { name: "Cross · 3/3", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Content type", { exact: true }).selectOption("clip");
  await page.getByLabel("Content", { exact: true }).selectOption({ index: 1 });
  await page.getByRole("button", { name: "Add to meeting" }).click();
  await expect(page.getByText("1/2", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Present", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Exit", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("2/2", { exact: true })).toBeVisible();
  await expect(page.locator("video")).toBeVisible();
  await expect(page.locator("video")).toHaveAttribute("src", /^blob:/);
});
