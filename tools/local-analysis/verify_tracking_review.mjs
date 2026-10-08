/** Real-media acceptance for the standalone tracking comparison and feedback. */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const directory = path.resolve(process.argv[2] ?? "");
const allowed = new Set([
  "index.html",
  "comparison-preview.mp4",
  "updated-preview.mp4",
  "raw-preview.mp4",
]);
const server = createServer(async (request, response) => {
  try {
    const name = new URL(request.url, "http://localhost").pathname.slice(1);
    if (!allowed.has(name)) {
      response.writeHead(404).end();
      return;
    }
    const file = path.join(directory, name);
    const stat = await fs.stat(file);
    const range = request.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    const start = range ? Number(range[1]) : 0;
    const end = range?.[2]
      ? Math.min(Number(range[2]), stat.size - 1)
      : stat.size - 1;
    if (start > end || start >= stat.size) {
      response
        .writeHead(416, { "Content-Range": `bytes */${stat.size}` })
        .end();
      return;
    }
    const headers = {
      "Content-Type": name.endsWith("mp4")
        ? "video/mp4"
        : "text/html; charset=utf-8",
      "Content-Length": end - start + 1,
      "Accept-Ranges": "bytes",
    };
    if (range) headers["Content-Range"] = `bytes ${start}-${end}/${stat.size}`;
    response.writeHead(range ? 206 : 200, headers);
    createReadStream(file, { start, end }).pipe(response);
  } catch {
    response.writeHead(500).end();
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [],
    external = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (
      /^https?:/.test(request.url()) &&
      !request.url().startsWith(origin + "/")
    )
      external.push(request.url());
  });
  await page.goto(origin + "/index.html");
  await page.waitForFunction(
    () => document.querySelector("video").duration === 60,
  );
  await page.locator("video").evaluate((video) => {
    video.currentTime = 12.3;
  });
  await page.waitForFunction(() => !document.querySelector("video").seeking);
  await page
    .getByRole("button", { name: "النسخة الجديدة بحجم كامل", exact: true })
    .click();
  await page.waitForFunction(
    () => Math.abs(document.querySelector("video").currentTime - 12.3) < 0.05,
  );
  await page.locator("#speed").selectOption("0.5");
  assert.equal(
    await page.locator("video").evaluate((video) => video.playbackRate),
    0.5,
  );
  const comment = "مراجعة التحام <script>throw new Error('injected')</script>";
  await page.getByLabel("وصف الملاحظة").fill(comment);
  await page
    .getByRole("button", {
      name: "إضافة الملاحظة عند الزمن الحالي",
      exact: true,
    })
    .click();
  assert.equal(await page.locator("#notes li").count(), 1);
  assert.match(await page.locator("#notes li").innerText(), /<script>/);
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "تصدير الملاحظات JSON", exact: true })
    .click();
  const download = await pending;
  const filename = path.join(directory, "browser-feedback-check.json");
  await download.saveAs(filename);
  const result = JSON.parse(await fs.readFile(filename, "utf8"));
  assert.equal(result.schema, "sesen.tracking-feedback.v1");
  assert.equal(result.notes[0].preview_ms, 12300);
  assert.equal(result.notes[0].source_video_ms, 2112300);
  assert.equal(result.notes[0].comment, comment);
  assert.deepEqual(result.confirmed_events, []);
  assert.match(result.source_sha256, /^[a-f0-9]{64}$/);
  await page.screenshot({
    path: path.join(directory, "review-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.screenshot({
    path: path.join(directory, "review-mobile.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "حذف", exact: true }).click();
  assert.equal(await page.locator("#notes li").count(), 0);
  assert.equal(
    await page
      .getByRole("button", { name: "تصدير الملاحظات JSON", exact: true })
      .isDisabled(),
    true,
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  console.log(
    "PASS real 60s media, view/time/speed, timestamped safe notes, feedback export/delete, narrow layout; no external requests or page errors",
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
