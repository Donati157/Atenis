import { generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"
import { getRubricById } from "@/lib/ap-rubric"
import { getCourseById } from "@/lib/ap-courses"

export const maxDuration = 60

const partDescriptions: Record<string, string> = {
  thesis:
    "Uma tese/claim AP deve ser defensável, responder ao prompt e estabelecer uma linha de raciocínio explícita.",
  introduction:
    "A introdução AP apresenta contexto, situa o leitor e traz a tese. Em History, inclua também contextualização ampla.",
  body:
    "Um parágrafo de desenvolvimento AP deve ter claim + evidência específica + comentário que conecta a evidência à tese.",
  evidence:
    "Evidência AP precisa ser específica (citação, dado, exemplo histórico/textual) e seguida de comentário analítico, não resumo.",
  conclusion:
    "A conclusão AP sintetiza o argumento, e em History pode estender para compreensão complexa (complexidade).",
  custom:
    "Avalie o trecho conforme os padrões da rubrica AP selecionada.",
}

const correctionSchema = z.object({
  correctedText: z.string(),
  feedback: z.string(),
  improvements: z.array(z.string()),
  grammarIssues: z.array(z.string()),
  score: z.number().min(0).max(100),
})

export async function POST(req: Request) {
  try {
    const { text, part, rubricId, apCourseId } = await req.json()

    if (!text || !part) {
      return Response.json({ error: "Texto e parte são obrigatórios" }, { status: 400 })
    }

    const rubric = rubricId ? getRubricById(rubricId) : undefined
    const apCourse = apCourseId ? getCourseById(apCourseId) : undefined
    const partDescription = partDescriptions[part] ?? partDescriptions.custom

    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: correctionSchema,
      messages: [
        {
          role: "system",
          content: `Você é um corretor experiente do AP College Board. Melhore e corrija um TRECHO específico de uma resposta AP.

${apCourse ? `CURSO AP: ${apCourse.title}${apCourse.notes ? ` — ${apCourse.notes}` : ""}` : ""}
${rubric ? `RUBRICA APLICADA: ${rubric.name} (${rubric.subject}, ${rubric.totalPoints} pts)` : "RUBRICA APLICADA: genérica (AP FRQ)"}

PARTE DO ENSAIO: ${part}
REQUISITOS DESTA PARTE: ${partDescription}

INSTRUÇÕES:
1. Corrija TODOS os erros de gramática, ortografia e pontuação (em inglês, se o trecho estiver em inglês).
2. Mantenha o registro acadêmico AP — formal, analítico, sem gírias.
3. Preserve a voz original do autor; refine sem reescrever tudo.
4. Se for uma tese/claim, garanta que é defensável e estabelece linha de raciocínio.
5. Se for evidência + comentário, garanta que há citação/exemplo específico E análise (não resumo).
6. Se for DBQ, priorize sourcing/HAPP (Historical context, Audience, Purpose, Point of view) quando relevante.
7. Se for LEQ, priorize argumento histórico com causação/comparação/CCOT.

CRITÉRIOS DE SCORE (0–100):
- 90-100: Nível máximo da rubrica AP (6/6 ou 7/7 equivalente)
- 75-89: Próximo do máximo; 1 critério abaixo
- 60-74: Sólido mas com lacunas
- 40-59: Abaixo da média; falta evidência ou análise
- 0-39: Insuficiente

SAÍDA:
- correctedText: a versão melhorada do trecho (pode estar em inglês se o original estiver).
- feedback, improvements, grammarIssues: SEMPRE em português brasileiro.
- Seja específico; cite o que foi mudado e por quê.`,
        },
        {
          role: "user",
          content: `Parte: ${part}
Trecho original:

${text}`,
        },
      ],
    })

    return Response.json({
      correction: {
        originalText: text,
        ...object,
      },
    })
  } catch (error) {
    console.error("[ap/correct-part] error:", error)
    return Response.json({ error: "Falha ao processar a correção" }, { status: 500 })
  }
}
