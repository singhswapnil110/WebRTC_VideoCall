import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Vitest runs on its own Vite 8, where plugin-react 3 misses that this is a
  // test transform and injects the browser-only Fast Refresh preamble check,
  // so no component file could be imported. Fast Refresh is a dev-server feature.
  plugins: [react({ fastRefresh: false })],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.js"],
  },
});
