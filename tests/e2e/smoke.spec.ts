import { expect, test } from "./fixture";

test("login page renders", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "HBI" })).toBeVisible();
});
