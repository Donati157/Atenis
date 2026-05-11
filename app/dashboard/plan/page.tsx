import Link from "next/link"
import Image from "next/image"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { PlanView, type StudyPlanRow } from "@/components/plan/plan-view"
import { ArrowLeft, Calendar } from "lucide-react"

export default async function StudyPlanPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: plans, error } = await supabase
    .from("study_plans")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  const list: StudyPlanRow[] = (plans as StudyPlanRow[] | null) ?? []

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4" />
                Dashboard
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
            <Calendar className="h-3.5 w-3.5 text-accent" />
            <span>Meu plano de estudos</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="max-w-4xl mx-auto space-y-5 sm:space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-display">Trilha de estudos</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Plano gerado pela IA com base no seu objetivo. Avance dia a dia.
            </p>
          </div>
          {error ? (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-sm text-destructive">
              Erro ao carregar planos: {error.message}. Rode a migration{" "}
              <code className="font-mono">010_learning_and_plans.sql</code>.
            </div>
          ) : (
            <PlanView plans={list} />
          )}
        </div>
      </div>
    </div>
  )
}
