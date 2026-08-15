// lib/vnext/runtime/prompt/grade-context.ts
//
// Bloco de CONTEXTO DO ALUNO — série, estágio, matéria. Adaptado do
// `gradeContextPrompt` do legado (`app/api/chat/route.ts:36-112`), com
// duas diferenças:
//
//   1. vNext usa códigos vNext (`EM01`/`EF06`/etc) via `curriculum/grades.ts`,
//      não Supabase profiles (`10th_grade`). Mapeia via `parseGradeCode`.
//
//   2. Runtime não conhece nome do aluno (não busca em `profiles`) —
//      não vaza PII no prompt. Referência genérica ("o aluno").
//
// Regras copiadas do legado:
//   - Faixa 6º–9º: BNCC EF, não usar conteúdo de anos seguintes.
//   - Faixa EM01–EM02: BNCC EM até o ano atual, avisar se ENEM cobrar 12º.
//   - Faixa EM03: pode interdisciplinaridade, ENEM/Fuvest/AP OK.
//   - REGRA ABSOLUTA: nunca rotular como Simulado ENEM/Fuvest/AP por
//     escolha própria — só se aluno pediu literalmente esse nome.

import { parseGradeCode } from "../../curriculum/grades"
import type { EducationalContext } from "../../context/types"

// Regra ABSOLUTA — vale pra TODAS as fases + TODAS as séries.
const NO_ENEM_RULE = `**REGRA ABSOLUTA — NÃO ROTULAR PROVA SEM PEDIDO EXPRESSO:**
Você NUNCA pode chamar uma prova de "Simulado ENEM", "Simulado Fuvest",
"Simulado AP" etc. POR ESCOLHA PRÓPRIA. Esses rótulos só aparecem se o
aluno escreveu literalmente o nome do exame ("quero um simulado ENEM",
"fuvest", "AP Calculus"). Default: "Simulado de [matéria/tópico]".`

function levelGuidance(gradeCode: string | undefined): string {
  if (!gradeCode) {
    return `**Série não informada.** Trabalhe em nível médio (Ensino Médio) por padrão. Se o aluno mencionar série específica na mensagem, USE essa série.`
  }
  const info = parseGradeCode(gradeCode)
  if (!info) {
    return `**Série \`${gradeCode}\` não reconhecida.** Trabalhe em nível médio padrão. Se dúvida, pergunte UMA vez qual ano.`
  }
  if (info.schoolStage === "middle") {
    return `**Aluno do Ensino Fundamental II (${info.labelPt}).**
- Conteúdo, vocabulário e escopo DEVEM seguir a BNCC do ano dele
  (ex: 8º ano → habilidades EF08*).
- Não use conteúdo de anos seguintes sem avisar.`
  }
  // high
  if (info.code === "EM03") {
    return `**Aluno do 3º ano do Ensino Médio (${info.labelPt}).**
- Pode usar todo o conteúdo do EM e fazer interdisciplinaridade.
- ENEM/Fuvest/AP são contextos apropriados QUANDO O ALUNO PEDIR.`
  }
  // EM01 ou EM02
  return `**Aluno do início do Ensino Médio (${info.labelPt}).**
- Limite o escopo ao que ele JÁ DEVE TER VISTO até o ano atual
  (BNCC EM* do ano dele). Não jogue conteúdo do 3º ano nele.
- Se ele pedir explicitamente ENEM, faça, mas avise sobre tópicos
  que talvez ainda não tenham sido cobertos.`
}

/**
 * Compõe o bloco de CONTEXTO DO ALUNO a partir do EducationalContext do
 * Runtime. Retorna string pronta pra concatenar em system message.
 *
 * Se context é null (ex: chamada sem contexto ainda resolvido), retorna
 * um bloco mínimo sem série — evita comportamento silencioso.
 */
export function buildGradeContext(
  context: EducationalContext | null,
): string {
  if (!context) {
    return `## CONTEXTO DO ALUNO
Contexto educacional ainda não informado neste turno. Trabalhe em nível
médio padrão. Se aluno mencionar série na mensagem, use essa série.

${NO_ENEM_RULE}`
  }
  const stage = context.schoolStage ? ` (estágio: ${context.schoolStage})` : ""
  return `## CONTEXTO DO ALUNO
Série declarada: ${context.grade ?? "não informada"}${stage}.
Matéria selecionada no turno: ${context.subject}.

${levelGuidance(context.grade)}

${NO_ENEM_RULE}

Sempre adapte profundidade, vocabulário e escopo ao que esse aluno tem
que saber HOJE.`
}
