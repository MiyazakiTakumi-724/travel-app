import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // jsconfig.json の "@/*" → "./src/*" と同じ
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.js"],
    // 復帰用コードなどのハッシュに使う鍵（テスト用の値）
    env: { AUTH_SECRET: "test-secret" },
  },
});
