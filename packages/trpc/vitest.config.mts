import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    setupFiles: ["./server/test/setup.ts"],
    include: ["server/**/*.test.ts"],
  },
});
