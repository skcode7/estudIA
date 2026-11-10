import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Las pruebas end-to-end viven en `e2e/` y corren con Playwright
    // (`pnpm test:e2e`), no con Vitest.
    exclude: ["e2e/**", "node_modules/**", ".next/**"]
  }
});
