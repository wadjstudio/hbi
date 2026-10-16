import { test, expect } from "./fixture";
import { verifyTransport } from "./transport-assertions";

test("wide transport retains physical seeking in English and Arabic", async ({
  page,
}, testInfo) => {
  test.setTimeout(180000);
  test.skip(
    !process.env.HBI_VISUAL_MATCH,
    "Requires explicitly supplied local test footage",
  );
  await page.setViewportSize({ width: 1672, height: 941 });
  await page.goto("/login");
  await page.getByLabel("Email").fill("coach@example.test");
  await page.getByLabel("Password").fill("test-password");
  await page.getByRole("button", { name: "Enter SESEN" }).click();
  await expect(page.getByText("HBI Test Club").first()).toBeAttached({
    timeout: 90000,
  });
  await page.getByRole("button", { name: "English", exact: true }).click();
  await page.getByRole("link", { name: "Video Lab", exact: true }).click();
  await page
    .getByLabel("Match", { exact: true })
    .selectOption("50000000-0000-4000-8000-000000000001");
  await page
    .getByLabel("Select local video", { exact: false })
    .setInputFiles(process.env.HBI_VISUAL_MATCH!);
  await expect
    .poll(() =>
      page.locator("video").evaluate((v: HTMLVideoElement) => v.readyState),
    )
    .toBeGreaterThanOrEqual(2);
  await verifyTransport(page);
  await page.getByRole("button", { name: "العربية", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await verifyTransport(page);
  await page.getByRole("slider", { name: "وقت الفيديو", exact: true }).blur();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    )
    .toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("transport-arabic-1672.png"),
    fullPage: true,
  });
});
