import { readFile } from "node:fs/promises";
import { test, expect } from "./fixture";
const claim = (id: string) => ({
  rank: "normal",
  mainsnak: { snaktype: "value", datavalue: { value: { id } } },
});
const sample = {
  entities: {
    Q18921300: {
      id: "Q18921300",
      lastrevid: 123,
      labels: {
        ar: { value: "لاعب اختباري" },
        en: { value: "Test handball player" },
      },
      claims: { P31: [claim("Q5")], P106: [claim("Q12840545")] },
    },
  },
};

test("sources need an explicit query, preserve provenance and never write workspace records", async ({
  page,
}, testInfo) => {
  test.setTimeout(300000);
  let requests = 0,
    writes = 0;
  await page.route("https://www.wikidata.org/**", async (route) => {
    requests++;
    expect(route.request().headers().authorization).toBeUndefined();
    expect(route.request().headers().cookie).toBeUndefined();
    const search =
      new URL(route.request().url()).searchParams.get("action") ===
      "wbsearchentities";
    await route.fulfill({
      json: search ? { search: [{ id: "Q18921300" }] } : sample,
    });
  });
  await page.goto("/login");
  await page.getByLabel("Email").fill("coach@example.test");
  await page.getByLabel("Password").fill("test-password");
  await page.getByRole("button", { name: "Enter SESEN" }).click();
  await expect(page.getByText("HBI Test Club").first()).toBeAttached();
  await page.getByRole("button", { name: "English", exact: true }).click();
  await page.getByRole("link", { name: "Data sources", exact: true }).click();
  await expect(page.locator(".source-card")).toHaveCount(16);
  expect(requests).toBe(0);
  page.on("request", (request) => {
    if (request.url().includes("/rest/v1/") && request.method() !== "GET")
      writes++;
  });
  await page
    .getByRole("button", {
      name: "Tracking & video understanding",
      exact: true,
    })
    .click();
  await expect(page.locator(".source-card")).toHaveCount(7);
  await page.getByLabel("Player name or Wikidata ID").fill("Ahmed Elahmar");
  await page
    .getByRole("button", { name: "Search Wikidata", exact: true })
    .click();
  await expect(page.locator(".source-results article")).toContainText(
    "Test handball player",
  );
  expect(requests).toBe(2);
  await expect(
    page.getByRole("link", { name: "Open source revision" }),
  ).toHaveAttribute(
    "href",
    "https://www.wikidata.org/w/index.php?title=Q18921300&oldid=123",
  );
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export names and sources for review" })
    .click();
  const download = await pending;
  const target = testInfo.outputPath("candidates.json");
  await download.saveAs(target);
  const data = JSON.parse(await readFile(target, "utf-8"));
  expect(data.candidates[0]).toMatchObject({
    externalId: "Q18921300",
    license: "CC0-1.0",
    reviewStatus: "unreviewed",
  });
  expect(writes).toBe(0);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("provider overload is visible and offline search is disabled", async ({
  page,
  context,
}) => {
  test.setTimeout(300000);
  let requests = 0;
  await page.route("https://www.wikidata.org/**", (route) => {
    requests++;
    return route.fulfill({ json: { error: { code: "maxlag" } } });
  });
  await page.goto("/login");
  await page.getByLabel("Email").fill("coach@example.test");
  await page.getByLabel("Password").fill("test-password");
  await page.getByRole("button", { name: "Enter SESEN" }).click();
  await expect(page.getByText("HBI Test Club").first()).toBeAttached();
  await page.getByRole("button", { name: "English", exact: true }).click();
  await page.getByRole("link", { name: "Data sources", exact: true }).click();
  await page.getByLabel("Player name or Wikidata ID").fill("Q18921300");
  await page
    .getByRole("button", { name: "Search Wikidata", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "maxlag" }),
  ).toBeVisible();
  await expect(page.locator(".source-results article")).toHaveCount(0);
  expect(requests).toBe(1);
  await context.setOffline(true);
  await expect(
    page.getByRole("button", { name: "Search Wikidata", exact: true }),
  ).toBeDisabled();
});
