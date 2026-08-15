// lib/vnext/runtime/prompt/phase-goal.ts
//
// Fase 2B.6.1: blocos por fase encolhidos e reescritos em tom
// operacional. Removido: pedagogia genérica ("mostre raciocínio", "use
// analogias") — já coberta pelo VOICE.
//
// Cada fase agora só carrega o QUE MUDA por fase:
//   diagnose  — DESCOBRIR via tarefa concreta
//   teach     — EXPLICAR conceito
//   practice  — AGUARDAR tentativa
//   verify    — CHECAR (Evaluator julga)

import type { MethodPhase } from "../../engine/phases"
import type { LearningTopicState } from "../../learning/types"

export function buildPhaseGoal(
  phase: MethodPhase,
  state: LearningTopicState,
): string {
  const stateLine = describeState(state)
  const goal = PHASE_GOALS[phase] ?? PHASE_GOALS.__default
  return `## OBJETIVO DA FASE ATUAL: \`${phase}\`

${goal}

Estado deste tópico agora: ${stateLine}`
}

function describeState(state: LearningTopicState): string {
  const parts: string[] = []
  parts.push(`ticks=${state.ticks}`)
  parts.push(`generative-turns=${state.generativeTurns}`)
  parts.push(`mastery=${state.mastery}`)
  if (state.currentStrategy) {
    parts.push(`strategy=${state.currentStrategy}`)
  }
  if (state.strategyEffectiveness.length > 0) {
    const eff = state.strategyEffectiveness
      .map((s) => `${s.strategy}(${s.successes}/${s.tries})`)
      .join(",")
    parts.push(`tentado=${eff}`)
  }
  return parts.join(" | ")
}

const PHASE_GOALS: Record<string, string> = {
  diagnose: `**DESCOBRIR o que o aluno já sabe.** Não ensine ainda.

Regra: dê uma TAREFA CONCRETA em vez de perguntar "você lembra?" ou "o
que você já sabe?". A tentativa do aluno revela o nível real. Auto-relato
sempre vem vago ("um pouquinho") e não calibra nada.

Se o aluno já enviou tentativa neste turno (veja EVENTO DO ALUNO), use
como base do diagnóstico — reconheça o que acertou, cruze o erro com
\`commonErrors\` da Question, proponha próximo passo.

**Resultado obrigatório do turno:**
- **Ao menos 1 \`claim\` com sua leitura inicial do aluno neste turno.**
  A claim descreve O QUE O ALUNO PROVAVELMENTE SABE ou NÃO SABE (não o
  conteúdo em si). Se você não tem base sólida ainda, use
  \`type: "hypothesis"\` + \`assertionLevel: "tentative"\` — a claim
  continua sendo produzida, apenas marcada como especulativa. "Não sei
  o suficiente pra opinar" NÃO é output válido em \`diagnose\`; hipótese
  explícita é. Silêncio quando você pode formular hipótese hedgeada é
  falha do turno.
- \`primaryTakeaway\` = uma frase específica do que você diagnosticou
  neste turno (não frase genérica tipo "vamos estudar X").
- \`nextStep\` = convite concreto à próxima interação, ancorado no que
  aconteceu neste turno.`,

  teach: `**EXPLICAR conceito passo a passo.** Preencha a lacuna
identificada.

Regra: exemplo concreto antes de generalização. Dê 1-2 partes e peça
sinal antes de continuar. Se o aluno já tentou, comece pelo que ele
acertou.

Resultado esperado: \`claims\` de tipo \`definition\` ou \`fact\` sobre o
conceito, com Evidences apontando pra fontes reais. \`analyses\` com
interpretação genuína. \`primaryTakeaway\` = síntese do conceito no
nível do aluno. \`nextStep\` = sugestão de tentativa pra checar
entendimento.`,

  practice: `**PROPOR EXERCÍCIO e AGUARDAR tentativa.**

Regra: apresente a Question (se selecionada) e pare. A tentativa vem
primeiro; passo a passo antecipado atrapalha. Se o aluno já respondeu
(veja EVENTO DO ALUNO), valide o que está certo, cruze o desvio com
\`commonErrors\`.

Resultado esperado — se aluno ainda não tentou: \`claims\` sobre O QUE
ESTA QUESTÃO TESTA (sem resolver). Se aluno tentou: \`claims\` sobre a
QUALIDADE da tentativa dele, com Evidences citando o raciocínio.`,

  verify: `**CHECAR domínio.** O aluno responde; o Evaluator (não você)
julga certo/errado.

Regra: apresente a Question e aguarde. Sua saída é comentar o PROCESSO,
não dar veredicto. Qual passo levou ao resultado? Qual conceito ficou
demonstrado? Qual dúvida persiste?

Resultado esperado: \`claims\` sobre O PROCESSO do aluno.
\`primaryTakeaway\` = síntese do que a verificação revelou sobre
domínio. \`nextStep\` = reforçar / consolidar / voltar pra teach se
lacuna identificada.`,

  __default: `Fase sem bloco específico. Siga as regras epistêmicas e o
contexto do aluno. Se recebeu Question do banco, use como âncora.`,
}
