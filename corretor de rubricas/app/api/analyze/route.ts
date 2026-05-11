import { generateText, Output } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { z } from "zod"
import { rubricCriteria, gcdElements } from "@/lib/rubric-data"

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })

export const maxDuration = 60

const analysisSchema = z.object({
  overallScore: z.number().describe("Overall score from 0 to 100"),
  wordCount: z.number().describe("Total word count of the essay"),
  criteria: z.array(
    z.object({
      id: z.string().describe("Criteria ID"),
      level: z
        .enum(["exemplifies", "meets", "approaches", "developing"])
        .describe("Performance level"),
      score: z.number().describe("Score for this criteria based on weight"),
      feedback: z.string().describe("Specific feedback for this criteria in Portuguese"),
      suggestions: z
        .array(z.string())
        .describe("Specific suggestions to improve in Portuguese"),
    })
  ),
  strengths: z
    .array(z.string())
    .describe("Key strengths of the essay in Portuguese"),
  improvements: z
    .array(z.string())
    .describe("Areas needing improvement in Portuguese"),
  structureSuggestion: z.object({
    introduction: z.string().describe("Suggested introduction structure in Portuguese"),
    body: z.array(z.string()).describe("Suggested body paragraphs in Portuguese"),
    conclusion: z.string().describe("Suggested conclusion in Portuguese"),
  }),
  detectedGcdElement: z.string().nullable().describe("Detected GCD element"),
})

export async function POST(req: Request) {
  try {
    const { essay, gcdElement } = await req.json()

    if (!essay || typeof essay !== "string") {
      return Response.json(
        { error: "Essay text is required" },
        { status: 400 }
      )
    }

    const criteriaDescription = rubricCriteria
      .map(
        (c) =>
          `${c.name} (${c.weight}%): ${c.levels.map((l) => `${l.level}: ${l.description}`).join("; ")}`
      )
      .join("\n\n")

    const { output } = await generateText({
      model: openai("gpt-4o"),
      output: Output.object({
        schema: analysisSchema,
      }),
      messages: [
        {
          role: "system",
          content: `You are an expert essay evaluator for the Global Citizen Diploma (GCD) program at GCDSA.
Your task is to analyze student essays and provide detailed feedback with ACCURATE SCORES based on the official rubric criteria.

The essay should be between 1200-1500 words. Evidence is required for Certificate or Diploma eligibility.

Available GCD Elements: ${gcdElements.join(", ")}

Rubric Criteria:
${criteriaDescription}

SCORING GUIDELINES - BE STRICT AND ACCURATE:
Each criteria has a specific weight. Calculate the score for each criteria as follows:
- "exemplifies" = 100% of the weight (e.g., Reflection 20/20, Evidence 40/40)
- "meets" = 75% of the weight (e.g., Reflection 15/20, Evidence 30/40)
- "approaches" = 50% of the weight (e.g., Reflection 10/20, Evidence 20/40)
- "developing" = 25% of the weight (e.g., Reflection 5/20, Evidence 10/40)

CRITERIA WEIGHTS:
1. Reflection and Insight: 20 points
2. Structure and Organization: 20 points
3. Language and Style: 20 points
4. Relevance to GCD Element: 20 points
5. Evidence: 40 points (MOST IMPORTANT - no evidence = no eligibility)

TOTAL: 100 points

EVALUATION REQUIREMENTS:
- Evaluate EACH criterion independently and assign the appropriate level (exemplifies/meets/approaches/developing)
- Calculate the score for each criterion based on its level and weight
- The overallScore MUST be the sum of all individual criteria scores
- Be FAIR but RIGOROUS - don't give high scores without justification
- If there's NO evidence mentioned or attached, the Evidence score should be "developing" (10/40) or lower
- If the word count is below 1200 or above 1500, note this in feedback

FEEDBACK REQUIREMENTS:
- Provide all feedback, suggestions, strengths, and improvements in Portuguese (Brazil)
- Be specific about what works and what doesn't
- Quote specific passages when giving feedback
- Provide actionable suggestions for improvement
- Structure suggestions should help the student reorganize their essay if needed`,
        },
        {
          role: "user",
          content: `Please analyze the following essay for the Global Citizen Diploma.
${gcdElement ? `The student is writing about the GCD Element: ${gcdElement}` : "The GCD element has not been specified."}

Essay:
${essay}`,
        },
      ],
    })

    return Response.json({ analysis: output })
  } catch (error) {
    console.error("Analysis error:", error)
    return Response.json(
      { error: "Failed to analyze essay" },
      { status: 500 }
    )
  }
}
