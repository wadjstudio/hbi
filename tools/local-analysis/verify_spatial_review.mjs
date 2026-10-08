/** Standalone spatial UI behaviour. Fixtures are synthetic and never user feedback. */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { chromium } from "@playwright/test";

const template = await fs.readFile(
  new URL("./spatial_review.html", import.meta.url),
);
const real = process.argv[2] ? path.resolve(process.argv[2]) : null;
const fixture = {
  schema: "sesen.spatial-proposals.v1",
  source_sha256: "a".repeat(64),
  model_sha256: "b".repeat(64),
  frames: Array.from({ length: 8 }, (_, index) => ({
    index,
    video_ms: 2100000 + index * 5000,
    scene: 1,
    image: "frame.svg",
    image_sha256: "c".repeat(64),
    width: 960,
    height: 540,
    tracks: [
      {
        track_id: 1,
        box: [100, 100, 200, 300],
        jersey_colour: { group: "red", support: 0.8 },
      },
    ],
    ball_proposals: [{ box: [400, 200, 420, 220], score: 0.12 }],
  })),
};
const server = createServer(async (req, res) => {
  try {
    const name = new URL(req.url, "http://localhost").pathname.slice(1);
    if (name === "index.html") {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(real ? await fs.readFile(path.join(real, name)) : template);
      return;
    }
    if (name === "proposals.json") {
      res.setHeader("Content-Type", "application/json");
      res.end(
        real
          ? await fs.readFile(path.join(real, name))
          : JSON.stringify(fixture),
      );
      return;
    }
    if (!real && name === "frame.svg") {
      res.setHeader("Content-Type", "image/svg+xml");
      res.end(
        '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540"><rect width="960" height="540" fill="#23404b"/></svg>',
      );
      return;
    }
    if (real && /^source-frame-\d{4}\.jpg$/.test(name)) {
      res.setHeader("Content-Type", "image/jpeg");
      res.end(await fs.readFile(path.join(real, name)));
      return;
    }
    res.writeHead(404).end();
  } catch {
    res.writeHead(500).end();
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ channel: "chrome", headless: true });
const temp = await fs.mkdtemp(path.join(os.tmpdir(), "sesen-spatial-test-"));
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
  await page.goto(origin + "/index.html");
  await page.waitForFunction(() => !document.querySelector("#export").disabled);
  const expected = real
    ? JSON.parse(await fs.readFile(path.join(real, "proposals.json"), "utf8"))
    : fixture;
  assert.equal(await page.locator("#frames option").count(), 8);
  await page.locator("#ball-x").fill("25");
  await page.locator("#ball-y").fill("50");
  await page.locator("#set-ball").click();
  const person = page.locator("#people select").first();
  await person.selectOption("unknown");
  await page.locator("#people button").first().click();
  await page.locator("#next").click();
  assert.equal(await page.locator("#ball-x").inputValue(), "");
  await page.locator("#previous").click();
  assert.equal(await page.locator("#ball-x").inputValue(), "25.0");
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.locator("#overlay").click({ position: { x: 100, y: 60 } });
  const box = await page.locator("#overlay").boundingBox();
  await page.locator("#mode").selectOption("anchor");
  await page.locator("#overlay").click({ position: { x: 50, y: 50 } });
  assert.match(await page.locator("#status").innerText(), /أدخل/);
  await page.locator("#court-x").fill("0");
  await page.locator("#court-y").fill("20");
  await page.locator("#overlay").click({ position: { x: 50, y: 50 } });
  const pending = page.waitForEvent("download");
  await page.locator("#export").click();
  const download = await pending;
  const filename = path.join(temp, "synthetic-test-feedback.json");
  await download.saveAs(filename);
  const output = JSON.parse(await fs.readFile(filename, "utf8"));
  assert.equal(output.schema, "sesen.spatial-feedback.v1");
  assert.equal(output.source_sha256, expected.source_sha256);
  assert.deepEqual(output.confirmed_events, []);
  assert.equal(output.calibration_status, "pending_validation");
  const first = output.frames.find(
    (f) => f.frame_index === expected.frames[0].index,
  );
  assert.equal(first.video_ms, expected.frames[0].video_ms);
  assert.equal(first.image_sha256, expected.frames[0].image_sha256);
  assert.ok(Math.abs(first.ball.point[0] - 100 / box.width) < 0.01);
  assert.ok(Math.abs(first.ball.point[1] - 60 / box.height) < 0.01);
  assert.deepEqual(first.anchors[0].court_point, [0, 20]);
  assert.equal(Object.values(first.people)[0].excluded, true);
  assert.equal(Object.values(first.people)[0].colour, "unknown");
  await page.locator("#clear-ball").click();
  assert.equal(await page.locator("#ball-x").inputValue(), "");
  await page.locator("#clear-anchors").click();
  assert.equal(await page.locator("#anchors .anchor").count(), 0);
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  if (real)
    await page.screenshot({
      path: path.join(real, "review-mobile.png"),
      fullPage: true,
    });
  console.log(
    `PASS ${real ? "real proposals" : "synthetic fixture"}: source-bound export, resize-normalised points, frame separation, colour corrections, exclusions, pending calibration, clear actions, no overflow/external requests/page errors. Synthetic test feedback: ${filename}`,
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
