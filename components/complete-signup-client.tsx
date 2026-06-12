"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, CheckCircle2, AlertCircle, GraduationCap, Briefcase, Compass } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { TeachingPicker } from "@/components/teaching-picker"
import {
  GRADE_LEVELS,
  SELECT_CLASS,
  cleanAssignments,
  countAssignments,
  type TeachingAssignments,
} from "@/lib/grades"
import { LEADERSHIP_EMAIL_DOMAIN, isLeadershipEmail } from "@/lib/roles"

type IntentRole = "student" | "professor" | "leadership"

interface SignupIntent {
  role: IntentRole
  school?: "concept" | "other" | null
  full_name?: string | null
  phone?: string | null
  grade_level?: string | null
  teaching_grades?: string[] | null
  teaching_natural_sub?: string[] | null
  teaching_assignments?: TeachingAssignments | null
  leadership_title?: string | null
}

const STORAGE_KEY = "atenis.signupIntent"

type Phase =
  | { kind: "working" }
  | { kind: "ok" }
  | { kind: "error"; message: string }
  | { kind: "needs-form"; suggestedRole: IntentRole }

export function CompleteSignupClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get("next") || "/dashboard"
  const [phase, setPhase] = useState<Phase>({ kind: "working" })

  const [formRole, setFormRole] = useState<IntentRole>("student")
  const [gradeLevel, setGradeLevel] = useState<string>("")
  const [teachingAssignments, setTeachingAssignments] =
    useState<TeachingAssignments>({})
  const [leadershipTitle, setLeadershipTitle] = useState<string>("")
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const totalAssignments = countAssignments(teachingAssignments)
  const emailIsLeadership = isLeadershipEmail(userEmail)

  const applyIntent = async (intent: SignupIntent): Promise<string | null> => {
    const supabase = createClient()
    const { error } = await supabase.rpc("apply_signup_intent", {
      p_role: intent.role,
      p_full_name: intent.full_name ?? null,
      p_grade_level: intent.grade_level ?? null,
      p_teaching_grades: intent.teaching_grades ?? null,
      p_teaching_natural_sub: intent.teaching_natural_sub ?? null,
      p_teaching_assignments: intent.teaching_assignments ?? null,
      p_leadership_title: intent.leadership_title ?? null,
    })
    if (error) return error.message
    // Phone fica fora do RPC porque a coluna foi adicionada depois
    // (migration 026). Atualiza separadamente quando vier no intent.
    if (intent.phone) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from("profiles")
          .update({ phone: intent.phone })
          .eq("id", user.id)
      }
    }
    return null
  }

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (cancelled) return

      if (!user) {
        setPhase({
          kind: "error",
          message: "Sessão não encontrada. Tente entrar novamente.",
        })
        return
      }

      setUserEmail(user.email ?? null)

      let intent: SignupIntent | null = null
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        if (raw) intent = JSON.parse(raw) as SignupIntent
      } catch {
        intent = null
      }

      if (intent) {
        const errMsg = await applyIntent({
          ...intent,
          full_name: intent.full_name ?? user.user_metadata?.full_name ?? null,
        })
        try {
          window.localStorage.removeItem(STORAGE_KEY)
        } catch {
          // ignore
        }
        if (cancelled) return
        if (errMsg) {
          // A conta auth já foi criada — só o profile/RPC falhou (geralmente
          // migration 018 faltando no Supabase). Em vez de assustar o aluno
          // com um erro de schema, logamos pra debug e mandamos pro login.
          console.error("apply_signup_intent failed:", errMsg)
          router.push("/auth/login?signup=ok")
          return
        }
        setPhase({ kind: "ok" })
        setTimeout(() => {
          router.push(next)
          router.refresh()
        }, 600)
        return
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, grade_level, teaching_grades, full_name, leadership_title")
        .eq("id", user.id)
        .maybeSingle()

      const role = (profile?.role as string | null) ?? "student"
      const studentOk =
        role === "student" && (profile?.grade_level as string | null)
      const professorOk =
        role === "professor" &&
        Array.isArray(profile?.teaching_grades) &&
        (profile!.teaching_grades as string[]).length > 0
      const leadershipOk =
        role === "leadership" && !!(profile?.leadership_title as string | null)
      const adminOk = role === "admin"

      if (cancelled) return

      if (studentOk || professorOk || leadershipOk || adminOk) {
        setPhase({ kind: "ok" })
        setTimeout(() => {
          router.push(next)
          router.refresh()
        }, 200)
        return
      }

      const suggested: IntentRole =
        role === "professor"
          ? "professor"
          : role === "leadership"
            ? "leadership"
            : "student"
      setFormRole(suggested)
      setPhase({ kind: "needs-form", suggestedRole: suggested })
    })()

    return () => {
      cancelled = true
    }
  }, [router, next])

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (formRole === "student" && !gradeLevel) {
      setFormError("Selecione sua série.")
      return
    }
    if (formRole === "professor" && totalAssignments === 0) {
      setFormError("Selecione pelo menos uma matéria em alguma série.")
      return
    }
    if (formRole === "leadership" && !leadershipTitle.trim()) {
      setFormError("Diga seu cargo de liderança.")
      return
    }
    if (formRole === "leadership" && !emailIsLeadership) {
      setFormError(
        `Liderança requer email ${LEADERSHIP_EMAIL_DOMAIN}. Saia e entre com a conta certa.`,
      )
      return
    }

    const clean =
      formRole === "professor" ? cleanAssignments(teachingAssignments) : {}

    setSubmitting(true)
    const supabase = createClient()
    const { data: userData } = await supabase.auth.getUser()
    const errMsg = await applyIntent({
      role: formRole,
      full_name: userData.user?.user_metadata?.full_name ?? null,
      grade_level: formRole === "student" ? gradeLevel : null,
      teaching_grades: formRole === "professor" ? Object.keys(clean) : null,
      teaching_natural_sub: null,
      teaching_assignments: formRole === "professor" ? clean : null,
      leadership_title:
        formRole === "leadership" ? leadershipTitle.trim() : null,
    })
    setSubmitting(false)
    if (errMsg) {
      // Mesmo padrão do fluxo de intent: usuário já está em auth.users.
      // Loga pra debug e manda pro login (provável migration 018 faltando).
      console.error("apply_signup_intent failed:", errMsg)
      router.push("/auth/login?signup=ok")
      return
    }
    setPhase({ kind: "ok" })
    setTimeout(() => {
      router.push(next)
      router.refresh()
    }, 400)
  }

  if (phase.kind === "working") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
            Finalizando seu cadastro...
          </CardTitle>
          <CardDescription>Só um instante.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (phase.kind === "ok") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-accent" />
            Tudo pronto!
          </CardTitle>
          <CardDescription>Levando você para o app...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (phase.kind === "error") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-destructive" />
            Algo não funcionou
          </CardTitle>
          <CardDescription>{phase.message}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => router.push("/auth/login")} className="w-full">
            Voltar para o login
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Faltam algumas infos</CardTitle>
        <CardDescription>
          Pra entrar no Atenis precisamos saber {formRole === "student" ? "sua série" : "as séries que você leciona"}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Você é</Label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFormRole("student")}
                disabled={submitting}
                className={cn(
                  "rounded-lg border p-3 text-sm flex flex-col items-center gap-1 transition-colors",
                  formRole === "student"
                    ? "border-accent bg-accent/15 text-accent font-medium"
                    : "border-input bg-background hover:bg-secondary/50",
                )}
              >
                <GraduationCap className="h-4 w-4" />
                Estudante
              </button>
              <button
                type="button"
                onClick={() => setFormRole("professor")}
                disabled={submitting}
                className={cn(
                  "rounded-lg border p-3 text-sm flex flex-col items-center gap-1 transition-colors",
                  formRole === "professor"
                    ? "border-accent bg-accent/15 text-accent font-medium"
                    : "border-input bg-background hover:bg-secondary/50",
                )}
              >
                <Briefcase className="h-4 w-4" />
                Professor
              </button>
              <button
                type="button"
                onClick={() => setFormRole("leadership")}
                disabled={submitting || !emailIsLeadership}
                title={
                  emailIsLeadership
                    ? undefined
                    : `Requer email ${LEADERSHIP_EMAIL_DOMAIN}`
                }
                className={cn(
                  "rounded-lg border p-3 text-sm flex flex-col items-center gap-1 transition-colors",
                  formRole === "leadership"
                    ? "border-accent bg-accent/15 text-accent font-medium"
                    : "border-input bg-background hover:bg-secondary/50",
                  !emailIsLeadership && "opacity-50 cursor-not-allowed",
                )}
              >
                <Compass className="h-4 w-4" />
                Liderança
              </button>
            </div>
            {!emailIsLeadership && (
              <p className="text-xs text-muted-foreground">
                Liderança requer login com email <code>{LEADERSHIP_EMAIL_DOMAIN}</code>.
              </p>
            )}
          </div>

          {formRole === "student" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="grade">Sua série</Label>
              <select
                id="grade"
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                disabled={submitting}
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

          {formRole === "professor" && (
            <TeachingPicker
              assignments={teachingAssignments}
              onChange={setTeachingAssignments}
              disabled={submitting}
            />
          )}

          {formRole === "leadership" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="leadership_title">Seu cargo de liderança</Label>
              <Input
                id="leadership_title"
                placeholder="Ex: Diretora, Coordenadora pedagógica, Mentora do 11º"
                value={leadershipTitle}
                onChange={(e) => setLeadershipTitle(e.target.value)}
                disabled={submitting}
                required
                maxLength={80}
              />
              <p className="text-xs text-muted-foreground">
                Texto livre — descreva sua função na escola.
              </p>
            </div>
          )}

          {formError && (
            <p className="text-sm text-destructive" role="alert">
              {formError}
            </p>
          )}

          <Button type="submit" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {submitting ? "Salvando..." : "Continuar para o app"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
