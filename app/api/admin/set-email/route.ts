import { NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { isSuperAdmin, SUPER_ADMIN_ID } from "@/lib/super-admin"

interface Body {
  targetUserId: string
  newEmail: string
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: Request) {
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 })
  }

  const { targetUserId, newEmail } = body
  if (!targetUserId || !newEmail) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 })
  }
  const trimmedEmail = newEmail.trim().toLowerCase()
  if (!EMAIL_REGEX.test(trimmedEmail)) {
    return NextResponse.json(
      { error: "Email inválido." },
      { status: 400 },
    )
  }

  // 1) Quem chama: precisa ser super admin
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 })
  }

  if (!isSuperAdmin(user.id)) {
    return NextResponse.json(
      { error: "Apenas o admin principal pode trocar e-mail de usuários." },
      { status: 403 },
    )
  }

  // 2) Não permite trocar email do próprio super admin
  if (targetUserId === SUPER_ADMIN_ID) {
    return NextResponse.json(
      { error: "Não é possível alterar dados do admin principal." },
      { status: 403 },
    )
  }

  // 3) Verifica que o alvo existe
  const { data: targetProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", targetUserId)
    .maybeSingle()

  if (!targetProfile) {
    return NextResponse.json({ error: "target_not_found" }, { status: 404 })
  }

  // 4) Service role obrigatória
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!serviceKey || !url) {
    return NextResponse.json(
      {
        error:
          "Servidor sem SUPABASE_SERVICE_ROLE_KEY. Configure no .env.local e Vercel.",
      },
      { status: 500 },
    )
  }

  const adminSupabase = createAdminClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // 5) Atualiza o email no auth.users (com confirmação automática pra não exigir
  //    que o usuário clique em link).
  const { error: updateError } = await adminSupabase.auth.admin.updateUserById(
    targetUserId,
    { email: trimmedEmail, email_confirm: true },
  )

  if (updateError) {
    return NextResponse.json(
      { error: `Erro ao atualizar email: ${updateError.message}` },
      { status: 500 },
    )
  }

  // 6) Espelha no profiles.email se a coluna existir (a tabela tem)
  await adminSupabase
    .from("profiles")
    .update({ email: trimmedEmail })
    .eq("id", targetUserId)

  return NextResponse.json({ ok: true, email: trimmedEmail })
}
