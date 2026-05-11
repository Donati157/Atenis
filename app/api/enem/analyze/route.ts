import { generateObject } from "ai"
import { google } from "@ai-sdk/google"
import { z } from "zod"
import { enemCompetencies } from "@/lib/enem-rubric"

export const maxDuration = 60

const analysisSchema = z.object({
  totalScore: z.number(),
  wordCount: z.number(),
  detectedTheme: z.string().nullable(),
  fleeingTheme: z.boolean(),
  violatesHumanRights: z.boolean(),
  competencies: z.array(
    z.object({
      id: z.enum(["c1", "c2", "c3", "c4", "c5"]),
      pointsAwarded: z.number(),
      level: z.number(),
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
    const { essay, theme, images } = await req.json()

    const hasImages = Array.isArray(images) && images.length > 0

    if (!hasImages && (!essay || typeof essay !== "string" || !essay.trim())) {
      return Response.json(
        { error: "Redação (texto ou imagem) é obrigatória" },
        { status: 400 },
      )
    }

    const rubricText = enemCompetencies
      .map((c) => {
        const levels = c.levels
          .map((l) => `    ${l.points} pts: ${l.description}`)
          .join("\n")
        return `${c.id.toUpperCase()} — ${c.shortName}: ${c.name}\nFoco: ${c.focus}\n${levels}`
      })
      .join("\n\n")

    const { object } = await generateObject({
      model: google("gemini-2.5-flash-lite"),
      schema: analysisSchema,
      messages: [
        {
          role: "system",
          content: `Você é um corretor oficial da redação do ENEM (INEP). Aplique RIGOROSAMENTE a rubrica oficial das 5 competências, seguindo o padrão do Manual do Participante.

RUBRICA (pontuação por competência: 0, 40, 80, 120, 160 ou 200 — valores intermediários NÃO são permitidos):

${rubricText}

REGRAS DE CORREÇÃO:
1. Cada competência vale de 0 a 200 pontos, em incrementos de 40.
2. totalScore = soma das 5 competências (máximo 1000).
3. level é 0-5 correspondente à pontuação (0=nível 0, 40=nível 1, 80=nível 2, etc.).
4. Situações que ZERAM a redação inteira: fuga total do tema, não é dissertativo-argumentativo, cópia dos textos motivadores sem autoria. Marque fleeingTheme=true.
5. Situação que ZERA a Competência 5: proposta ausente OU desrespeito aos direitos humanos. Marque violatesHumanRights=true.
6. Para a C5, verifique os 5 elementos: AGENTE + AÇÃO + MEIO + FINALIDADE + RESPEITO AOS DIREITOS HUMANOS. A nota depende de quantos elementos estão presentes e bem articulados, e se a proposta é viável.

SAÍDA (tudo em português brasileiro):
- detectedTheme: identifique o tema que a redação aborda (se houver, mesmo que não tenha sido informado).
- feedback: análise específica citando trechos da redação.
- justification: cite passagens exatas que determinaram a pontuação.
- suggestions: 2-3 ações concretas pra subir de nível.
- strengths / improvements: visão geral (3-5 bullets cada).
- revisionExample: reescreva UM parágrafo fraco da redação como modelo de melhoria (3-5 frases, mostrando como chegar a 160-200 pts em alguma competência).

SEJA CRITERIOSO: corretores do ENEM não dão pontos por intenção. Se o aluno quase chega no nível X, mas não fecha, dê o nível X-1.`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Corrija a redação abaixo conforme a rubrica oficial do ENEM.
${theme ? `Tema proposto: "${theme}"` : "Tema não informado — detecte pelo conteúdo."}
${hasImages ? "\nA redação está nas imagens anexas. Transcreva mentalmente o texto manuscrito/impresso, conte as palavras e avalie pelas 5 competências. Se houver múltiplas imagens, são páginas em sequência." : ""}

${essay ? `Redação (texto digitado):\n${essay}` : ""}`,
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

    const analysis = {
      ...object,
      maxScore: 1000,
    }

    return Response.json({ analysis })
  } catch (error) {
    console.error("[enem/analyze] error:", error)
    return Response.json({ error: "Falha ao corrigir a redação" }, { status: 500 })
  }
}
