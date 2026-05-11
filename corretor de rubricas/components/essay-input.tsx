"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { gcdElements } from "@/lib/rubric-data"
import { Spinner } from "@/components/ui/spinner"

interface EssayInputProps {
  onAnalyze: (essay: string, gcdElement: string | null) => void
  isLoading: boolean
}

export function EssayInput({ onAnalyze, isLoading }: EssayInputProps) {
  const [essay, setEssay] = useState("")
  const [gcdElement, setGcdElement] = useState<string>("")

  const wordCount = essay.trim() ? essay.trim().split(/\s+/).length : 0
  const isValidLength = wordCount >= 100 // Minimum for testing, ideally 1200

  const getWordCountColor = () => {
    if (wordCount < 1200) return "text-yellow-400"
    if (wordCount > 1500) return "text-red-400"
    return "text-green-400"
  }

  const handleSubmit = () => {
    if (!essay.trim() || isLoading) return
    onAnalyze(essay, gcdElement || null)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          Elemento GCD (Opcional)
        </label>
        <Select value={gcdElement} onValueChange={setGcdElement}>
          <SelectTrigger className="bg-input border-border">
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
        <p className="text-xs text-muted-foreground">
          Se nao especificado, a IA tentara detectar automaticamente.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground">
            Seu Ensaio
          </label>
          <span className={`text-sm font-mono ${getWordCountColor()}`}>
            {wordCount} / 1200-1500 palavras
          </span>
        </div>
        <Textarea
          placeholder="Cole ou digite seu ensaio aqui..."
          className="min-h-[400px] bg-input border-border resize-none text-base leading-relaxed"
          value={essay}
          onChange={(e) => setEssay(e.target.value)}
          disabled={isLoading}
        />
        {wordCount < 1200 && wordCount > 0 && (
          <p className="text-xs text-yellow-400">
            Seu ensaio tem menos de 1200 palavras. O minimo recomendado e 1200 palavras.
          </p>
        )}
        {wordCount > 1500 && (
          <p className="text-xs text-red-400">
            Seu ensaio excede o limite de 1500 palavras.
          </p>
        )}
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!isValidLength || isLoading}
        className="w-full h-12 text-base font-medium bg-primary hover:bg-primary/90"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <Spinner className="h-4 w-4" />
            Analisando...
          </span>
        ) : (
          "Analisar Ensaio"
        )}
      </Button>

      {!isValidLength && essay.length > 0 && (
        <p className="text-sm text-center text-muted-foreground">
          Adicione pelo menos 100 palavras para analisar.
        </p>
      )}
    </div>
  )
}
