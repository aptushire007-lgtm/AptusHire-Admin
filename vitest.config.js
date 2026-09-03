import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Deliberately a SEPARATE file from vite.config.js. The build config carries a
// strictPort dev server and a manualChunks function that have nothing to do with
// running tests, and Vitest picks this file up ahead of vite.config.js
// automatically. Only the React plugin is shared — it is what compiles JSX in a
// test file. Tailwind is absent on purpose: these tests assert behaviour and
// class contracts, never rendered pixels, so there is no stylesheet to process.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.js"],
    include: ["test/**/*.test.{js,jsx}"],
  },
});
