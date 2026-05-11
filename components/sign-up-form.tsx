"use client"

import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, GraduationCap, Briefcase, ArrowLeft, Compass } from "lucide-react"
import { cn } from "@/lib/utils"
import { TeachingPicker } from "@/components/teaching-picker"
import { Input } from "@/components/ui/input"
import {
  GRADE_LEVELS,
  SELECT_CLASS,
  cleanAssignments,
  countAssignments,
  type TeachingAssignments,
} from "@/lib/grades"
import { LEADERSHIP_EMAIL_DOMAIN } from "@/lib/roles"

type Role = "student" | "professor" | "leadership"
type Step = "role" | "form"

const SIGNUP_INTENT_KEY = "atenis.signupIntent"

export function SignUpForm() {
  const [step, setStep] = useState<Step>("role")
  const [role, setRole] = useState<Role>("student")

  const [gradeLevel, setGradeLevel] = useState<string>("")
  const [teachingAssignments, setTeachingAssignments] = useState<TeachingAssignments>({})
  const [leadershipTitle, setLeadershipTitle] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const pickRole = (r: Role) => {
    setRole(r)
    setStep("form")
    setError(null)
  }

  const goBackToRole = () => {
    setStep("role")
    setError(null)
  }

  const totalAssignments = countAssignments(teachingAssignments)

  const continueWithGoogle = async () => {
    setError(null)

    if (role === "student" && !gradeLevel) {
      setError("Selecione sua série antes de continuar.")
      return
    }
    if (role === "professor" && totalAssignments === 0) {
      setError("Selecione pelo menos uma matéria em alguma série.")
      return
    }
    if (role === "leadership" && !leadershipTitle.trim()) {
      setError("Diga seu cargo de liderança (ex: Diretora, Coordenadora, Mentora).")
      return
    }

    const clean =
      role === "professor" ? cleanAssignments(teachingAssignments) : {}

    const intent = {
      role,
      grade_level: role === "student" ? gradeLevel : null,
      teaching_grades: role === "professor" ? Object.keys(clean) : null,
      teaching_natural_sub: null,
      teaching_assignments: role === "professor" ? clean : null,
      leadership_title: role === "leadership" ? leadershipTitle.trim() : null,
    }

    try {
      window.localStorage.setItem(SIGNUP_INTENT_KEY, JSON.stringify(intent))
    } catch {
      // localStorage bloqueado — sem problema, /auth/complete cria profile padrão
    }

    setLoading(true)
    const supabase = createClient()
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/complete`,
        queryParams: { prompt: "select_account" },
      },
    })
    if (oauthError) {
      setError(oauthError.message)
      setLoading(false)
    }
  }

  if (step === "role") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Criar conta</CardTitle>
          <CardDescription>
            Pra começar, me conta: qual seu papel na Atenis?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => pickRole("student")}
              className="group flex flex-col items-center gap-2 rounded-xl border border-input bg-card/50 hover:bg-accent/10 hover:border-accent/50 transition-colors p-5 text-center"
            >
              <div className="h-12 w-12 rounded-full bg-accent/15 text-accent flex items-center justify-center">
                <GraduationCap className="h-6 w-6" />
              </div>
              <span className="font-semibold text-base">Sou estudante</span>
              <span className="text-xs text-muted-foreground">
                Quero estudar, tirar dúvidas e me preparar para provas.
              </span>
            </button>
            <button
              type="button"
              onClick={() => pickRole("professor")}
              className="group flex flex-col items-center gap-2 rounded-xl border border-input bg-card/50 hover:bg-accent/10 hover:border-accent/50 transition-colors p-5 text-center"
            >
              <div className="h-12 w-12 rounded-full bg-primary/15 text-primary flex items-center justify-center">
                <Briefcase className="h-6 w-6" />
              </div>
              <span className="font-semibold text-base">Sou professor</span>
              <span className="text-xs text-muted-foreground">
                Quero acompanhar alunos e usar o Atenis com minhas turmas.
              </span>
            </button>
            <button
              type="button"
              onClick={() => pickRole("leadership")}
              className="group flex flex-col items-center gap-2 rounded-xl border border-input bg-card/50 hover:bg-accent/10 hover:border-accent/50 transition-colors p-5 text-center"
            >
              <div className="h-12 w-12 rounded-full bg-amber-500/15 text-amber-500 flex items-center justify-center">
                <Compass className="h-6 w-6" />
              </div>
              <span className="font-semibold text-base">Sou liderança</span>
              <span className="text-xs text-muted-foreground">
                Coordeno, dirijo ou mentoro turmas. Requer email{" "}
                <code className="text-[10px]">{LEADERSHIP_EMAIL_DOMAIN}</code>.
              </span>
            </button>
          </div>

          <p className="text-sm text-muted-foreground text-center mt-6">
            Já tem uma conta?{" "}
            <Link href="/auth/login" className="text-accent underline-offset-4 hover:underline">
              Entrar
            </Link>
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={goBackToRole}
            disabled={loading}
            aria-label="Voltar"
            className="-ml-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <CardTitle className="text-2xl">
              {role === "student"
                ? "Conta de Estudante"
                : role === "professor"
                  ? "Conta de Professor"
                  : "Conta de Liderança"}
            </CardTitle>
            <CardDescription>
              {role === "student" &&
                "Diga sua série e entre com sua conta Google."}
              {role === "professor" &&
                "Diga quais séries você leciona e entre com sua conta Google."}
              {role === "leadership" &&
                `Diga seu cargo e entre com sua conta Google ${LEADERSHIP_EMAIL_DOMAIN}.`}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {role === "student" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="grade">Sua série</Label>
              <select
                id="grade"
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                disabled={loading}
                className={cn(SELECT_CLASS, !gradeLevel && "text-muted-foreground")}
                required
              >
                <option value="" disabled>
                  — Selecione sua série —
                </option>
                {GRADE_LEVELS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {role === "professor" && (
            <TeachingPicker
              assignments={teachingAssignments}
              onChange={setTeachingAssignments}
              disabled={loading}
            />
          )}

          {role === "leadership" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="leadership_title">Seu cargo de liderança</Label>
              <Input
                id="leadership_title"
                placeholder="Ex: Diretora, Coordenadora pedagógica, Mentora do 11º"
                value={leadershipTitle}
                onChange={(e) => setLeadershipTitle(e.target.value)}
                disabled={loading}
                required
                maxLength={80}
              />
              <p className="text-xs text-muted-foreground">
                Aceito qualquer texto que descreva sua função na escola. Você
                vai entrar com seu Google da Concept ({LEADERSHIP_EMAIL_DOMAIN}).
              </p>
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={continueWithGoogle}
            disabled={loading}
            aria-label="Continuar com sua conta Google"
            className="w-full h-12 rounded-md bg-white hover:bg-zinc-100 active:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-zinc-900 inline-flex items-center justify-center gap-3 px-4 font-medium shadow-sm border border-zinc-200"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
                <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
                <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
                <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
              </svg>
            )}
            <span className="text-sm sm:text-base">
              {loading ? "Aguarde..." : "Continuar com Google"}
            </span>
          </button>

          <p className="text-xs text-muted-foreground text-center">
            Recomendado: use seu e-mail Google da escola (ex:{" "}
            <code>@conceptedu.com.br</code>).
          </p>

          <p className="text-sm text-muted-foreground text-center mt-2">
            Já tem uma conta?{" "}
            <Link href="/auth/login" className="text-accent underline-offset-4 hover:underline">
              Entrar
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
