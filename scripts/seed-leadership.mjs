// Cria/atualiza contas leadership a partir de JSON no stdin.
// Não tem credenciais hardcoded — passe tudo via stdin.
//
// Uso:
//   echo '[{"email":"...","password":"...","title":"...","hidden":false,"isSuper":false}]' \
//     | PATH="$HOME/.local/node/bin:$PATH" node scripts/seed-leadership.mjs
//
// Idempotente: se a conta já existe, atualiza senha + profile.

import fs from "node:fs/promises"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"
import { createClient } from "@supabase/supabase-js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env.local")
  const raw = await fs.readFile(envPath, "utf8")
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
  }
}

async function readStdin() {
  const chunks = []
  for await (const chunk of process.stdin) chunks.push(chunk)
  return Buffer.concat(chunks).toString("utf8")
}

async function main() {
  await loadEnv()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    console.error("Faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY")
    process.exit(1)
  }

  const raw = await readStdin()
  if (!raw.trim()) {
    console.error("Nenhum JSON recebido no stdin")
    process.exit(1)
  }
  const seed = JSON.parse(raw)
  if (!Array.isArray(seed)) {
    console.error("JSON precisa ser um array")
    process.exit(1)
  }

  const sb = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  console.log("Listando users existentes...")
  const { data: existing, error: listErr } = await sb.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })
  if (listErr) {
    console.error("Erro listando users:", listErr.message)
    process.exit(1)
  }
  const existingByEmail = new Map(existing.users.map((u) => [u.email, u]))

  for (const item of seed) {
    const { email, password, title, hidden, isSuper, fullName } = item
    if (!email || !password) {
      console.error(`• item inválido (sem email/password): ${JSON.stringify(item)}`)
      continue
    }
    const existingUser = existingByEmail.get(email)
    let userId

    if (existingUser) {
      console.log(`• ${email} já existe (id=${existingUser.id}). Atualizando senha + profile.`)
      const { error: updErr } = await sb.auth.admin.updateUserById(existingUser.id, {
        password,
        email_confirm: true,
      })
      if (updErr) {
        console.error(`  ✗ erro atualizando senha: ${updErr.message}`)
        continue
      }
      userId = existingUser.id
    } else {
      console.log(`• ${email} criando...`)
      const { data, error } = await sb.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })
      if (error) {
        console.error(`  ✗ erro criando: ${error.message}`)
        continue
      }
      userId = data.user.id
      console.log(`  → criado id=${userId}`)
    }

    const profilePatch = {
      id: userId,
      role: "leadership",
      leadership_title: title || null,
      hidden_from_staff: !!hidden,
    }
    if (fullName) profilePatch.full_name = fullName

    const { error: upsertErr } = await sb
      .from("profiles")
      .upsert(profilePatch, { onConflict: "id" })

    if (upsertErr) {
      console.error(`  ✗ erro upsert profile: ${upsertErr.message}`)
      continue
    }

    if (isSuper) {
      console.log(`  ⭐ super leadership UUID = ${userId}`)
    }
    console.log(`  ✓ ok`)
  }

  console.log("\nSeed concluído.")
}

main().catch((err) => {
  console.error("Fatal:", err.message)
  process.exit(1)
})
