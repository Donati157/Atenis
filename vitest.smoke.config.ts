import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

// Config SEPARADA pra smoke tests reais (chamadas ao Vercel AI Gateway).
// NUNCA carregada pelo `npm test`. Só via `npm run test:smoke:vercel-gateway`.

const rootDir = fileURLToPath(new URL(".", import.meta.url)).replace(/\/$/, "")

export default defineConfig({
  resolve: {
    alias: { "@": rootDir },
  },
  test: {
    include: ["test/vnext/smoke-real/**/*.smoke.test.ts"],
    environment: "node",
    globals: false,
    // Chamadas reais podem demorar; damos tempo maior.
    testTimeout: 60_000,
    hookTimeout: 60_000,
    reporters: ["default"],
    // Serial, nunca paralelo — reduz risco de rate limit acidental.
    sequence: { concurrent: false },
    // Sem retry — queremos ver o comportamento real, não mascarado.
    retry: 0,
  },
})
