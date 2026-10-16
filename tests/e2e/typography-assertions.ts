import { expect, type Page } from "@playwright/test";

export const verifyTypography = async (page: Page) => {
  const requests: string[] = [];
  const track = (request: {
    resourceType: () => string;
    url: () => string;
  }) => {
    if (request.resourceType() === "font") requests.push(request.url());
  };
  page.on("request", track);
  const faces = await page.evaluate(async () => {
    const selected = [];
    for (const [family, text] of [
      ["Roboto Condensed", "Analysis 0123456789"],
      ["IBM Plex Sans Arabic", "تحليل اللاعبين والحراس"],
    ]) {
      for (const weight of [400, 500, 600, 700]) {
        const loaded = await document.fonts.load(
          `${weight} 16px "${family}"`,
          text,
        );
        selected.push({
          family,
          weight,
          loaded: loaded.map((face) => ({
            family: face.family,
            status: face.status,
          })),
        });
      }
    }
    await document.fonts.load('400 16px "Roboto Condensed"', "ĆęŠ");
    await document.fonts.ready;
    return selected;
  });
  page.off("request", track);
  for (const result of faces) {
    expect(
      result.loaded.length,
      `${result.family} ${result.weight} must load a real font face`,
    ).toBeGreaterThan(0);
    expect(
      result.loaded.every(
        (face) =>
          face.status === "loaded" &&
          face.family.replaceAll('"', "") === result.family,
      ),
    ).toBe(true);
  }
  expect(requests.length).toBeGreaterThan(0);
  const origin = new URL(page.url()).origin;
  expect(
    requests.every(
      (url) =>
        new URL(url).origin === origin &&
        new URL(url).pathname.startsWith("/fonts/"),
    ),
  ).toBe(true);
};
