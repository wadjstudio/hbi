import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: {
    exclude: ["tests/e2e/**", "node_modules/**"],
    // These tests exercise pure domain logic and fake-indexeddb; browser tests cover the DOM.
    environment: "node",
    maxWorkers: 1,
    coverage: { reporter: ["text", "html"] },
  },
});
