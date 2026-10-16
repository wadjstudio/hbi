import { expect, type Page } from "@playwright/test";
export const verifySpatialMaps = async (page: Page) => {
  const shots = page
    .getByRole("group", { name: "Shot locations", exact: true })
    .first();
  await expect(shots.locator(".spatial-map-options > summary")).toContainText(
    "Density · 10/10 located · 0 missing",
  );
  await expect(shots.locator(".density-sector")).toHaveCount(6);
  const sector = shots.locator('[data-sector="2:0"]');
  await expect(sector).toHaveAttribute("aria-label", /2 observations · 20.0%/);
  await sector.focus();
  await page.keyboard.press("Enter");
  const sample = page.getByRole("dialog", {
    name: "Shot location group",
    exact: true,
  });
  await expect(sample.locator(".evidence-source")).toHaveCount(2);
  expect(
    await sample
      .locator(".evidence-source")
      .evaluateAll((rows) =>
        rows.map((row) => row.getAttribute("data-event-id")).sort(),
      ),
  ).toEqual([
    "a0000000-0000-4000-8000-000000000203",
    "a0000000-0000-4000-8000-000000000207",
  ]);
  await page
    .getByRole("button", { name: "Close evidence", exact: true })
    .click();
  await shots.locator("summary").click();
  await shots.getByRole("button", { name: "Points", exact: true }).click();
  await expect(shots.locator(".shot-location-point")).toHaveCount(10);
  const coordinates = await shots
    .locator(".shot-location-point")
    .evaluateAll((nodes) =>
      nodes.map((n) => [n.getAttribute("cx"), n.getAttribute("cy")]),
    );
  const shares = page
    .locator(".turnover-court .spatial-sector-shares")
    .first()
    .locator("button");
  const offsets = () =>
    shares.evaluateAll((nodes) =>
      nodes.map(
        (node) =>
          node.getBoundingClientRect().left -
          node.parentElement!.getBoundingClientRect().left,
      ),
    );
  const beforeRTL = await offsets();
  await page.getByRole("button", { name: "العربية", exact: true }).click();
  expect(
    await page
      .locator(".shot-section .shot-location-point")
      .evaluateAll((nodes) =>
        nodes.map((n) => [n.getAttribute("cx"), n.getAttribute("cy")]),
      ),
  ).toEqual(coordinates);
  const afterRTL = await offsets();
  expect(afterRTL).toHaveLength(beforeRTL.length);
  afterRTL.forEach((x, index) => expect(x).toBeCloseTo(beforeRTL[index]!, 0));
  await page.getByRole("button", { name: "English", exact: true }).click();
  await shots.getByRole("button", { name: "Density", exact: true }).click();
  await shots.locator("summary").click();
  const turnovers = page.getByRole("group", {
    name: "Turnover location map",
    exact: true,
  });
  await expect(turnovers.locator("summary")).toContainText(
    "1/2 located · 1 missing",
  );
  await expect(turnovers.locator(".density-sector")).toHaveCount(1);
  await turnovers.locator(".density-sector").focus();
  await page.keyboard.press("Space");
  await expect(
    page
      .getByRole("dialog", { name: "Turnover location group", exact: true })
      .locator(".evidence-source"),
  ).toHaveCount(1);
  await page
    .getByRole("button", { name: "Close evidence", exact: true })
    .click();
  await turnovers.locator("summary").click();
  await turnovers.getByRole("button", { name: "Points", exact: true }).click();
  await turnovers.locator("summary").click();
};
