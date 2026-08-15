import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

// Fase 1 precisa do alias `@/` que a app usa via tsconfig.paths, pra que
// route handlers de Next possam ser importados diretamente nos testes.
const rootUrl = new URL(".", import.meta.url)
const rootDir = fileURLToPath(rootUrl)

export default defineConfig({
  resolve: {
    alias: {
      "@": rootDir.replace(/\/$/, ""),
    },
  },
  test: {
    include: ["test/vnext/**/*.test.ts"],
    environment: "node",
    globals: false,
    sequence: { shuffle: false },
    reporters: ["default"],
  },
})
