import { generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"
import { rubricCriteria, gcdElements } from "@/lib/gcd-rubric"

export const maxDuration = 60

const analysisSchema = z.object({
  overallScore: z.number(),
  wordCount: z.number(),
  criteria: z.array(
    z.object({
      id: z.string(),
      level: z.enum(["exemplifies", "meets", "approaches", "developing"]),
      score: z.number(),
      feedback: z.string(),
      suggestions: z.array(z.string()),
    }),
  ),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  structureSuggestion: z.object({
    introduction: z.string(),
    body: z.array(z.string()),
    conclusion: z.string(),
  }),
  detectedGcdElement: z.string().nullable(),
})

export async function POST(req: Request) {
  try {
    const { essay, gcdElement, images } = await req.json()

    const hasImages = Array.isArray(images) && images.length > 0

    if (!hasImages && (!essay || typeof essay !== "string" || !essay.trim())) {
      return Response.json(
        { error: "Essay text or image is required" },
        { status: 400 },
      )
    }

    const criteriaDescription = rubricCriteria
      .map(
        (c) =>
          `${c.name} (${c.weight}%): ${c.levels
            .map((l) => `${l.level}: ${l.description}`)
            .join("; ")}`,
      )
      .join("\n\n")

    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: analysisSchema,
      messages: [
        {
          role: "system",
          content: `You are an expert essay evaluator for the Global Citizen Diploma (GCD) program at GCDSA.
Your task is to analyze student essays and provide detailed feedback with ACCURATE SCORES based on the official rubric criteria.

The essay should be between 1200-1500 words. Evidence is required for Certificate or Diploma eligibility.

Available GCD Elements: ${gcdElements.join(", ")}

Rubric Criteria:
${criteriaDescription}

SCORING GUIDELINES — BE STRICT AND ACCURATE:
Each criterion has a specific weight. Calculate the score for each criterion:
- "exemplifies" = 100% of the weight (e.g. Reflection 20/20, Evidence 40/40)
- "meets" = 75% of the weight
- "approaches" = 50% of the weight
- "developing" = 25% of the weight

CRITERIA WEIGHTS:
1. Reflection and Insight: 20 pts
2. Structure and Organization: 20 pts
3. Language and Style: 20 pts
4. Relevance to GCD Element: 20 pts
5. Evidence: 40 pts (MOST IMPORTANT — no evidence = no eligibility)

TOTAL: 100 pts

EVALUATION REQUIREMENTS:
- Evaluate EACH criterion independently and assign the appropriate level
- Calculate the score for each criterion based on level and weight
- The overallScore MUST be the sum of all individual criteria scores
- Be FAIR but RIGOROUS — don't give high scores without justification
- If there is NO evidence mentioned or attached, Evidence must be "developing" (10/40) or lower
- If the word count is below 1200 or above 1500, note this in feedback

FEEDBACK REQUIREMENTS:
- All feedback, suggestions, strengths and improvements in Portuguese (Brazil)
- Be specific about what works and what doesn't
- Quote specific passages when giving feedback
- Provide actionable suggestions for improvement
- Structure suggestions should help the student reorganize their essay if needed

For the 'id' field in the criteria array, use these exact ids: "reflection", "structure", "language", "gcd-relevance", "evidence".`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Please analyze the following essay for the Global Citizen Diploma.
${gcdElement ? `The student is writing about the GCD Element: ${gcdElement}` : "The GCD element has not been specified — detect it from the content."}
${hasImages ? "\nThe student's essay is in the attached image(s). Read the handwritten/printed text carefully, transcribe it mentally, and count words from the transcribed text. If multiple images, treat them as pages in order." : ""}

${essay ? `Student's typed essay:\n${essay}` : ""}`,
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

    return Response.json({ analysis: object })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("[gcd/analyze] error:", msg, error)
    return Response.json(
      { error: "Failed to analyze essay", detail: msg },
      { status: 500 },
    )
  }
}
