// Roda migrations SQL contra o Postgres do Supabase.
// Uso: DATABASE_URL=postgresql://... node scripts/run-migrations.mjs <file1> [file2] ...
// Se nenhum arquivo passar, roda 018, 019, 020, 021 (estado pendente atual).

import fs from "node:fs/promises"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"
import pg from "pg"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const DEFAULT_FILES = [
  "018_teaching_assignments.sql",
  "019_super_admin_role_change.sql",
  "020_protected_accounts.sql",
  "021_leadership_role.sql",
]

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error("DATABASE_URL não setada (passe via env var)")
    process.exit(1)
  }

  const args = process.argv.slice(2)
  const files = args.length > 0 ? args : DEFAULT_FILES

  const client = new pg.Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  })

  console.log("Conectando...")
  await client.connect()
  console.log("Conectado.\n")

  let okCount = 0
  let failCount = 0

  for (const fileName of files) {
    const filePath = path.isAbsolute(fileName)
      ? fileName
      : path.join(__dirname, fileName)
    const sql = await fs.readFile(filePath, "utf8")
    const display = path.basename(filePath)
    console.log(`▶ ${display}...`)
    try {
      await client.query(sql)
      console.log(`✓ ${display} ok\n`)
      okCount++
    } catch (err) {
      console.error(`✗ ${display} falhou: ${err.message}\n`)
      failCount++
    }
  }

  await client.end()

  console.log(`Resumo: ${okCount} ok, ${failCount} falha(s).`)
  if (failCount > 0) process.exit(1)
}

main().catch((err) => {
  console.error("Erro fatal:", err.message)
  process.exit(1)
})
