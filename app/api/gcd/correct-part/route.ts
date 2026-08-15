import { generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"

export const maxDuration = 60

const partDescriptions: Record<string, string> = {
  introduction:
    "A introdução deve ter um hook cativante, contexto da experiência e uma tese clara sobre o que foi aprendido.",
  body1:
    "O primeiro parágrafo do desenvolvimento deve descrever a experiência com detalhes específicos, cenário e pessoas envolvidas.",
  body2:
    "Este parágrafo deve abordar os desafios enfrentados, obstáculos, dificuldades e momentos de dúvida.",
  body3:
    "O parágrafo de transformação deve mostrar o ponto de virada e a realização importante que mudou sua perspectiva.",
  body4:
    "Este parágrafo deve conectar claramente a experiência com o elemento GCD escolhido, mostrando a relevância.",
  conclusion:
    "A conclusão deve sintetizar o aprendizado, mostrar o impacto na sua vida e como aplicará esse conhecimento no futuro.",
  custom:
    "Analise este trecho do ensaio e corrija-o de acordo com os padrões do Global Citizen Diploma.",
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
    const { text, part, gcdElement } = await req.json()

    if (!text || !part) {
      return Response.json({ error: "Texto e parte são obrigatórios" }, { status: 400 })
    }

    const partDescription = partDescriptions[part] || partDescriptions.custom

    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: correctionSchema,
      messages: [
        {
          role: "system",
          content: `Você é um especialista em correção de ensaios para o Global Citizen Diploma (GCD).
Sua tarefa é corrigir e melhorar um trecho específico de um ensaio.

PARTE DO ENSAIO: ${part}
REQUISITOS DESTA PARTE: ${partDescription}
${gcdElement ? `ELEMENTO GCD: ${gcdElement}` : ""}

INSTRUÇÕES DE CORREÇÃO:
1. Corrija TODOS os erros gramaticais, ortográficos e de pontuação
2. Melhore a clareza e fluidez do texto
3. Mantenha a voz e estilo do autor, apenas aprimorando
4. Adicione transições se necessário
5. Garanta que o texto atende aos requisitos da parte específica
6. Se for introdução, garanta hook, contexto e tese
7. Se for conclusão, garanta síntese, impacto e visão de futuro
8. Para parágrafos do corpo, garanta reflexão profunda e detalhes específicos

CRITÉRIOS DE PONTUAÇÃO (0–100):
- 90-100: Excelente — atende todos os critérios, linguagem impecável
- 75-89: Bom — atende a maioria dos critérios, poucos erros
- 60-74: Satisfatório — atende alguns critérios, vários erros
- 40-59: Precisa melhorar — falta profundidade ou muitos erros
- 0-39: Insuficiente — não atende aos requisitos básicos

IMPORTANTE:
- Responda TUDO em português (Brasil)
- Seja específico sobre o que foi mudado e por quê
- Mantenha o texto corrigido com tamanho similar ao original
- Não invente informações, apenas melhore o que foi escrito`,
        },
        {
          role: "user",
          content: `Por favor, corrija e melhore este trecho (${part}):\n\n${text}`,
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
    console.error("[gcd/correct-part] error:", error)
    return Response.json({ error: "Falha ao processar a correção" }, { status: 500 })
  }
}
