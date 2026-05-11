import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { TeacherDetailHeader } from "@/components/teachers/teacher-detail-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BookOpen, ClipboardCheck, Lightbulb, FileX } from "lucide-react"
import { SUBJECTS } from "@/lib/subjects"

const GRADE_LABELS: Record<string, string> = {
  "6th_grade": "6º",
  "7th_grade": "7º",
  "8th_grade": "8º",
  "9th_grade": "9º",
  "10th_grade": "10º",
  "11th_grade": "11º",
  "12th_grade": "12º",
}

const SUBJECT_LABELS: Record<string, string> = Object.fromEntries(
  SUBJECTS.map((s) => [s.id, s.label]),
)

const TYPE_INFO: Record<
  string,
  { label: string; icon: typeof BookOpen; color: string }
> = {
  materia: { label: "Matéria", icon: BookOpen, color: "text-accent" },
  prova: { label: "Prova", icon: ClipboardCheck, color: "text-primary" },
  estudar: { label: "O que estudar", icon: Lightbulb, color: "text-yellow-400" },
}

export default async function TeacherContentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()

  if (myProfile?.role !== "admin") {
    redirect("/dashboard")
  }

  const { data: prof } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, teaching_grades")
    .eq("id", id)
    .maybeSingle()

  if (!prof || prof.role !== "professor") {
    redirect("/dashboard/teachers")
  }

  const { data: content, error } = await supabase
    .from("teaching_content")
    .select("*")
    .eq("professor_id", id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[teachers/content] fetch failed:", error.message)
  }
  const items = content ?? []

  return (
    <div className="min-h-screen bg-background">
      <TeacherDetailHeader
        professorId={id}
        fullName={prof.full_name}
        email={prof.email}
        teachingGrades={prof.teaching_grades as string[] | null}
        activeTab="content"
      />
      <div className="container mx-auto px-4 pb-8">
        <div className="max-w-5xl mx-auto space-y-3">
          {items.length === 0 ? (
            <Card>
              <CardContent className="py-12 flex flex-col items-center text-center gap-2 text-muted-foreground">
                <FileX className="h-8 w-8" />
                <p className="text-sm">
                  {prof.full_name?.split(" ")[0] || "Este professor"} ainda não
                  publicou nenhum conteúdo.
                </p>
                <p className="text-xs">
                  Quando ele criar matérias, provas ou roteiros de estudo, eles
                  vão aparecer aqui.
                </p>
              </CardContent>
            </Card>
          ) : (
            items.map((item) => {
              const typeInfo = TYPE_INFO[item.type as string]
              const Icon = typeInfo?.icon ?? BookOpen
              return (
                <Card key={item.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3 flex-wrap">
                      <div
                        className={`h-9 w-9 rounded-lg bg-card flex items-center justify-center shrink-0 border border-border/50 ${typeInfo?.color ?? ""}`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base">{item.title}</CardTitle>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <Badge
                            variant="secondary"
                            className="text-[10px] py-0 px-1.5 h-4"
                          >
                            {typeInfo?.label ?? item.type}
                          </Badge>
                          {item.subject && (
                            <Badge
                              variant="outline"
                              className="text-[10px] py-0 px-1.5 h-4"
                            >
                              {SUBJECT_LABELS[item.subject as string] ?? item.subject}
                            </Badge>
                          )}
                          {(item.grade_levels as string[] | null)?.map((g) => (
                            <Badge
                              key={g}
                              variant="outline"
                              className="text-[10px] py-0 px-1.5 h-4 border-accent/40 text-accent"
                            >
                              {GRADE_LABELS[g] ?? g}
                            </Badge>
                          ))}
                          <span className="text-[10px] text-muted-foreground ml-1">
                            {formatWhen(item.created_at as string)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  {item.content && (
                    <CardContent className="pt-0">
                      <p className="text-sm text-foreground/80 whitespace-pre-wrap">
                        {item.content}
                      </p>
                    </CardContent>
                  )}
                </Card>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  } catch {
    return ""
  }
}
