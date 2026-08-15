// lib/vnext/runtime/prompt/question-brief.ts
//
// SERIALIZAÇÃO DA QUESTION DO BANK PARA O MODELO — sem vazar gabarito.
//
// INVARIANTE DE SEGURANÇA PEDAGÓGICA (verificada em teste):
//   O output desta função JAMAIS pode conter:
//     - expectedAnswer.value            (numeric — resposta bruta)
//     - expectedAnswer.tolerance        (numeric — dica: "tolerance 0.01" ≈ π)
//     - expectedAnswer.canonicalForm    (algebraic — forma canônica)
//     - expectedAnswer.variables        (algebraic — ex: {a:1,b:-5,c:6})
//     - expectedAnswer.equivalentForms  (algebraic — formas equivalentes)
//     - expectedAnswer.correctOptionId  (mcq — id da certa)
//     - expectedAnswer.options[].explanation  (mcq — porquê)
//     - expectedAnswer.acceptedAnswers  (short-answer — array das aceitas)
//     - expectedAnswer.rubricId         (rubric-based — id da rubrica)
//     - expectedAnswer.guidance         (rubric-based — dicas de resposta)
//     - Question.authorNote             (texto livre — pode ter gabarito)
//
// EXPOSTOS COM PROPÓSITO (ajudam o modelo sem revelar resposta):
//   - id, question (enunciado), subject, grade, schoolStage, topic, skill
//   - difficulty, cognitiveDepth, questionType, prerequisites
//   - commonErrors[] COMPLETO (descreve ERRO, não resposta)
//   - epistemicRole, sourceRole, sourceId (opaco)
//   - expectedAnswer.kind (só o tipo), .unit (numeric contexto),
//     .caseSensitive (short-answer format flag)
//   - MCQ: options[].{id, text} — aluno precisa VER pra escolher
//   - framework, proficiencyLevel

import type { Question } from "../../questions/types"
import type { MethodPhase } from "../../engine/phases"

// Regra: gabarito NUNCA vaza. Assinatura aceita `phase` só pra futura
// diferenciação de tom por fase (ex: "apresente a questão" vs. "use
// como âncora do diagnóstico"), NÃO pra decidir se expõe gabarito.
export function buildQuestionBrief(
  question: Question,
  phase: MethodPhase,
): string {
  const q = question
  const safeAnswer = describeExpectedAnswerShape(q.expectedAnswer)
  const commonErrors = describeCommonErrors(q.commonErrors)
  const purpose = describePurpose(phase)
  const source = describeSource(q)
  const optional = describeOptionalFields(q)

  return `## QUESTÃO SELECIONADA DO BANCO

${purpose}

- **id**: ${q.id}
- **enunciado**: ${q.question}
- **habilidade**: ${q.skill}
- **tópico**: ${q.topic}
- **matéria**: ${q.subject}${q.grade ? ` | série: ${q.grade}` : ""}${q.schoolStage ? ` | estágio: ${q.schoolStage}` : ""}
- **tipo pedagógico**: ${q.questionType} | **dificuldade**: ${q.difficulty} | **profundidade**: ${q.cognitiveDepth}${
    q.prerequisites.length > 0
      ? `\n- **pré-requisitos**: ${q.prerequisites.join(", ")}`
      : ""
  }${optional}

### Formato da resposta esperada
${safeAnswer}

### Erros comuns catalogados nesta habilidade
${commonErrors}

### Fontes vinculadas
${source}

**IMPORTANTE**: você NÃO recebeu o gabarito desta questão. Se o aluno
enviar tentativa, avalie usando as descrições de erros comuns e sua
própria compreensão do enunciado — mas NUNCA afirme "a resposta é X"
como se soubesse por definição. Se precisar guiar, use passos
metodológicos, não valores.`
}

// -----------------------------------------------------------------------
// HELPERS PRIVADOS
// -----------------------------------------------------------------------

function describePurpose(phase: MethodPhase): string {
  switch (phase) {
    case "diagnose":
      return `USE esta questão como ÂNCORA obrigatória do diagnóstico. No mínimo:

- Formule ao menos 1 \`claim\` do tipo \`hypothesis\` com
  \`assertionLevel: "tentative"\` sobre O QUE O ALUNO PROVAVELMENTE
  VAI TER DIFICULDADE, baseando-se nos \`commonErrors\` catalogados
  desta habilidade acima. Ex: se o commonError descreve confusão
  entre coeficientes, sua claim pode ser "aluno pode confundir a
  ordem dos coeficientes ao identificar a, b, c".
- Cite a Question como Source (\`source.type: "generated"\` sem \`url\`,
  \`authorityTier: "generated"\`, título curto tipo "questão do banco
  atenis-<id>") e amarre com Evidence à claim.
- Proponha uma TAREFA CONCRETA no \`nextStep\` que use esta questão
  ou variação equivalente.`
    case "teach":
      return "Use esta questão como REFERÊNCIA do conceito que está sendo explicado — cite o tipo de problema que ela representa sem resolvê-la agora."
    case "practice":
      return "APRESENTE esta questão ao aluno e AGUARDE tentativa. Não resolva antes que ele tente."
    case "verify":
      return "APRESENTE esta questão pra verificar o domínio. O aluno responde; o Evaluator (não você) julgará a correção."
    default:
      return "Use esta questão como contexto do turno."
  }
}

function describeExpectedAnswerShape(
  answer: Question["expectedAnswer"],
): string {
  // NUNCA inclui: value, tolerance, canonicalForm, variables,
  // equivalentForms, correctOptionId, options[].explanation,
  // acceptedAnswers, rubricId, guidance.
  switch (answer.kind) {
    case "numeric": {
      const unit = answer.unit ? ` | unidade: **${answer.unit}**` : ""
      return `Tipo: **numérica**${unit}. Aluno deve fornecer um número.`
    }
    case "algebraic":
      return `Tipo: **algébrica**. Aluno deve fornecer uma expressão simbólica (não valor bruto).`
    case "multiple-choice": {
      // options[].{id, text} são apresentáveis; explanation e correctOptionId NÃO
      const opts = answer.options
        .map((o) => `  - (${o.id}) ${o.text}`)
        .join("\n")
      return `Tipo: **múltipla escolha** (${answer.options.length} opções). Alternativas apresentáveis:
${opts}`
    }
    case "short-answer": {
      const cs = answer.caseSensitive ? "sim" : "não"
      return `Tipo: **resposta curta** (texto). Sensível a maiúsculas/minúsculas: ${cs}.`
    }
    case "rubric-based":
      return `Tipo: **avaliação por rubrica**. A rubrica específica é aplicada pelo corretor dedicado — você não deve tentar simular a rubrica aqui.`
  }
}

function describeCommonErrors(
  errors: Question["commonErrors"],
): string {
  if (errors.length === 0) return "(nenhum catalogado)"
  return errors
    .map((e) => {
      const misc = e.misconception ? `\n   Concepção equivocada: ${e.misconception}` : ""
      const hint = e.diagnosticHint ? `\n   Dica diagnóstica: ${e.diagnosticHint}` : ""
      return `- \`${e.code}\`: ${e.description}${misc}${hint}`
    })
    .join("\n")
}

function describeSource(q: Question): string {
  const parts: string[] = []
  parts.push(`- **papel epistêmico**: \`${q.epistemicRole}\``)
  if (q.sourceRole) parts.push(`- **descrição**: ${q.sourceRole}`)
  if (q.sourceId) {
    parts.push(`- **sourceId** (opaco): \`${q.sourceId}\``)
  }
  parts.push(
    "- (fontes citadas na sua resposta devem ser REAIS — se você não tem URL/DOI verificável, use source.type=\"generated\")",
  )
  return parts.join("\n")
}

function describeOptionalFields(q: Question): string {
  const optional: string[] = []
  if (q.framework) optional.push(`framework: ${q.framework}`)
  if (q.proficiencyLevel) optional.push(`proficiência: ${q.proficiencyLevel}`)
  if (optional.length === 0) return ""
  return `\n- **framework/proficiência**: ${optional.join(" | ")}`
}
