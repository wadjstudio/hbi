import { test, expect } from "@playwright/test";
test("coach can create a player, work offline, sync and draw a tactic", async ({
  page,
  context,
}) => {
  test.setTimeout(120000);
  await page.goto("/login");
  await page.getByLabel("Email").fill("coach@example.test");
  await page.getByLabel("Password").fill("test-password");
  await page.getByRole("button", { name: "Enter HBI" }).click();
  await expect(page.getByText("HBI Test Club").first()).toBeAttached();
  await page.getByRole("button", { name: "English", exact: true }).click();
  await page.getByRole("link", { name: "Players", exact: true }).click();
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByLabel("First name").fill("Test");
  await page.getByLabel("Last name").fill("Player");
  await page.getByLabel("Position", { exact: true }).selectOption("CB");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("link", { name: "Test Player" })).toBeVisible();
  await page.getByRole("link", { name: "Tactics", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Tactical library" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByLabel("Tactic title").fill("Cross to pivot");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("link", { name: "Cross to pivot" }).click();
  await page.getByRole("button", { name: "New frame / copy current" }).click();
  await expect(
    page.getByRole("button", { name: "Frame 1", exact: true }),
  ).toBeVisible();
  await context.setOffline(true);
  await page.getByLabel("Label", { exact: true }).fill("10");
  const svg = page.getByRole("img", { name: "Tactical drawing" });
  await svg.click({ position: { x: 250, y: 120 } });
  await page.getByRole("button", { name: "Save frame", exact: true }).click();
  await expect(svg.getByText("10")).toBeVisible();
  await page.getByRole("button", { name: "Sync & backup" }).click();
  await expect(
    page.getByText("Offline", { exact: false }).first(),
  ).toBeVisible();
  await context.setOffline(false);
  await page.getByRole("button", { name: "Sync", exact: true }).click();
  await expect(svg.getByText("10")).toBeVisible();
  const circle = svg.locator("circle").first();
  const originalX = await circle.getAttribute("cx"),
    originalY = await circle.getAttribute("cy");
  await page.setViewportSize({ width: 1000, height: 800 });
  await expect(circle).toHaveAttribute("cx", originalX!);
  await expect(circle).toHaveAttribute("cy", originalY!);
  await page.getByRole("button", { name: "Sync & backup" }).click();
  await page.getByRole("button", { name: "New frame / copy current" }).click();
  await expect(
    page.getByRole("button", { name: "Frame 2", exact: true }),
  ).toBeVisible();
  const point = await circle.boundingBox();
  expect(point).not.toBeNull();
  await page.mouse.move(
    point!.x + point!.width / 2,
    point!.y + point!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    point!.x + point!.width / 2 + 80,
    point!.y + point!.height / 2 + 30,
    { steps: 5 },
  );
  await page.mouse.up();
  await page.getByRole("button", { name: "Save frame", exact: true }).click();
  const destinationX = await circle.getAttribute("cx");
  expect(destinationX).not.toBe(originalX);
  await page.getByRole("button", { name: "Frame 1", exact: true }).click();
  await expect(circle).toHaveAttribute("cx", originalX!);
  await page
    .getByRole("button", { name: "Play animation", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Frame 2", exact: true }),
  ).toHaveClass("active");
  await expect(circle).toHaveAttribute("cx", destinationX!);
  await expect(svg.locator("circle")).toHaveCount(1);
});
