import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./env"

type CookieToSet = { name: string; value: string; options: CookieOptions }

const PROTECTED_PREFIXES = ["/dashboard", "/protected", "/admin"]

// Timeout do auth.getUser. O Vercel mata o middleware em ~25s; se a
// validação de sessão demorar (rede ruim, token corrompido em loop de
// refresh), preferimos cortar curto, tratar como "deslogado" e limpar
// cookies — o usuário cai na home ou no login com sessão zerada em vez
// de ver 504 MIDDLEWARE_INVOCATION_TIMEOUT.
const AUTH_TIMEOUT_MS = 4000

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
): Promise<T | { __timeout: true }> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeoutPromise = new Promise<{ __timeout: true }>((resolve) => {
    timer = setTimeout(() => resolve({ __timeout: true }), ms)
  })
  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        )
      },
    },
  })

  // Tenta validar a sessão com timeout curto e captura erros.
  let user: { id: string } | null = null
  let authBroken = false
  try {
    const result = await withTimeout(supabase.auth.getUser(), AUTH_TIMEOUT_MS)
    if ("__timeout" in result) {
      authBroken = true
    } else {
      user = result.data.user
    }
  } catch {
    // Erro de rede ou refresh token inválido — trata como sessão quebrada.
    authBroken = true
  }

  // Sessão travada/corrompida: limpa cookies sb-* do navegador pra que a
  // próxima request entre limpa. Sem isso o aluno fica preso em loop
  // (mesmo cookie ruim → mesmo timeout → mesmo 504).
  if (authBroken) {
    for (const cookie of request.cookies.getAll()) {
      if (cookie.name.startsWith("sb-")) {
        supabaseResponse.cookies.set(cookie.name, "", {
          maxAge: 0,
          path: "/",
        })
      }
    }
  }

  const pathname = request.nextUrl.pathname
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))

  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    url.searchParams.set("next", pathname)
    // Sinaliza pra tela de login que veio de uma sessão quebrada — útil
    // pra mostrar uma mensagem amigável em vez de só "faça login".
    if (authBroken) url.searchParams.set("reset", "1")
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
