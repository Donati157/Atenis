"use client"

import { useState } from "react"
import { AIEye } from "@/components/gcd/ai-eye"
import { APEssayInput } from "@/components/ap/ap-essay-input"
import { APAnalysisResult, type APAnalysisData } from "@/components/ap/ap-analysis-result"
import { APRubricDisplay } from "@/components/ap/ap-rubric-display"
import { APPartialCorrection } from "@/components/ap/ap-partial-correction"
import { APPracticePicker } from "@/components/ap/ap-practice-picker"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Eye, BookOpen, Sparkles, Pencil, Target } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { logLearningEvent } from "@/lib/learning-events"

export function APCorrector() {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<APAnalysisData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = async (
    essay: string,
    rubricId: string,
    prompt: string | null,
    images: string[],
    apCourseId?: string | null,
  ) => {
    setIsAnalyzing(true)
    setError(null)
    try {
      const response = await fetch("/api/ap/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ essay, rubricId, prompt, images, apCourseId }),
      })
      if (!response.ok) throw new Error("Falha ao analisar a resposta")
      const data = await response.json()
      setAnalysis(data.analysis)

      void (async () => {
        try {
          const supabase = createClient()
          const { data: userData } = await supabase.auth.getUser()
          if (!userData.user) return
          await logLearningEvent(supabase, userData.user.id, {
            kind: "correction_essay",
            subject: rubricId,
            topic: "ap-mock",
            score: data.analysis.totalScore,
            metadata: { rubric: "ap", max: data.analysis.maxScore, prompt: prompt ?? null },
          })
        } catch {}
      })()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocorreu um erro inesperado")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleReset = () => {
    setAnalysis(null)
    setError(null)
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="border-b border-border/50 bg-card/30">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AIEye isAnalyzing={isAnalyzing} size={40} />
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight font-display">
                Corretor AP College Board
              </h1>
              <p className="text-xs text-muted-foreground">
                Corrija sua resposta de prova AP pela rubrica oficial
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            <span>Rubrica oficial</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {!analysis && (
          <div className="text-center mb-8 space-y-4">
            <div className="flex justify-center mb-6">
              <AIEye isAnalyzing={isAnalyzing} size={120} />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground text-balance font-display">
              Corrija sua prova AP com a rubrica oficial
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-balance">
              Cola sua resposta de uma questão AP (Inglês ou História) e a IA avalia item por item
              da rubrica do College Board — mesmo sistema de pontuação que os corretores usam.
            </p>
          </div>
        )}

        <Tabs defaultValue="analyze" className="max-w-4xl mx-auto">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="analyze" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Corrigir</span>
              <span className="sm:hidden">Corrigir</span>
            </TabsTrigger>
            <TabsTrigger value="exam" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">Simulado</span>
              <span className="sm:hidden">Prova</span>
            </TabsTrigger>
            <TabsTrigger value="correct" className="flex items-center gap-2">
              <Pencil className="h-4 w-4" />
              <span className="hidden sm:inline">Corrigir partes</span>
              <span className="sm:hidden">Partes</span>
            </TabsTrigger>
            <TabsTrigger value="rubric" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Rubrica
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analyze" className="space-y-6">
            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-sm text-destructive">
                {error}
              </div>
            )}
            {analysis ? (
              <APAnalysisResult analysis={analysis} onReset={handleReset} />
            ) : (
              <APEssayInput onAnalyze={handleAnalyze} isLoading={isAnalyzing} />
            )}
          </TabsContent>

          <TabsContent value="exam" className="space-y-6">
            <APPracticePicker />
          </TabsContent>

          <TabsContent value="correct" className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-foreground font-display">
                Corrigir partes específicas
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Selecione uma parte do ensaio para receber correção gramatical, feedback pela
                rubrica e sugestões.
              </p>
            </div>
            <APPartialCorrection />
          </TabsContent>

          <TabsContent value="rubric">
            <APRubricDisplay />
          </TabsContent>
        </Tabs>

        <div className="max-w-4xl mx-auto mt-16 pt-8 border-t border-border/50 text-center text-xs text-muted-foreground">
          <p>Ferramenta de apoio para AP College Board — rubricas oficiais implementadas.</p>
        </div>
      </div>
    </div>
  )
}
