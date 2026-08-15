import { generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"
import { getRubricById } from "@/lib/ap-rubric"
import { getCourseById } from "@/lib/ap-courses"

export const maxDuration = 60

const analysisSchema = z.object({
  totalScore: z.number(),
  maxScore: z.number(),
  wordCount: z.number(),
  criteria: z.array(
    z.object({
      id: z.string(),
      pointsAwarded: z.number(),
      feedback: z.string(),
      justification: z.string(),
      suggestions: z.array(z.string()),
    }),
  ),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  revisionExample: z.string(),
})

export async function POST(req: Request) {
  try {
    const { essay, rubricId, prompt, images, apCourseId } = await req.json()
    const apCourse = apCourseId ? getCourseById(apCourseId) : null

    const hasImages = Array.isArray(images) && images.length > 0

    if (!hasImages && (!essay || typeof essay !== "string" || !essay.trim())) {
      return Response.json(
        { error: "Essay text or image is required" },
        { status: 400 },
      )
    }
    if (!rubricId || typeof rubricId !== "string") {
      return Response.json({ error: "Rubric id is required" }, { status: 400 })
    }

    const rubric = getRubricById(rubricId)
    if (!rubric) {
      return Response.json({ error: `Unknown rubric: ${rubricId}` }, { status: 400 })
    }

    const criteriaDescription = rubric.criteria
      .map((c) => {
        const descriptors = c.descriptors
          .map((d) => `    ${d.points} pt${d.points === 1 ? "" : "s"}: ${d.description}`)
          .join("\n")
        return `• ${c.name} (max ${c.maxPoints} pt${c.maxPoints > 1 ? "s" : ""}, id "${c.id}"):\n${descriptors}`
      })
      .join("\n\n")

    const criteriaIds = rubric.criteria.map((c) => c.id)

    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: analysisSchema,
      messages: [
        {
          role: "system",
          content: `You are an experienced AP College Board grader. Apply the following OFFICIAL rubric strictly and accurately.

${apCourse ? `AP COURSE: ${apCourse.title}${apCourse.notes ? ` — ${apCourse.notes}` : ""}` : ""}
RUBRIC: ${rubric.name} (${rubric.subject})
TOTAL POSSIBLE POINTS: ${rubric.totalPoints}
${rubric.notes ? `NOTES: ${rubric.notes}` : ""}
${
  rubric.id === "generic-ap" && apCourse
    ? `\nIMPORTANTE: Esta é a rubrica GENÉRICA AP. Adapte a avaliação ao contexto específico de ${apCourse.title}:
- Para FRQs de ciências (Bio, Chem, Physics, Env Sci): "Evidence" inclui dados/observações/cálculos; "Reasoning" inclui modelo científico/equações/explicação causal; "Communication" inclui unidades SI, notação correta, diagramas.
- Para Matemática (Calc AB/BC, Stats): "Evidence" é a execução/cálculos corretos; "Reasoning" é o método/passos de justificativa; "Communication" é clareza + notação matemática + interpretação.
- Para Computer Science: "Evidence" é o código/output; "Reasoning" é algoritmo/complexidade/correção; "Communication" é legibilidade, casos extremos, comentários.
- Para Artes (2-D, 3-D, Drawing, Music Theory, Art History): "Evidence" inclui escolhas técnicas/composicionais observáveis; "Reasoning" é a intenção artística/análise de elementos; "Communication" é vocabulário técnico da disciplina.
- Para Ciências Sociais (Psych, Comp Gov, Human Geo, Econ, US Gov): "Evidence" são exemplos, estudos, dados ou conceitos do curso; "Reasoning" é como eles sustentam o argumento/hipótese; "Communication" é vocabulário técnico da disciplina.
- Para Línguas (Chinese, French, German, Italian, Japanese, Latin, Spanish Lang/Lit): "Evidence" é conteúdo relevante à tarefa; "Reasoning" é desenvolvimento/estrutura; "Communication" é gramática, vocabulário, idiomaticidade e (quando aplicável) consciência cultural.`
    : ""
}

CRITERIA:
${criteriaDescription}

GRADING REQUIREMENTS:
- For EACH criterion, output an integer number of points awarded between 0 and its maxPoints. The descriptor at that point value must match the evidence you cite.
- In "justification" quote or paraphrase the specific passages that earned (or failed to earn) the points.
- totalScore MUST equal the sum of pointsAwarded across all criteria.
- maxScore MUST equal ${rubric.totalPoints}.
- wordCount must reflect the actual word count of the submitted essay.
- Be STRICT: College Board readers do not give points for implied or underdeveloped work.

OUTPUT LANGUAGE:
- feedback, justification, suggestions, strengths, improvements, revisionExample MUST be in Brazilian Portuguese.
- Use English when quoting the student's text or naming rubric rows (e.g. "Row B").
- revisionExample: rewrite ONE weak passage from the student's essay to demonstrate how to earn maximum points on the weakest criterion. Keep it short (2–4 sentences).

CRITERIA IDs (must appear exactly once each in the output): ${criteriaIds.join(", ")}.`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Rubric: ${rubric.name}
${prompt ? `Prompt of the question:\n${prompt}\n` : ""}
${hasImages ? "\nThe student's response is in the attached image(s). Read the handwritten/printed text carefully, transcribe it mentally, and grade based on the rubric. Count words from the transcribed text. If multiple images, treat them as pages of the same response in order." : ""}
${essay ? `Student's typed response:\n${essay}` : ""}`,
            },
            ...(hasImages
              ? (images as string[]).map((url) => ({
                  type: "image" as const,
                  image: url,
                }))
              : []),
          ],
        },
      ],
    })

    // Defensive: ensure maxScore is the rubric total even if the model got creative.
    const analysis = {
      ...object,
      rubricId,
      maxScore: rubric.totalPoints,
    }

    return Response.json({ analysis })
  } catch (error) {
    console.error("[ap/analyze] error:", error)
    return Response.json({ error: "Failed to analyze AP response" }, { status: 500 })
  }
}
