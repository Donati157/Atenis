"use client"

import { useState } from "react"
import { AIEye } from "@/components/gcd/ai-eye"
import { ENEMEssayInput } from "@/components/enem/enem-essay-input"
import {
  ENEMAnalysisResult,
  type ENEMAnalysisData,
} from "@/components/enem/enem-analysis-result"
import { ENEMRubricDisplay } from "@/components/enem/enem-rubric-display"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Eye, BookOpen, Sparkles } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { logLearningEvent } from "@/lib/learning-events"

export function ENEMCorrector() {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<ENEMAnalysisData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = async (
    essay: string,
    theme: string | null,
    images: string[],
  ) => {
    setIsAnalyzing(true)
    setError(null)
    try {
      const response = await fetch("/api/enem/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ essay, theme, images }),
      })
      if (!response.ok) throw new Error("Falha ao corrigir a redação")
      const data = await response.json()
      setAnalysis(data.analysis)

      void (async () => {
        try {
          const supabase = createClient()
          const { data: userData } = await supabase.auth.getUser()
          if (!userData.user) return
          await logLearningEvent(supabase, userData.user.id, {
            kind: "correction_essay",
            subject: "enem_redacao",
            topic: theme || data.analysis.detectedTheme || "redacao-enem",
            score: data.analysis.totalScore,
            metadata: {
              rubric: "enem",
              max: 1000,
              fleeingTheme: data.analysis.fleeingTheme,
              violatesHumanRights: data.analysis.violatesHumanRights,
            },
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
                Corretor ENEM
              </h1>
              <p className="text-xs text-muted-foreground">Redação · 5 competências · 0-1000 pts</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            <span>Rubrica oficial INEP</span>
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
              Corrija sua redação ENEM
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto text-balance">
              Avaliação competência por competência (C1 a C5), nota de 0 a 1000, feedback específico
              e trecho revisado. Alertas de fuga ao tema e violação de direitos humanos.
            </p>
          </div>
        )}

        <Tabs defaultValue="analyze" className="max-w-4xl mx-auto">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="analyze" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Corrigir redação
            </TabsTrigger>
            <TabsTrigger value="rubric" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Rubrica oficial
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analyze" className="space-y-6">
            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-sm text-destructive">
                {error}
              </div>
            )}
            {analysis ? (
              <ENEMAnalysisResult analysis={analysis} onReset={handleReset} />
            ) : (
              <ENEMEssayInput onAnalyze={handleAnalyze} isLoading={isAnalyzing} />
            )}
          </TabsContent>

          <TabsContent value="rubric">
            <ENEMRubricDisplay />
          </TabsContent>
        </Tabs>

        <div className="max-w-4xl mx-auto mt-16 pt-8 border-t border-border/50 text-center text-xs text-muted-foreground">
          <p>Rubrica oficial da redação do ENEM (Cartilha do Participante INEP).</p>
        </div>
      </div>
    </div>
  )
}
