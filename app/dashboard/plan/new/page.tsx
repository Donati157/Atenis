import Link from "next/link"
import Image from "next/image"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { PlanBuilder } from "@/components/plan/plan-builder"
import { ArrowLeft, Sparkles } from "lucide-react"

const GRADE_LABELS: Record<string, string> = {
  "6th_grade": "6º ano",
  "7th_grade": "7º ano",
  "8th_grade": "8º ano",
  "9th_grade": "9º ano",
  "10th_grade": "10º ano",
  "11th_grade": "11º ano",
  "12th_grade": "12º ano",
}

export default async function NewPlanPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("grade_level, full_name")
    .eq("id", user.id)
    .maybeSingle()

  const gradeFromProfile = profile?.grade_level
    ? GRADE_LABELS[profile.grade_level as string] ?? null
    : null

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/plan">
                <ArrowLeft className="h-4 w-4" />
                Meus planos
              </Link>
            </Button>
            <Link
              href="/dashboard"
              className="hidden sm:flex items-center gap-2 pl-3 border-l border-border/50 hover:opacity-90 transition-opacity"
            >
              <Image
                src="/logo.jpeg"
                alt="Atenis"
                width={28}
                height={28}
                className="rounded-full ring-1 ring-border/50"
              />
              <span className="font-semibold font-display">Atenis</span>
            </Link>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            <span>Novo plano</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="max-w-3xl mx-auto space-y-5 sm:space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-display">Criar plano com IA</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Descreva seu objetivo e a IA monta um plano dia a dia com tópicos e tarefas
              concretas.
            </p>
          </div>
          <PlanBuilder defaultGradeLevel={gradeFromProfile} />
        </div>
      </div>
    </div>
  )
}
