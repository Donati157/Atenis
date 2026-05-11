// UUID do "admin principal" do Atenis. Hardcoded por decisão de produto.
// Quem tem esse UUID e role='admin' tem poderes exclusivos:
// - Promover/rebaixar admin (envolver role='admin' em qualquer transição)
// - Trocar senha de outro admin
// - Editar contas protegidas (ver PROTECTED_ACCOUNT_IDS)
// - Não pode ser rebaixado (RPC staff_change_role bloqueia)
//
// Espelhado no SQL: scripts/019_super_admin_role_change.sql.
// Se mudar aqui, mudar lá também.
export const SUPER_ADMIN_ID = "654ace27-861f-47c2-a918-993ef1b3f993"

export function isSuperAdmin(userId: string | null | undefined): boolean {
  return userId === SUPER_ADMIN_ID
}

// "Liderança principal" — equivalente do super admin no tier de liderança.
// Quem tem esse UUID e role='leadership' tem poderes exclusivos sobre outras
// lideranças (editar, trocar senha, promover/rebaixar). NÃO tem poder sobre
// admin — admin é domínio do super admin.
//
// hidden_from_staff=true → essa conta NÃO aparece na gestão.
//
// Espelhado no SQL: scripts/023_super_leadership.sql.
export const SUPER_LEADERSHIP_ID = "aee6d329-a599-4506-88e3-90b3b7f19a72"

export function isSuperLeadership(userId: string | null | undefined): boolean {
  return userId === SUPER_LEADERSHIP_ID
}

// Contas que só o super admin pode editar — independentemente da role do alvo.
// Espelhado no SQL: scripts/020_protected_accounts.sql.
export const PROTECTED_ACCOUNT_IDS = new Set<string>([
  "61bc2ee4-b071-4c76-a9e7-1eb5b090d408",
])

export function isProtectedAccount(userId: string | null | undefined): boolean {
  return userId ? PROTECTED_ACCOUNT_IDS.has(userId) : false
}
