import { expect, type Page } from "@playwright/test";
export const verifyBrandHeader = async (page: Page, width: number) => {
  const links = page.getByRole("link", {
    name: "SESEN — Sports Intelligence",
    exact: true,
  });
  await expect(links).toHaveCount(1);
  const isRTL = (await page.locator("html").getAttribute("dir")) === "rtl";
  if (width >= 1440) {
    const link = page.locator(".topbar > .header-brand");
    await expect(link).toBeVisible();
    const image = link.locator("img");
    const box = (await image.boundingBox())!;
    expect(box.width).toBeCloseTo(232, 0);
    expect(box.width / box.height).toBeCloseTo(768 / 163, 2);
    expect(isRTL ? width - box.x - box.width : box.x).toBeCloseTo(33, 0);
    const masthead = (await link.boundingBox())!;
    const metadata = (await page.locator(".match-context-meta").boundingBox())!;
    if (isRTL)
      expect(metadata.x + metadata.width).toBeLessThanOrEqual(masthead.x - 12);
    else
      expect(metadata.x).toBeGreaterThanOrEqual(
        masthead.x + masthead.width + 12,
      );
    const content = (await page.locator(".workspace-body").boundingBox())!;
    expect(content.width).toBeCloseTo(width - 192, 0);
    await expect(page.locator(".sidebar > .brand")).toBeHidden();
    await link.focus();
    await expect(link).toBeFocused();
  } else if (width >= 1024) {
    await expect(page.locator(".sidebar .compact-brand img")).toBeVisible();
    await expect(page.locator(".topbar > .header-brand")).toBeHidden();
  } else {
    const link = page.locator(".topbar > .header-brand");
    await expect(link).toBeVisible();
    expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    const image = (await link.locator("img").boundingBox())!;
    expect(image.width / image.height).toBeCloseTo(768 / 163, 2);
    expect(image.width).toBeLessThanOrEqual(160);
  }
};
