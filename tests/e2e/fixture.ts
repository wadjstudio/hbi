import { test as base, expect } from "@playwright/test";
export { expect };
export const test = base.extend({
  page: async ({ page, request }, providePage) => {
    const response = await request.post(
      `http://127.0.0.1:${process.env.HBI_MOCK_PORT || 54329}/test/reset`,
    );
    expect(response.ok()).toBe(true);
    await providePage(page);
  },
});
