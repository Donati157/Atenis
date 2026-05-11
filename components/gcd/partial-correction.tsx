"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { gcdElements } from "@/lib/gcd-rubric"
import { CheckCircle2, Lightbulb, AlertTriangle, Copy, RotateCcw } from "lucide-react"

const essayParts = [
  { id: "introduction", label: "Introdução", description: "Hook e tese" },
  { id: "body1", label: "Desenvolvimento 1", description: "Descrição da experiência" },
  { id: "body2", label: "Desenvolvimento 2", description: "Desafios enfrentados" },
  { id: "body3", label: "Desenvolvimento 3", description: "Momento de transformação" },
  { id: "body4", label: "Desenvolvimento 4", description: "Conexão com elemento GCD" },
  { id: "conclusion", label: "Conclusão", description: "Síntese, impacto e futuro" },
  { id: "custom", label: "Trecho personalizado", description: "Qualquer parte do texto" },
]

interface CorrectionResult {
  originalText: string
  correctedText: string
  feedback: string
  improvements: string[]
  grammarIssues: string[]
  score: number
}

export function PartialCorrection() {
  const [selectedPart, setSelectedPart] = useState<string>("")
  const [text, setText] = useState("")
  const [gcdElement, setGcdElement] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<CorrectionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0

  const handleCorrect = async () => {
    if (!text.trim() || !selectedPart || isLoading) return
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/gcd/correct-part", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          part: selectedPart,
          gcdElement: gcdElement || null,
        }),
      })
      if (!response.ok) throw new Error("Falha ao corrigir o texto")
      const data = await response.json()
      setResult(data.correction)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocorreu um erro inesperado")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = async () => {
    if (result?.correctedText) {
      await navigator.clipboard.writeText(result.correctedText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleReset = () => {
    setResult(null)
    setError(null)
  }

  const selectedPartInfo = essayParts.find((p) => p.id === selectedPart)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {essayParts.map((part) => (
          <button
            key={part.id}
            onClick={() => setSelectedPart(part.id)}
            className={`p-4 rounded-lg border text-left transition-all ${
              selectedPart === part.id
                ? "border-accent bg-accent/10 ring-1 ring-accent"
                : "border-border bg-card hover:border-accent/50"
            }`}
          >
            <span className="block text-sm font-medium text-foreground">{part.label}</span>
            <span className="block text-xs text-muted-foreground mt-1">{part.description}</span>
          </button>
        ))}
      </div>

      {selectedPart && !result && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Elemento GCD (opcional)</label>
            <Select value={gcdElement} onValueChange={setGcdElement}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o elemento GCD..." />
              </SelectTrigger>
              <SelectContent>
                {gcdElements.map((element) => (
                  <SelectItem key={element} value={element}>
                    {element}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">
                {selectedPartInfo?.label}
              </label>
              <span className="text-sm font-mono text-muted-foreground">{wordCount} palavras</span>
            </div>
            <Textarea
              placeholder={`Cole ou digite a ${selectedPartInfo?.label.toLowerCase()} aqui...`}
              className="min-h-[250px] resize-none text-base leading-relaxed"
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button
            onClick={handleCorrect}
            disabled={!text.trim() || isLoading}
            className="w-full h-12 text-base font-medium"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Spinner className="h-4 w-4" />
                Corrigindo...
              </span>
            ) : (
              `Corrigir ${selectedPartInfo?.label}`
            )}
          </Button>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground font-display">
              Resultado da correção
            </h3>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Nova correção
            </Button>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-lg bg-card border">
            <div
              className={`text-4xl font-bold font-display ${
                result.score >= 80
                  ? "text-green-400"
                  : result.score >= 60
                  ? "text-yellow-400"
                  : "text-red-400"
              }`}
            >
              {result.score}%
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Qualidade do trecho</p>
              <p className="text-xs text-muted-foreground">
                {result.score >= 80
                  ? "Excelente"
                  : result.score >= 60
                  ? "Bom, mas pode melhorar"
                  : "Precisa de revisão"}
              </p>
            </div>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                  Texto corrigido
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={handleCopy}>
                  <Copy className="h-4 w-4 mr-2" />
                  {copied ? "Copiado!" : "Copiar"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20 text-foreground leading-relaxed whitespace-pre-wrap">
                {result.correctedText}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-400" />
                Feedback
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">{result.feedback}</p>
            </CardContent>
          </Card>

          {result.grammarIssues.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-400" />
                  Problemas gramaticais corrigidos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.grammarIssues.map((issue, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="text-orange-400 mt-1">•</span>
                      {issue}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {result.improvements.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-accent" />
                  Sugestões de melhoria
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.improvements.map((imp, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="text-accent mt-1">•</span>
                      {imp}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-muted-foreground">
                Texto original (para comparação)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-lg bg-muted/30 text-muted-foreground leading-relaxed whitespace-pre-wrap text-sm">
                {result.originalText}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
