import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ArrowRight,
  Sparkles,
  Target,
  FlaskConical,
  Search,
  TrendingUp,
} from "lucide-react"

// As 4 razões pelas quais o Atenis funciona — destaque do método, não
// uma lista genérica de features.
const whyItWorks = [
  {
    icon: Target,
    title: "Te guia passo a passo",
    description:
      "Não despeja a resposta pronta. Faz perguntas, espera você tentar, e mostra onde travou.",
  },
  {
    icon: FlaskConical,
    title: "Te testa até entender de verdade",
    description:
      "Cada conceito vira pergunta de verificação. Se você só decorou, ele percebe — e volta no ponto certo.",
  },
  {
    icon: Search,
    title: "Identifica seus erros e corrige",
    description:
      "Quando você erra, ele aponta exatamente o que falhou no raciocínio — não só dá a resposta certa.",
  },
  {
    icon: TrendingUp,
    title: "Acompanha seu progresso",
    description:
      "Mostra em % quanto você já dominou, sobe quando consolida, desce quando erra. Você sabe quando está pronto.",
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

// Mockup de conversa real do método em ação. Renderizado como bolhas
// estáticas — não é um chat funcional, é um exemplo visual pra mostrar
// como a IA ensina (e não só responde).
const demoConversation: Array<
  | { role: "user"; text: string }
  | { role: "assistant"; text: string; rating?: string }
> = [
  {
    role: "user",
    text: "perdi as aulas de binário, tenho prova quinta",
  },
  {
    role: "assistant",
    text: "Antes de começar: qual o conteúdo exato? Conversão decimal↔binário, operações ou algo mais? Enquanto isso, deixa eu te dar a intuição em uma frase: o binário é igual ao decimal, só que cada posição vale uma potência de 2 (1, 2, 4, 8, 16...) em vez de 10. Pergunta 1: tenta converter o número 5 pra binário do jeito que achar — quero ver onde você está.",
  },
  {
    role: "user",
    text: "101 (4+1)",
  },
  {
    role: "assistant",
    text: "🎯 Correto. E você até intuiu o método inverso (4+1) sozinho. Agora um pouco mais difícil: converte 18 pra binário e me manda as divisões, não só o resultado final.",
    rating: "📊 Avaliação atual: ~25%",
  },
  {
    role: "user",
    text: "10010",
  },
  {
    role: "assistant",
    text: "Certo, mas você fez de cabeça de novo. Na prova, conta silenciosa custa ponto. Quero ver as divisões escritas no próximo. Vamos pra um número grande: converte 100.",
    rating: "📊 Avaliação atual: ~40%",
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

      {/* HERO — posicionamento novo: ensino, não resposta. */}
      <section className="pt-32 pb-20 md:pt-40 md:pb-28">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/50 px-3 py-1 text-xs text-muted-foreground mb-6">
              <Sparkles className="h-3 w-3 text-accent" />
              Não é IA que responde — é IA que ensina
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 text-balance leading-tight font-display">
              A IA que te faz{" "}
              <span className="bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
                aprender de verdade
              </span>
              .
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 text-pretty leading-relaxed max-w-2xl mx-auto">
              Não só responde — <strong className="text-foreground/90">ensina, testa, corrige</strong> e acompanha
              seu progresso até você dominar a matéria.
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

      {/* Por que funciona — 4 pilares do método */}
      <section className="py-20 border-t border-border/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-balance font-display">
              Por que o Atenis funciona?
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto text-pretty">
              ChatGPT te dá a resposta. O Atenis te faz aprender. A diferença está em quatro coisas:
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-5 max-w-4xl mx-auto">
            {whyItWorks.map(({ icon: Icon, title, description }) => (
              <Card key={title} className="bg-card/50 border-border/50 backdrop-blur">
                <CardHeader>
                  <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-xl">{title}</CardTitle>
                  <CardDescription className="text-base text-pretty">{description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Demo do método em ação — mockup de conversa */}
      <section className="py-20 border-t border-border/50 bg-card/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-balance font-display">
              Veja o método em ação
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto text-pretty">
              Conversa real: aluno do 10º ano preparando prova de binário. Repare em como o Atenis
              não despeja a aula — ele <strong className="text-foreground/90">guia, exige
              trabalho mostrado, e marca seu progresso em %</strong>.
            </p>
          </div>

          <div className="max-w-2xl mx-auto space-y-3">
            {demoConversation.map((msg, i) => (
              <div
                key={i}
                className={
                  msg.role === "user"
                    ? "flex justify-end"
                    : "flex justify-start"
                }
              >
                <div
                  className={
                    msg.role === "user"
                      ? "max-w-[85%] rounded-2xl rounded-br-sm bg-accent text-accent-foreground px-4 py-3 text-sm shadow-sm"
                      : "max-w-[85%] rounded-2xl rounded-bl-sm bg-card border border-border/60 px-4 py-3 text-sm shadow-sm space-y-2"
                  }
                >
                  <p className="leading-relaxed text-pretty">{msg.text}</p>
                  {msg.role === "assistant" && msg.rating && (
                    <p className="text-xs font-medium text-accent border-t border-border/40 pt-2">
                      {msg.rating}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-muted-foreground mt-8 max-w-md mx-auto">
            Mockup baseado em conversa real. A porcentagem é o termômetro do quanto o aluno já
            está pronto pra prova — sobe quando consolida, desce quando erra conceito.
          </p>
        </div>
      </section>

      {/* O que cobre — versão enxuta */}
      <section className="py-20 border-t border-border/50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-balance font-display">
              Cobre todo o ensino fundamental II e médio
            </h2>
            <p className="text-muted-foreground text-lg mb-10 max-w-2xl mx-auto text-pretty">
              Português, Inglês, Matemática, Ciências da Natureza, Ciências Humanas. Preparação
              pra <strong className="text-foreground/90">ENEM, vestibulares e AP College Board</strong>. Correção
              de redação ENEM, AP e ensaio GCD por rubricas oficiais.
            </p>
            <div className="flex flex-wrap justify-center gap-2 text-xs">
              {[
                "Português",
                "Inglês",
                "Matemática",
                "Física",
                "Química",
                "Biologia",
                "História",
                "Geografia",
                "ENEM",
                "Fuvest",
                "AP",
                "GCD",
              ].map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-border/60 bg-card/50 px-3 py-1 text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 border-t border-border/50">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-3 text-balance font-display">
              Quem está construindo
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
                Pronto pra aprender de verdade?
              </CardTitle>
              <CardDescription className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto mt-2 text-pretty">
                Cria uma conta em menos de 1 minuto e começa a estudar com uma IA que não te
                deixa só copiar.
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
