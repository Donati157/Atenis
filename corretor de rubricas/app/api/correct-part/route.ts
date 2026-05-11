import { generateText, Output } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { z } from "zod"

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })

const partDescriptions: Record<string, string> = {
  introduction: "A introducao deve ter um hook cativante, contexto da experiencia e uma tese clara sobre o que foi aprendido.",
  body1: "O primeiro paragrafo do desenvolvimento deve descrever a experiencia com detalhes especificos, cenario e pessoas envolvidas.",
  body2: "Este paragrafo deve abordar os desafios enfrentados, obstaculos, dificuldades e momentos de duvida.",
  body3: "O paragrafo de transformacao deve mostrar o ponto de virada e a realizacao importante que mudou sua perspectiva.",
  body4: "Este paragrafo deve conectar claramente a experiencia com o elemento GCD escolhido, mostrando a relevancia.",
  conclusion: "A conclusao deve sintetizar o aprendizado, mostrar o impacto na sua vida e como aplicara esse conhecimento no futuro.",
  custom: "Analise este trecho do ensaio e corrija-o de acordo com os padroes do Global Citizen Diploma.",
}

export async function POST(req: Request) {
  try {
    const { text, part, gcdElement } = await req.json()

    if (!text || !part) {
      return Response.json(
        { error: "Texto e parte sao obrigatorios" },
        { status: 400 }
      )
    }

    const partDescription = partDescriptions[part] || partDescriptions.custom

    const { output } = await generateText({
      model: openai("gpt-4o"),
      output: Output.object({
        schema: z.object({
          correctedText: z.string().describe("O texto corrigido e melhorado"),
          feedback: z.string().describe("Feedback geral sobre o trecho em portugues"),
          improvements: z.array(z.string()).describe("Lista de sugestoes de melhoria em portugues"),
          grammarIssues: z.array(z.string()).describe("Problemas gramaticais encontrados e corrigidos em portugues"),
          score: z.number().min(0).max(100).describe("Pontuacao de qualidade do trecho (0-100)"),
        }),
      }),
      messages: [
        {
          role: "system",
          content: `Voce e um especialista em correcao de ensaios para o Global Citizen Diploma (GCD).
Sua tarefa e corrigir e melhorar um trecho especifico de um ensaio.

PARTE DO ENSAIO: ${part}
REQUISITOS DESTA PARTE: ${partDescription}
${gcdElement ? `ELEMENTO GCD: ${gcdElement}` : ""}

INSTRUCOES DE CORRECAO:
1. Corrija TODOS os erros gramaticais, ortograficos e de pontuacao
2. Melhore a clareza e fluidez do texto
3. Mantenha a voz e estilo do autor, apenas aprimorando
4. Adicione transicoes se necessario
5. Garanta que o texto atende aos requisitos da parte especifica
6. Se for a introducao, garanta que tem hook, contexto e tese
7. Se for conclusao, garanta sintese, impacto e visao de futuro
8. Para paragrafos do corpo, garanta reflexao profunda e detalhes especificos

CRITERIOS DE PONTUACAO:
- 90-100: Excelente - atende todos os criterios, linguagem impecavel
- 75-89: Bom - atende a maioria dos criterios, poucos erros
- 60-74: Satisfatorio - atende alguns criterios, varios erros
- 40-59: Precisa melhorar - falta profundidade ou muitos erros
- 0-39: Insuficiente - nao atende aos requisitos basicos

IMPORTANTE:
- Responda TUDO em portugues (Brasil)
- Seja especifico sobre o que foi mudado e por que
- Mantenha o texto corrigido com tamanho similar ao original
- Nao invente informacoes, apenas melhore o que foi escrito`,
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
        ...output,
      },
    })
  } catch (error) {
    console.error("Erro ao corrigir:", error)
    return Response.json(
      { error: "Falha ao processar a correcao" },
      { status: 500 }
    )
  }
}
