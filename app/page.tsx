import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ArrowRight,
  Sparkles,
  HandHelping,
  ShieldCheck,
  Repeat,
  TrendingUp,
} from "lucide-react"

// Os 4 pilares do Modo Atenis — em linguagem de aluno, não jargão
// pedagógico. Cada item descreve um benefício palpável.
const modoAtenis = [
  {
    icon: HandHelping,
    title: "Não te dá a resposta pronta",
    description:
      "Faz pergunta, espera você tentar, e mostra exatamente onde travou. Você sai sabendo, não copiando.",
  },
  {
    icon: ShieldCheck,
    title: "Corrige seus erros antes da prova",
    description:
      "Quando você erra, ele aponta a linha exata da conta, explica por que falhou, e te faz tentar de novo.",
  },
  {
    icon: Repeat,
    title: "Muda a estratégia quando você trava",
    description:
      "Se a explicação não colou, ele troca de ângulo: analogia, exemplo, conta inversa. Insiste até clicar.",
  },
  {
    icon: TrendingUp,
    title: "Acompanha seu progresso em tempo real",
    description:
      "A cada turno mostra em % o quanto você já dominou da matéria, e diz exatamente o que falta pra você chegar em 100.",
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

// 1º exemplo: aluno do 10º ano preparando prova de binário.
// Mostra a IA exigindo trabalho mostrado + avaliação humanizada.
const demoBinario: Array<
  | { role: "user"; text: string }
  | { role: "assistant"; text: string; rating?: string; diagnostic?: string }
> = [
  {
    role: "user",
    text: "perdi as aulas de binário, tenho prova quinta",
  },
  {
    role: "assistant",
    text: "Antes de começar: qual conteúdo cai? Conversão decimal↔binário, operações, ou algo mais? Enquanto isso, a intuição em uma frase: binário é igual ao decimal, só que cada posição vale uma potência de 2 (1, 2, 4, 8, 16…) em vez de 10. Pergunta 1: tenta converter o número 5 pra binário do jeito que achar — quero ver onde você está.",
  },
  {
    role: "user",
    text: "101 (4+1)",
  },
  {
    role: "assistant",
    text: "🎯 Correto. E você intuiu o método inverso (4+1) sozinho. Próxima: converte 18 pra binário e me manda as divisões, não só o resultado final.",
    rating: "📊 Avaliação atual: ~25%",
    diagnostic:
      "Você entendeu a lógica do binário. Falta só fixar o passo a passo escrito.",
  },
  {
    role: "user",
    text: "10010",
  },
  {
    role: "assistant",
    text: "Certo, mas você fez de cabeça de novo. Em prova, conta silenciosa custa ponto — sem o passo a passo, se errar a soma você perde tudo. Quero ver as divisões escritas na próxima. Converte 100.",
    rating: "📊 Avaliação atual: ~40%",
    diagnostic:
      "Cálculo tá firme. O risco real pra prova agora é descuido em transcrição.",
  },
]

// 2º exemplo: aluno tentando função quadrática, IA insistindo até ele
// realmente entender. Mostra "muda estratégia quando você trava".
const demoQuadratica: Array<
  | { role: "user"; text: string }
  | { role: "assistant"; text: string; rating?: string; diagnostic?: string }
> = [
  {
    role: "user",
    text: "me ajuda com função quadrática, não tô entendendo nada",
  },
  {
    role: "assistant",
    text: "Vou começar pela intuição. Função quadrática é tipo um arremesso de basquete: a bola sobe, atinge um ponto máximo, e desce. O gráfico é uma parábola. Pergunta 1: numa função y = x² − 4x + 3, sem fazer conta, você consegue dizer se a parábola abre pra cima ou pra baixo? (Dica: olha o sinal do x².)",
  },
  {
    role: "user",
    text: "pra baixo",
  },
  {
    role: "assistant",
    text: "✋ PARA TUDO. Vou provar com matemática que tá errado. Se x² é positivo (1 · x², coeficiente +1), a parábola abre pra cima — tipo um sorriso. Se fosse −x², aí sim abriria pra baixo (cara triste). Repete comigo: coeficiente do x² positivo = cima.",
    rating: "📊 Avaliação atual: ~15%",
    diagnostic:
      "Você ainda tá no zero do conceito de concavidade. Sem isso, nada do resto funciona — vamos consolidar aqui antes de avançar.",
  },
  {
    role: "user",
    text: "ah entendi, abre pra cima então",
  },
  {
    role: "assistant",
    text: "✅ Agora sim. E como a parábola abre pra cima, ela tem um ponto MÍNIMO (o fundo). Próxima: encontra esse mínimo em y = x² − 4x + 3. Fórmula do x do vértice: x = −b/2a. Mostra a conta.",
    rating: "📊 Avaliação atual: ~35%",
    diagnostic:
      "Conceito travado. Próximo desafio: aplicar a fórmula do vértice sem perder os sinais.",
  },
]

// Comparação lado a lado: mesma pergunta, IA comum vs Modo Atenis.
// É o elemento que mostra o diferencial de forma visceral — "qualquer
// um usa GPT; o difícil é o comportamento pedagógico".
const comparison = {
  question: "como resolvo x² − 5x + 6 = 0?",
  vanilla: {
    label: "IA comum",
    text: "É só aplicar Bhaskara: x = (5 ± √(25 − 24)) / 2 = (5 ± 1) / 2. Logo, x = 3 ou x = 2. Pronto!",
    note: "Te dá a resposta. Você copia. Na prova, trava.",
  },
  atenis: {
    label: "Modo Atenis",
    text: "Antes de eu resolver — me diz quanto valem a, b e c nessa equação. (Dica: a é o número que multiplica o x².) Quero ver você montar a fórmula; aí a gente resolve junto.",
    note: "Te faz pensar. Você aprende. Na prova, acerta sozinho.",
  },
}

type Msg = (typeof demoBinario)[number]

function ChatBubbles({
  data,
  title,
  subtitle,
}: {
  data: Msg[]
  title: string
  subtitle: string
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur p-5 md:p-7 shadow-xl">
      <div className="mb-5 border-b border-border/40 pb-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground text-pretty">{subtitle}</p>
      </div>
      <div className="space-y-3">
        {data.map((msg, i) => (
          <div
            key={i}
            className={
              msg.role === "user" ? "flex justify-end" : "flex justify-start"
            }
          >
            <div
              className={
                msg.role === "user"
                  ? "max-w-[88%] rounded-2xl rounded-br-sm bg-accent text-accent-foreground px-4 py-3 text-sm shadow-sm"
                  : "max-w-[88%] rounded-2xl rounded-bl-sm bg-background/80 border border-border/60 px-4 py-3 text-sm shadow-sm space-y-2"
              }
            >
              <p className="leading-relaxed text-pretty">{msg.text}</p>
              {msg.role === "assistant" && msg.rating && (
                <div className="border-t border-border/40 pt-2 space-y-1">
                  <p className="text-xs font-semibold text-accent">{msg.rating}</p>
                  {msg.diagnostic && (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {msg.diagnostic}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Glow ambient — dá sensação de "produto vivo", sutil */}
      <div
        aria-hidden
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[80rem] h-[40rem] bg-gradient-to-b from-accent/10 via-primary/5 to-transparent rounded-full blur-3xl pointer-events-none"
      />

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

      {/* HERO — posicionamento "professor particular que insiste até você aprender" */}
      <section className="relative pt-32 pb-20 md:pt-44 md:pb-32">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-4 py-1.5 text-xs font-medium text-accent mb-6">
              <Sparkles className="h-3.5 w-3.5" />
              Conheça o <span className="font-bold">Modo Atenis</span>
            </div>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 text-balance leading-[1.05] font-display tracking-tight">
              O professor particular com IA que{" "}
              <span className="bg-gradient-to-br from-accent via-accent to-primary bg-clip-text text-transparent">
                realmente ensina
              </span>
              .
            </h1>
            <p className="text-lg md:text-2xl text-muted-foreground mb-12 text-pretty leading-relaxed max-w-3xl mx-auto">
              Não te dá a resposta pronta. <strong className="text-foreground/90">Ensina,
              testa, corrige</strong> e <strong className="text-foreground/90">insiste</strong> até
              você dominar a matéria de verdade.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" className="text-base px-8 h-12" asChild>
                <Link href="/auth/sign-up">
                  Começar grátis
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-base px-8 h-12" asChild>
                <Link href="/auth/login">Já tenho conta</Link>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-6">
              Pra estudantes brasileiros do 6º ao 12º ano · ENEM · Vestibular · AP · GCD
            </p>
          </div>
        </div>
      </section>

      {/* Modo Atenis — conceito-marca */}
      <section className="py-20 md:py-28 border-t border-border/50 relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14 md:mb-20 max-w-3xl mx-auto">
            <p className="text-sm font-medium uppercase tracking-widest text-accent mb-3">
              O que é o Modo Atenis
            </p>
            <h2 className="text-3xl md:text-5xl font-bold mb-5 text-balance font-display tracking-tight">
              Quatro coisas que <span className="text-accent">nenhuma outra IA faz</span> pra você.
            </h2>
            <p className="text-muted-foreground text-lg md:text-xl text-pretty">
              ChatGPT te dá a resposta. O Atenis te faz aprender. A diferença está em quatro
              comportamentos:
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-5 max-w-5xl mx-auto">
            {modoAtenis.map(({ icon: Icon, title, description }) => (
              <Card
                key={title}
                className="group bg-card/40 border-border/60 backdrop-blur transition-all hover:border-accent/40 hover:bg-card/60 hover:shadow-lg hover:shadow-accent/5"
              >
                <CardHeader>
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent ring-1 ring-accent/20 group-hover:bg-accent/15 transition-colors">
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-xl md:text-2xl">{title}</CardTitle>
                  <CardDescription className="text-base text-pretty leading-relaxed">
                    {description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Comparação: IA comum vs Modo Atenis — mesma pergunta */}
      <section className="py-20 md:py-28 border-t border-border/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 md:mb-14 max-w-3xl mx-auto">
            <p className="text-sm font-medium uppercase tracking-widest text-accent mb-3">
              A diferença na prática
            </p>
            <h2 className="text-3xl md:text-5xl font-bold mb-5 text-balance font-display tracking-tight">
              Mesma pergunta. <span className="text-accent">Respostas opostas.</span>
            </h2>
            <p className="text-muted-foreground text-lg md:text-xl text-pretty">
              Um aluno pergunta:{" "}
              <span className="text-foreground/90 font-medium">
                &ldquo;{comparison.question}&rdquo;
              </span>
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5 max-w-5xl mx-auto items-stretch">
            {/* IA comum */}
            <div className="rounded-2xl border border-border/60 bg-card/30 p-6 flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-bold">
                  AI
                </span>
                <span className="text-sm font-medium text-muted-foreground">
                  {comparison.vanilla.label}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-foreground/80 flex-1">
                {comparison.vanilla.text}
              </p>
              <p className="mt-4 pt-4 border-t border-border/40 text-xs text-muted-foreground">
                {comparison.vanilla.note}
              </p>
            </div>

            {/* Modo Atenis */}
            <div className="rounded-2xl border border-accent/40 bg-accent/5 p-6 flex flex-col shadow-lg shadow-accent/5">
              <div className="flex items-center gap-2 mb-4">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent/15 text-accent ring-1 ring-accent/30">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
                <span className="text-sm font-semibold text-accent">
                  {comparison.atenis.label}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-foreground/90 flex-1">
                {comparison.atenis.text}
              </p>
              <p className="mt-4 pt-4 border-t border-accent/20 text-xs text-accent/90 font-medium">
                {comparison.atenis.note}
              </p>
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-8 max-w-xl mx-auto text-pretty">
            Qualquer um tem acesso a uma IA que responde. O difícil — e o que muda sua
            nota — é uma IA que <strong className="text-foreground/90">te faz aprender</strong>.
          </p>
        </div>
      </section>

      {/* Demos do método em ação — DOIS exemplos reais */}
      <section className="py-20 md:py-28 border-t border-border/50 bg-gradient-to-b from-card/30 via-card/10 to-transparent">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14 md:mb-16 max-w-3xl mx-auto">
            <p className="text-sm font-medium uppercase tracking-widest text-accent mb-3">
              Como funciona na prática
            </p>
            <h2 className="text-3xl md:text-5xl font-bold mb-5 text-balance font-display tracking-tight">
              Não acredita? <span className="text-accent">Veja por si só.</span>
            </h2>
            <p className="text-muted-foreground text-lg md:text-xl text-pretty">
              Duas conversas reais do Atenis — repare como ele{" "}
              <strong className="text-foreground/90">exige tentativa, marca % de progresso e diz
              exatamente o que falta</strong>.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 md:gap-8 max-w-6xl mx-auto">
            <ChatBubbles
              data={demoBinario}
              title="Caso 1 — Aluno do 10º, prova de binário quinta"
              subtitle="Perdeu aulas. A IA diagnostica, exige o passo a passo e marca o que ainda falta consolidar."
            />
            <ChatBubbles
              data={demoQuadratica}
              title="Caso 2 — Aluno travado em função quadrática"
              subtitle="Erra o conceito-base. A IA não deixa passar — para, prova com matemática, e só avança quando o conceito firma."
            />
          </div>

          <p className="text-center text-xs text-muted-foreground mt-10 max-w-xl mx-auto">
            A porcentagem é o termômetro do quanto o aluno já está pronto pra prova específica
            dele. Sobe quando consolida, desce quando erra conceito. Junto vem o diagnóstico
            humano do que falta.
          </p>
        </div>
      </section>

      {/* Cobertura — enxuta, com tags coloridas */}
      <section className="py-20 md:py-24 border-t border-border/50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-sm font-medium uppercase tracking-widest text-accent mb-3">
              Cobertura
            </p>
            <h2 className="text-3xl md:text-5xl font-bold mb-5 text-balance font-display tracking-tight">
              Todo o ensino fundamental II e médio.
            </h2>
            <p className="text-muted-foreground text-lg mb-10 max-w-2xl mx-auto text-pretty">
              Português, Inglês, Matemática, Ciências da Natureza e Humanas. Preparação pra{" "}
              <strong className="text-foreground/90">ENEM, vestibulares e AP College Board</strong>.
              Correção de redação ENEM, AP e ensaio GCD por rubricas oficiais.
            </p>
            <div className="flex flex-wrap justify-center gap-2 text-sm">
              {[
                { label: "Português", tone: "accent" },
                { label: "Inglês", tone: "default" },
                { label: "Matemática", tone: "accent" },
                { label: "Física", tone: "default" },
                { label: "Química", tone: "default" },
                { label: "Biologia", tone: "default" },
                { label: "História", tone: "default" },
                { label: "Geografia", tone: "default" },
                { label: "ENEM", tone: "accent" },
                { label: "Fuvest", tone: "accent" },
                { label: "AP", tone: "accent" },
                { label: "GCD", tone: "accent" },
              ].map(({ label, tone }) => (
                <span
                  key={label}
                  className={
                    tone === "accent"
                      ? "rounded-full border border-accent/40 bg-accent/10 px-3.5 py-1.5 text-accent font-medium"
                      : "rounded-full border border-border/60 bg-card/50 px-3.5 py-1.5 text-muted-foreground"
                  }
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 border-t border-border/50">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto text-center">
            <p className="text-sm font-medium uppercase tracking-widest text-accent mb-3">
              Quem construiu
            </p>
            <h2 className="text-3xl md:text-5xl font-bold mb-3 text-balance font-display tracking-tight">
              Um time pequeno, foco grande.
            </h2>
            <p className="text-muted-foreground mb-12 max-w-2xl mx-auto">
              Construindo um sistema de aprendizado com IA, em parceria com escola brasileira.
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
              {collaborators.map((c) => (
                <Card
                  key={c.name}
                  className="bg-card/40 border-border/60 backdrop-blur text-left transition-all hover:border-accent/30"
                >
                  <CardHeader>
                    <CardTitle className="text-lg">{c.name}</CardTitle>
                    <CardDescription className="text-accent font-medium">
                      {c.role}
                    </CardDescription>
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

      {/* CTA final — emocional */}
      <section className="py-20 md:py-28 border-t border-border/50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center bg-gradient-to-br from-accent/10 via-card/40 to-primary/5 border border-accent/20 rounded-3xl p-8 md:p-14 backdrop-blur">
            <h2 className="text-3xl md:text-5xl font-bold mb-5 text-balance font-display tracking-tight">
              Pronto pra <span className="text-accent">aprender de verdade</span>?
            </h2>
            <p className="text-muted-foreground text-lg md:text-xl mb-8 max-w-xl mx-auto text-pretty leading-relaxed">
              Cria a conta em menos de 1 minuto. Sem cartão. Em 5 minutos você descobre se o
              Modo Atenis funciona pra você.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" className="text-base px-8 h-12" asChild>
                <Link href="/auth/sign-up">
                  Começar agora
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-base px-8 h-12" asChild>
                <Link href="/auth/login">Fazer login</Link>
              </Button>
            </div>
          </div>
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
