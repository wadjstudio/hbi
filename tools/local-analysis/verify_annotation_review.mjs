/** Browser acceptance: synthetic human edits on real or fixture media, never delivered labels. */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { chromium } from "@playwright/test";
import {
  normalBox,
  validateReview,
  visibleSuggestionBox,
} from "./annotation_contract.mjs";

const directory = process.argv[2] ? path.resolve(process.argv[2]) : null;
const assets = new Map([
  ["index.html", "annotation_review.html"],
  ["annotation_review.mjs", "annotation_review.mjs"],
  ["annotation_contract.mjs", "annotation_contract.mjs"],
  ["annotation_review.css", "annotation_review.css"],
]);
const fixture = {
  schema: "sesen.annotation-sequence.v1",
  sequence_id: "a".repeat(64),
  source_sha256: "b".repeat(64),
  derivative_sha256: "d".repeat(64),
  width: 960,
  height: 540,
  frames: Array.from({ length: 4 }, (_, index) => ({
    index,
    video_ms: 2110000 + index * 100,
    scene: 1,
    image: "frame.svg",
    image_sha256: "c".repeat(64),
    person_suggestions: [
      { id: "model-1-1", box: [0.1, 0.1, 0.2, 0.4], score: 0.8 },
    ],
    ball_proposals: [],
    ball_prediction_status: "complete",
  })),
};
const sequence = directory
  ? JSON.parse(await fs.readFile(path.join(directory, "sequence.json"), "utf8"))
  : fixture;
const server = createServer(async (req, res) => {
  try {
    const name = new URL(req.url, "http://localhost").pathname.slice(1);
    if (assets.has(name)) {
      res.setHeader(
        "Content-Type",
        name.endsWith(".mjs")
          ? "text/javascript"
          : name.endsWith(".css")
            ? "text/css"
            : "text/html; charset=utf-8",
      );
      res.end(
        await fs.readFile(new URL("./" + assets.get(name), import.meta.url)),
      );
      return;
    }
    if (name === "sequence.json") {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(sequence));
      return;
    }
    if (!directory && name === "frame.svg") {
      res.setHeader("Content-Type", "image/svg+xml");
      res.end(
        '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540"><rect width="960" height="540" fill="#173642"/></svg>',
      );
      return;
    }
    if (directory && /^frames\/[0-9]{6}\.jpg$/.test(name)) {
      res.setHeader("Content-Type", "image/jpeg");
      res.end(await fs.readFile(path.join(directory, name)));
      return;
    }
    res.writeHead(404).end();
  } catch {
    res.writeHead(500).end();
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`,
  temp = await fs.mkdtemp(path.join(os.tmpdir(), "sesen-annotation-test-"));
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    }),
    errors = [],
    external = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (/^https?:/.test(r.url()) && !r.url().startsWith(origin + "/"))
      external.push(r.url());
  });
  const ready = async (p = page) =>
    p.waitForFunction(
      () =>
        !document.querySelector("#export").disabled &&
        !document.querySelector("#stage").classList.contains("loading") &&
        document.querySelector("#image").complete,
    );
  await page.goto(origin + "/index.html");
  await ready();
  if (directory)
    await page.screenshot({
      path: path.join(directory, "review-desktop.png"),
      fullPage: true,
    });
  async function numericBox(values) {
    for (let i = 0; i < 4; i++)
      await page
        .locator("#" + ["x1", "y1", "x2", "y2"][i])
        .fill(String(values[i] * 100));
    await page.locator("#set-box").click();
  }
  await numericBox([0.25, 0.3, 0.27, 0.33]);
  assert.match(await page.locator("#ball-status").innerText(), /مرئية/);
  await page.locator("#role").selectOption("player");
  await page.locator("#kit").selectOption("white");
  await page.locator("#predictions button").first().click();
  assert.equal(await page.locator("#people .row").count(), 1);
  await page.locator("#tool").selectOption("person");
  await page.locator("#person-id").fill("p2");
  await numericBox([0.4, 0.2, 0.5, 0.6]);
  assert.equal(await page.locator("#people .row").count(), 2);
  await page.locator("#people-complete").check();
  await numericBox([0.41, 0.2, 0.51, 0.6]);
  assert.equal(await page.locator("#people-complete").isChecked(), false);
  await page.locator("#undo").click();
  assert.equal(await page.locator("#people-complete").isChecked(), true);
  await page.locator("#redo").click();
  assert.equal(await page.locator("#people-complete").isChecked(), false);
  await page.locator("#person-id").fill("<script>invalid</script>");
  await numericBox([0.6, 0.2, 0.7, 0.6]);
  assert.equal(await page.locator("#people .row").count(), 2);
  assert.match(await page.locator("#status").innerText(), /هوية/);
  let releaseImage;
  if (directory) {
    const delayed = new Promise((resolve) => {
      releaseImage = resolve;
    });
    await page.route("**/frames/000002.jpg", async (route) => {
      await delayed;
      await route.continue();
    });
  }
  await page.locator("#next").click();
  if (directory) {
    await page.waitForFunction(() =>
      document.querySelector("#stage").classList.contains("loading"),
    );
    await page.locator("#ball-hidden").click();
    assert.match(await page.locator("#status").innerText(), /انتظر/);
    releaseImage();
  }
  await ready();
  assert.equal(await page.locator("#people .row").count(), 0);
  assert.match(await page.locator("#ball-status").innerText(), /لم تُراجع/);
  await page.locator("#ball-hidden").click();
  await page.locator("#next").click();
  await ready();
  await page.locator("#ball-uncertain").click();
  await page.locator("#previous").click();
  await ready();
  await page.locator("#previous").click();
  await ready();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.locator("#zoom").selectOption("2");
  await page.locator("#tool").selectOption("ball");
  await page.locator("#overlay").scrollIntoViewIfNeeded();
  const bounds = await page.locator("#overlay").boundingBox();
  await page.mouse.move(bounds.x + 40, bounds.y + 40);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 60, bounds.y + 60, { steps: 3 });
  await page.mouse.up();
  const pending = page.waitForEvent("download");
  await page.locator("#export").click();
  const download = await pending,
    filename = path.join(temp, "synthetic-review.json");
  await download.saveAs(filename);
  const review = JSON.parse(await fs.readFile(filename, "utf8"));
  validateReview(sequence, review);
  assert.deepEqual(review.confirmed_events, []);
  assert.equal(review.approved_for_training, false);
  const first = review.frames.find((f) => f.frame_index === 0);
  assert.equal(first.persons.length, 2);
  assert.ok(Math.abs(first.ball.box[0] - 40 / bounds.width) < 0.01);
  assert.ok(Math.abs(first.ball.box[2] - 60 / bounds.width) < 0.01);
  assert.equal(first.source_video_ms, sequence.frames[0].video_ms);
  assert.equal(first.image_sha256, sequence.frames[0].image_sha256);
  assert.equal(
    review.frames.find((f) => f.frame_index === 1).ball.status,
    "not_visible",
  );
  assert.equal(
    review.frames.find((f) => f.frame_index === 2).ball.status,
    "uncertain",
  );
  await page.locator("#import").setInputFiles(filename);
  await page.waitForFunction(() =>
    document.querySelector("#status").textContent.includes("تعديلات قائمة"),
  );
  assert.equal(await page.locator("#people .row").count(), 2);
  const fresh = await browser.newPage();
  await fresh.goto(origin + "/index.html");
  await ready(fresh);
  const wrong = path.join(temp, "wrong-source.json");
  await fs.writeFile(
    wrong,
    JSON.stringify({ ...review, source_sha256: "e".repeat(64) }),
  );
  await fresh.locator("#import").setInputFiles(wrong);
  await fresh.waitForFunction(() =>
    document.querySelector("#status").textContent.includes("لا تخص"),
  );
  assert.equal(await fresh.locator("#people .row").count(), 0);
  await fresh.locator("#import").setInputFiles(filename);
  await fresh.waitForFunction(() =>
    document.querySelector("#status").textContent.includes("استُعيدت"),
  );
  assert.equal(await fresh.locator("#people .row").count(), 2);
  assert.match(await fresh.locator("#ball-status").innerText(), /مرئية/);
  assert.deepEqual(
    visibleSuggestionBox([-0.01, 0.1, 0.2, 1.01]),
    [0, 0.1, 0.2, 1],
  );
  assert.throws(() => visibleSuggestionBox([1.1, 0.1, 1.2, 0.2]));
  assert.throws(() => visibleSuggestionBox([0, 0, NaN, 1]));
  for (const b of [
    [0, 0, 0, 1],
    [0, 0, 2, 1],
    [false, 0, 1, 1],
  ])
    assert.throws(() => normalBox(b));
  assert.throws(() =>
    validateReview(sequence, { ...review, frames: [...review.frames, first] }),
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  console.log(
    JSON.stringify({
      passed: true,
      media: directory ? "actual 120-frame sequence" : "synthetic fixture",
      synthetic_review: filename,
      checks:
        "draw/resize, accepted and missing persons, edit/reset completeness, undo/redo, separate frames, unknown ball exclusion, source-bound export/import, no overwrite, injection-safe IDs, mobile overflow, no external requests/page errors",
    }),
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
