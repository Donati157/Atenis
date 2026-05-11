// Calcula o "primeiro nome" pra exibição no greeting do dashboard.
// Ordem de prioridade:
//   1. profile.full_name → pega a primeira palavra
//   2. local-part do email antes do primeiro ponto → capitaliza
//      Ex: "davi.donati@conceptedu.com.br" → "Davi"
//          "leadership@gmail.com" → "Leadership"
//   3. fallback baseado em role: "estudante" / "professor" / etc
//
// Usado em tutor-home e chat-interface pra não duplicar lógica.

const ROLE_FALLBACK: Record<string, string> = {
  student: "estudante",
  professor: "professor",
  leadership: "liderança",
  admin: "admin",
}

function capitalize(s: string): string {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

export function getDisplayName(opts: {
  fullName?: string | null
  email?: string | null
  role?: string | null
}): string {
  // 1. Nome completo do profile
  const trimmedName = opts.fullName?.trim()
  if (trimmedName) {
    const first = trimmedName.split(/\s+/)[0]
    if (first) return first
  }

  // 2. Username do email (antes do primeiro ponto)
  if (opts.email) {
    const local = opts.email.split("@")[0]?.trim()
    if (local) {
      const first = local.split(".")[0]
      if (first) return capitalize(first)
    }
  }

  // 3. Fallback baseado em role
  return ROLE_FALLBACK[opts.role ?? ""] ?? "estudante"
}
