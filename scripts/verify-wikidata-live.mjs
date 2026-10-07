// Optional live CORS probe; excluded from CI's deterministic contract tests.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { chromium } from "@playwright/test";
const browser = await chromium.launch({
  channel: process.env.HBI_BROWSER_CHANNEL || "chrome",
  headless: true,
});
const server = createServer((_, response) =>
  response.end("<!doctype html><title>SESEN local source probe</title>"),
);
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
try {
  const page = await browser.newPage();
  page.on("requestfailed", (request) =>
    console.log(
      JSON.stringify({
        failed: request.url(),
        reason: request.failure()?.errorText,
      }),
    ),
  );
  page.on("console", (message) => {
    if (message.type() === "error") console.log(message.text());
  });
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const result = await page.evaluate(async () => {
    const response = await fetch(
      "https://www.wikidata.org/wiki/Special:EntityData/Q18921300.json",
      {
        credentials: "omit",
        signal: AbortSignal.timeout(30000),
      },
    );
    const data = await response.json();
    const entity = data.entities?.Q18921300;
    return {
      status: response.status,
      revision: entity?.lastrevid,
      labelAr: entity?.labels.ar?.value,
      handball: entity?.claims.P106.some(
        (c) =>
          c.rank !== "deprecated" &&
          c.mainsnak.datavalue?.value.id === "Q12840545",
      ),
    };
  });
  assert.equal(result.status, 200);
  assert.equal(result.handball, true);
  assert.equal(typeof result.revision, "number");
  assert.equal(result.labelAr, "أحمد الأحمر");
  console.log(
    JSON.stringify({
      probe: "known Wikidata item; live browser CORS",
      ...result,
    }),
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
