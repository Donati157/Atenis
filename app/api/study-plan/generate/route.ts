import { generateObject } from "ai"
import { google } from "@ai-sdk/google"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

export const maxDuration = 30

const planSchema = z.object({
  title: z.string(),
  goal: z.string(),
  days: z.array(
    z.object({
      day: z.number(),
      subject: z.string(),
      topic: z.string(),
      tasks: z.array(z.string()),
      estimatedMinutes: z.number(),
    }),
  ),
})

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: "unauthorized" }, { status: 401 })

    const { goal, days, gradeLevel, weakAreas } = await req.json()

    if (!goal || typeof goal !== "string") {
      return Response.json({ error: "goal required" }, { status: 400 })
    }

    const { object } = await generateObject({
      model: google("gemini-2.5-flash-lite"),
      schema: planSchema,
      messages: [
        {
          role: "system",
          content: `Você é um tutor brasileiro que monta planos de estudo personalizados.

Gere um plano de ${days || 7} dias com base no objetivo do aluno. Cada dia deve ter:
- subject: matéria (Português, Matemática, História, etc.)
- topic: tópico específico a estudar
- tasks: lista de 2-4 tarefas concretas do dia (ex: "Ler capítulo X", "Resolver 10 questões do ENEM sobre Y", "Fazer resumo em 1 página")
- estimatedMinutes: tempo estimado

Considere:
- Progressão gradual (do fácil ao difícil)
- Mix de matérias (não concentrar 1 matéria só)
- Revisão dos pontos fracos identificados (se houver)
- Tarefas ATIVAS (fazer exercícios, resumir), não só ler

Title e goal devem refletir o que o aluno pediu. Tudo em português brasileiro.`,
        },
        {
          role: "user",
          content: `Monte um plano de estudos:
Objetivo: ${goal}
Série do aluno: ${gradeLevel || "não informada"}
Quantidade de dias: ${days || 7}
${weakAreas && weakAreas.length > 0 ? `Pontos fracos detectados recentemente: ${weakAreas.join(", ")}` : "Sem pontos fracos conhecidos."}`,
        },
      ],
    })

    return Response.json({ plan: object })
  } catch (error) {
    console.error("[study-plan/generate] error:", error)
    return Response.json({ error: "Falha ao gerar o plano" }, { status: 500 })
  }
}
