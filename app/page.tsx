import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BookOpen,
  Brain,
  MessageSquare,
  GraduationCap,
  Zap,
  Sparkles,
  ArrowRight,
} from "lucide-react"

const features = [
  {
    icon: MessageSquare,
    title: "Tire Dúvidas Instantaneamente",
    description:
      "Pergunte qualquer coisa sobre qualquer matéria e receba respostas claras e didáticas.",
  },
  {
    icon: Brain,
    title: "Explicações Passo a Passo",
    description: "Entenda conceitos complexos com explicações adaptadas ao seu nível.",
  },
  {
    icon: BookOpen,
    title: "Todas as Matérias",
    description: "Português, Inglês, Matemática, Natural Science e Social Science.",
  },
  {
    icon: GraduationCap,
    title: "Preparação para Provas",
    description: "ENEM, vestibulares e AP College Board com exercícios práticos.",
  },
  {
    icon: Zap,
    title: "Respostas Instantâneas",
    description: "Não espere — receba ajuda imediata sempre que precisar.",
  },
  {
    icon: Sparkles,
    title: "IA Avançada",
    description: "Tecnologia de ponta para uma experiência de aprendizado única.",
  },
]

const collaborators = [
  {
    name: "Escola Concept São Paulo",
    role: "Parceiro Educacional",
    description: "Parceria para fornecer conteúdo educacional de qualidade.",
  },
  {
    name: "Davi Donati",
    role: "CTO e Fundador",
    description: "Responsável pela arquitetura e tecnologia do projeto.",
  },
  {
    name: "Jose Leonardo Abarca",
    role: "Diretor de Marketing e Business",
    description: "Responsável por crescimento e estratégia de negócios.",
  },
  {
    name: "Walter Neto",
    role: "Diretor da Equipe de Support",
    description: "Responsável pelo suporte e satisfação dos estudantes.",
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo.jpeg"
              alt="Atenis"
              width={40}
              height={40}
              className="rounded-full shadow-lg ring-1 ring-border/50"
            />
            <span className="text-lg font-semibold font-display">Atenis</span>
          </Link>
          <div className="hidden sm:flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/ajuda">Ajuda</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/auth/login">Entrar</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/auth/sign-up">Criar conta</Link>
            </Button>
          </div>
          <Button size="sm" asChild className="sm:hidden">
            <Link href="/auth/login">Entrar</Link>
          </Button>
        </div>
      </header>

      <section className="pt-32 pb-20 md:pt-40 md:pb-28">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/50 px-3 py-1 text-xs text-muted-foreground mb-6">
              <Sparkles className="h-3 w-3 text-accent" />
              Assistente educacional com IA
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 text-balance leading-tight font-display">
              Seu assistente de estudos com{" "}
              <span className="bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
                Inteligência Artificial
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 text-pretty leading-relaxed max-w-2xl mx-auto">
              Tire dúvidas, aprenda novas matérias e prepare-se para ENEM, vestibulares e provas do
              AP College Board.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" className="text-base px-8" asChild>
                <Link href="/auth/sign-up">
                  Criar conta grátis
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-base px-8" asChild>
                <Link href="/auth/login">Já tenho conta</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 border-t border-border/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-balance font-display">
              Como a IA pode te ajudar
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Funcionalidades projetadas para estudantes do 6º ao 12º ano.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {features.map(({ icon: Icon, title, description }) => (
              <Card key={title} className="bg-card/50 border-border/50 backdrop-blur">
                <CardHeader>
                  <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-xl">{title}</CardTitle>
                  <CardDescription className="text-base">{description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 border-t border-border/50">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-3 text-balance font-display">
              Nossos Colaboradores
            </h2>
            <p className="text-muted-foreground mb-12 max-w-2xl mx-auto">
              Um time dedicado a transformar a forma como estudantes aprendem.
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
              {collaborators.map((c) => (
                <Card key={c.name} className="bg-card/50 border-border/50 backdrop-blur text-left">
                  <CardHeader>
                    <CardTitle className="text-lg">{c.name}</CardTitle>
                    <CardDescription className="text-accent">{c.role}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm">{c.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 border-t border-border/50">
        <div className="container mx-auto px-4">
          <Card className="max-w-3xl mx-auto bg-gradient-to-br from-card/80 to-card/40 border-border/60 text-center">
            <CardHeader>
              <CardTitle className="text-3xl md:text-4xl font-bold text-balance font-display">
                Pronto para começar a estudar?
              </CardTitle>
              <CardDescription className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto mt-2">
                Junte-se a estudantes que já estão usando IA para aprender melhor.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Button size="lg" asChild>
                <Link href="/auth/sign-up">
                  Criar conta grátis
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/auth/login">Fazer login</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <footer className="border-t border-border/50 py-12">
        <div className="container mx-auto px-4 flex flex-col items-center gap-4">
          <Image
            src="/logo.jpeg"
            alt="Atenis"
            width={56}
            height={56}
            className="rounded-full opacity-80 ring-1 ring-border/50"
          />
          <p className="text-sm text-muted-foreground text-center">
            © {new Date().getFullYear()} Atenis. Criado por Davi Donati, Jose Leonardo
            Abarca e Walter Neto.
          </p>
        </div>
      </footer>
    </div>
  )
}
