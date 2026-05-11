// Roles do Atenis. Hierarquia (mais poder no topo):
//   super_admin > admin > leadership > professor / student
//
// - super_admin: identificado por UUID em lib/super-admin.ts (não é uma role)
// - admin: poderes totais, exceto admin role (só super)
// - leadership: como admin pra alunos/professores, MAS admin manda na liderança
// - professor: ensina, edita seus alunos
// - student: estudante
//
// Espelhado no SQL: scripts/019_super_admin_role_change.sql e 021_leadership_role.sql.

export type Role = "student" | "professor" | "leadership" | "admin"

export const ROLE_LABELS: Record<Role, string> = {
  student: "Estudante",
  professor: "Professor",
  leadership: "Liderança",
  admin: "Admin",
}

export const LEADERSHIP_EMAIL_DOMAIN = "@conceptedu.com.br"

export function isStaffRole(role: string | null | undefined): boolean {
  return role === "admin" || role === "leadership" || role === "professor"
}

export function isAdminOrLeadership(role: string | null | undefined): boolean {
  return role === "admin" || role === "leadership"
}

export function isLeadershipEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return email.toLowerCase().endsWith(LEADERSHIP_EMAIL_DOMAIN)
}
