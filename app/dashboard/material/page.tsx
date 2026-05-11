import Link from "next/link"
import Image from "next/image"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { TeachingContentManager } from "@/components/teaching/teaching-content-manager"
import { ArrowLeft, BookOpen } from "lucide-react"

export default async function MaterialPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, teaching_grades, teaching_natural_sub")
    .eq("id", user.id)
    .maybeSingle()

  // Só professor (e admin, pra observar) acessam a parte de gerenciar.
  // Estudantes vêem o conteúdo no dashboard normal (futuro).
  if (profile?.role !== "professor" && profile?.role !== "admin") {
    redirect("/dashboard")
  }

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
            <BookOpen className="h-3.5 w-3.5 text-accent" />
            <span>Matéria</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="max-w-4xl mx-auto space-y-5 sm:space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-display">
              Matéria
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Aqui você publica o conteúdo das suas aulas, datas e formatos de
              prova, e roteiros de estudo. Os alunos verão tudo que você publicar.
            </p>
          </div>

          <TeachingContentManager
            defaultTeachingGrades={
              (profile?.teaching_grades as string[] | null) ?? null
            }
            defaultTeachingNaturalSub={
              (profile?.teaching_natural_sub as string[] | null) ?? null
            }
          />
        </div>
      </div>
    </div>
  )
}
