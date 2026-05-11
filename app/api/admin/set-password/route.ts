import { NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { isSuperAdmin, isSuperLeadership, isProtectedAccount, SUPER_ADMIN_ID } from "@/lib/super-admin"

interface Body {
  targetUserId: string
  newPassword: string
}

export async function POST(req: Request) {
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 })
  }

  const { targetUserId, newPassword } = body
  if (!targetUserId || !newPassword) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 })
  }
  if (newPassword.length < 6) {
    return NextResponse.json(
      { error: "Senha precisa ter pelo menos 6 caracteres." },
      { status: 400 },
    )
  }

  // 1) Quem tá chamando precisa ser admin (e não pode trocar a própria senha por aqui).
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()

  // Permissão pra trocar senha:
  // - Admin: pode trocar senha de qualquer não-admin. Só super admin troca senha de admin.
  // - Super leadership: pode trocar senha de outras lideranças (não admin, não outras tiers).
  // - Outros: não.
  const callerIsAdmin = profile?.role === "admin"
  const callerIsSuper = isSuperAdmin(user.id)
  const callerIsSuperLeader = profile?.role === "leadership" && isSuperLeadership(user.id)

  if (!callerIsAdmin && !callerIsSuperLeader) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  // Conta do admin principal: ninguém pode trocar a senha por aqui (nem ele
  // mesmo). Pra mudar, é por SQL direto fora do painel.
  if (targetUserId === SUPER_ADMIN_ID) {
    return NextResponse.json(
      { error: "Não é possível alterar a senha do admin principal." },
      { status: 403 },
    )
  }

  if (isProtectedAccount(targetUserId) && !callerIsSuper) {
    return NextResponse.json(
      { error: "Apenas o admin principal pode mexer nessa conta." },
      { status: 403 },
    )
  }

  const { data: targetProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", targetUserId)
    .maybeSingle()

  if (!targetProfile) {
    return NextResponse.json({ error: "target_not_found" }, { status: 404 })
  }

  // Admin comum não pode resetar senha de outro admin
  if (targetProfile.role === "admin" && !callerIsSuper) {
    return NextResponse.json(
      { error: "Apenas o admin principal pode trocar a senha de um admin." },
      { status: 403 },
    )
  }

  // Super leadership só pode resetar senha de outras lideranças
  if (callerIsSuperLeader && !callerIsAdmin) {
    if (targetProfile.role !== "leadership") {
      return NextResponse.json(
        { error: "Liderança principal só pode trocar senha de outras lideranças." },
        { status: 403 },
      )
    }
    // E não pode trocar a própria senha aqui
    if (targetUserId === user.id) {
      return NextResponse.json(
        { error: "Use o fluxo normal pra trocar a sua própria senha." },
        { status: 403 },
      )
    }
  }

  // 3) Service role key obrigatória (admin API).
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!serviceKey || !url) {
    return NextResponse.json(
      {
        error:
          "Servidor sem SUPABASE_SERVICE_ROLE_KEY configurada. Adicione no .env.local e nas env vars da Vercel.",
      },
      { status: 500 },
    )
  }

  const adminSupabase = createAdminClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { error: updateError } = await adminSupabase.auth.admin.updateUserById(
    targetUserId,
    { password: newPassword },
  )

  if (updateError) {
    return NextResponse.json(
      { error: `Erro ao atualizar senha: ${updateError.message}` },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true })
}
