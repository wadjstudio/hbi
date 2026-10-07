/** Verify the standalone pilot page against a real local video; no app/server login. */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";

const args = process.argv.slice(2);
const argument = (key) => {
  const value = args[args.indexOf(key) + 1];
  if (!args.includes(key) || !value) throw new Error(`Missing ${key}`);
  return path.resolve(value);
};
const reviewPath = argument("--review");
const videoPath = argument("--video");
const html = await fs.readFile(reviewPath, "utf8");
const data = JSON.parse(
  html.match(
    /<script type="application\/json" id="data">([\s\S]*?)<\/script>/,
  )[1],
);
assert.equal(data.analysis.status, "completed");
assert.equal(data.analysis.confirmed_event_count, 0);
assert.match(data.source.edge_sha256, /^[a-f0-9]{64}$/);
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [],
    external = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (/^https?:/.test(request.url())) external.push(request.url());
  });
  await page.goto(pathToFileURL(reviewPath).href);
  await page
    .getByRole("heading", { name: "مراجعة تجربة التحليل المحلي" })
    .waitFor();
  assert.equal(
    await page.locator(".candidate").count(),
    data.candidates.length,
  );
  const videoButton = page
    .getByRole("button", { name: "مشاهدة الدليل" })
    .first();
  assert.ok(await videoButton.isDisabled());
  await page
    .locator("#file")
    .setInputFiles({
      name: "wrong.mp4",
      mimeType: "video/mp4",
      buffer: Buffer.from("wrong"),
    });
  await page
    .getByRole("status")
    .filter({ hasText: "حجم الملف مختلف" })
    .waitFor();
  await page.locator("#file").setInputFiles(videoPath);
  await page
    .getByRole("status")
    .filter({ hasText: "الملف مطابق وجاهز" })
    .waitFor({ timeout: 30000 });
  assert.ok(await videoButton.isEnabled());
  if (data.candidates.length) {
    await videoButton.click();
    await page.waitForFunction(
      () => document.querySelector("#video").currentTime > 0,
    );
    const current = await page.locator("#video").evaluate((video) => {
      video.pause();
      return video.currentTime;
    });
    assert.ok(
      Math.abs(
        current - Math.max(0, data.candidates[0].video_start_ms / 1000 - 8),
      ) < 3,
    );
    await page
      .getByRole("button", { name: "قبول للمراجعة", exact: true })
      .first()
      .click();
    assert.equal(
      await page.locator('.candidate[data-decision="accepted"]').count(),
      1,
    );
    const download = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "تصدير قرارات المراجعة JSON" })
      .click();
    const result = await download;
    const exported = JSON.parse(await fs.readFile(await result.path(), "utf8"));
    assert.deepEqual(exported.confirmed_events, []);
    assert.equal(exported.source_sha256, data.source.sha256);
    assert.equal(exported.decisions[0].decision, "accepted");
    await page.getByRole("button", { name: "إلغاء القرار" }).first().click();
    assert.equal(
      await page.locator('.candidate[data-decision="accepted"]').count(),
      0,
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  );
  await page.screenshot({
    path: path.join(path.dirname(reviewPath), "review-mobile.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: path.join(path.dirname(reviewPath), "review-desktop.png"),
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  console.log(
    "PASS: real-file relink, wrong-file rejection, evidence seeking, review/export/undo, responsive page, no external network or runtime errors",
  );
} finally {
  await browser.close();
}
