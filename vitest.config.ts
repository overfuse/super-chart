import { defineConfig } from "vitest/config";
// Do not include Vite runtime plugins in vitest config to avoid type mismatch with nested vite

export default defineConfig({
  // Keep test-only settings here; build settings belong in vite.config.ts
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    css: true,
  },
});
