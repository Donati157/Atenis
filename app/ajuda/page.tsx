import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  ArrowLeft,
  HelpCircle,
  GraduationCap,
  BookOpen,
  Sparkles,
  User,
} from "lucide-react"

interface FaqItem {
  q: string
  a: React.ReactNode
}

interface FaqSection {
  id: string
  title: string
  icon: React.ComponentType<{ className?: string }>
  items: FaqItem[]
}

const SECTIONS: FaqSection[] = [
  {
    id: "sobre",
    title: "Sobre o Atenis",
    icon: Sparkles,
    items: [
      {
        q: "O que é o Atenis?",
        a: (
          <p>
            O <strong>Atenis</strong> é um tutor de <strong>provas</strong> com
            inteligência artificial. Você diz qual prova vai fazer (ENEM,
            vestibular, AP, ou a prova da sua escola) e ele te leva da sala de
            aula até o &ldquo;estou pronto&rdquo; — explicando o conteúdo,
            fazendo perguntas, corrigindo seus erros e acompanhando seu
            progresso em porcentagem até o dia da prova.
          </p>
        ),
      },
      {
        q: "Qual a diferença pra um ChatGPT comum?",
        a: (
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong>Não te dá a resposta pronta</strong> — faz perguntas,
              espera você tentar, e mostra exatamente onde travou. O ChatGPT
              entrega a resposta; o Atenis te ensina a chegar lá.
            </li>
            <li>
              <strong>Diagnóstica ativa</strong> — em vez de perguntar &ldquo;o
              que você já sabe?&rdquo;, ele te pede pra demonstrar com uma
              tarefa concreta. A sua tentativa revela o nível real.
            </li>
            <li>
              <strong>Calibrado pro currículo brasileiro</strong> — segue a
              BNCC, o currículo da Concept SP, formato ENEM, vestibular, AP e
              GCD. Não é IA genérica.
            </li>
            <li>
              <strong>Acompanha você ao longo do tempo</strong> — lembra do
              que você errou, sugere revisão na hora certa (spaced repetition),
              e mostra seu progresso em porcentagem até a prova.
            </li>
          </ul>
        ),
      },
      {
        q: "Como funciona uma conversa típica?",
        a: (
          <ol className="list-decimal pl-5 space-y-1.5">
            <li>
              Você fala qual é a prova e quando ela é (ex: &ldquo;tenho prova
              de função quadrática quinta&rdquo;).
            </li>
            <li>
              O Atenis te pede pra demonstrar o que já sabe (uma tentativa
              curta, não uma auto-avaliação vaga).
            </li>
            <li>
              A partir daí ele explica o que falta, te dá exercícios
              progressivos, corrige seus erros e te mostra padrões que você
              precisa consertar.
            </li>
            <li>
              No fim de cada interação, você vê uma{" "}
              <strong>📊 porcentagem de prontidão</strong> — sobe quando
              consolida algo, desce quando erra conceito. É o termômetro de
              quão pronto você está pra prova.
            </li>
            <li>
              Quando atingir prontidão, ele te entrega uma &ldquo;cola&rdquo;
              final pra revisar 5 min antes da prova.
            </li>
          </ol>
        ),
      },
      {
        q: "O que é a Sessão Guiada?",
        a: (
          <>
            <p className="mb-2">
              É um modo novo no dashboard (link <strong>Sessão guiada</strong> na
              barra lateral) onde o Atenis conduz o estudo em quatro momentos:
            </p>
            <ol className="list-decimal pl-5 space-y-1.5">
              <li>
                <strong>Descobrir</strong> onde você está — o Atenis te dá uma
                tarefa curta em vez de perguntar &ldquo;o que você já sabe?&rdquo;.
              </li>
              <li>
                <strong>Explicar</strong> o que faltar — só o suficiente pra você
                tentar de novo, sem despejar teoria toda de uma vez.
              </li>
              <li>
                <strong>Praticar</strong> — você resolve, ele comenta o seu
                raciocínio.
              </li>
              <li>
                <strong>Verificar</strong> — uma questão final pra checar se
                consolidou de verdade.
              </li>
            </ol>
            <p className="mt-2">
              Hoje a Sessão Guiada cobre <strong>função quadrática</strong>. Vamos
              adicionar mais tópicos.
            </p>
          </>
        ),
      },
      {
        q: "Como faço uma boa pergunta pro Atenis?",
        a: (
          <>
            <p className="mb-2">
              Escreve do jeito que você falaria com um amigo que sabe. Não
              precisa ser formal. Alguns exemplos que funcionam bem:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>&ldquo;Não entendi equação do segundo grau. Explica do começo.&rdquo;</li>
              <li>&ldquo;Já vi Bhaskara mas travo na hora de calcular Δ.&rdquo;</li>
              <li>&ldquo;Me faz perguntas pra descobrir onde eu tô errando.&rdquo;</li>
              <li>&ldquo;Explica de outro jeito, esse não tá fazendo sentido.&rdquo;</li>
              <li>&ldquo;Quero praticar antes da prova.&rdquo;</li>
              <li>&ldquo;Quero revisar rápido o que já vimos.&rdquo;</li>
            </ul>
            <p className="mt-2">
              Se o Atenis pediu uma tarefa concreta e você não sabe começar,
              é só dizer isso — ele adapta. O importante é você tentar em vez
              de dizer &ldquo;não sei nada&rdquo;.
            </p>
          </>
        ),
      },
      {
        q: "E se eu errar?",
        a: (
          <p>
            Errar é parte do diagnóstico. O Atenis usa o seu erro pra entender
            onde você travou e escolher a próxima explicação. Não perde ponto,
            não tem &ldquo;X vermelho&rdquo; — só continua a conversa focando no
            que faz sentido pra você agora.
          </p>
        ),
      },
      {
        q: "O que é a BNCC?",
        a: (
          <p>
            <strong>BNCC</strong> = <strong>Base Nacional Comum Curricular</strong>.
            Documento oficial do MEC que define o que todo aluno do Brasil deve
            aprender em cada série, do infantil ao 12º ano. O Atenis usa a BNCC
            como referência principal pra calibrar o conteúdo no nível certo da
            série do aluno.
          </p>
        ),
      },
      {
        q: "É grátis?",
        a: (
          <p>
            Sim, durante a fase atual de testes com a Concept SP. Quando entrar
            em produção pra outras escolas, vai ter um plano por aluno — mas
            nada está sendo cobrado agora.
          </p>
        ),
      },
    ],
  },
  {
    id: "provas",
    title: "Provas e exames",
    icon: GraduationCap,
    items: [
      {
        q: "Quais provas o Atenis cobre?",
        a: (
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong>Prova da sua escola</strong> — cola o enunciado ou conta
              o conteúdo, o Atenis prepara você no estilo da prova.
            </li>
            <li>
              <strong>ENEM</strong> — questões interdisciplinares, redação,
              estilo da prova oficial.
            </li>
            <li>
              <strong>Vestibulares</strong> — Fuvest (USP), Unicamp, UERJ, etc.
              Estilo dissertativo + objetivas.
            </li>
            <li>
              <strong>AP College Board</strong> — preparação no formato
              oficial (MCQ + FRQ), com rubrica do College Board.
            </li>
            <li>
              <strong>GCD</strong> — correção de ensaios reflexivos pela
              rubrica oficial.
            </li>
          </ul>
        ),
      },
      {
        q: "O que é AP (College Board)?",
        a: (
          <>
            <p>
              <strong>AP</strong> = <strong>Advanced Placement</strong>. É um
              programa do College Board (mesma instituição do SAT) que oferece
              cursos e provas de <strong>nível universitário</strong> ainda no
              ensino médio. Os alunos fazem provas em maio e, dependendo da
              nota (1-5), conseguem créditos universitários nos EUA e em
              várias universidades do mundo.
            </p>
            <p className="mt-2">
              Existem <strong>36 disciplinas AP</strong> divididas em 6
              categorias: Matemática &amp; Computação, Ciências, História &amp;
              Sociais, Inglês, Línguas Estrangeiras e Artes. As mais comuns no
              Brasil são AP Calculus, AP Physics, AP English Language, AP
              World History e AP US History.
            </p>
          </>
        ),
      },
      {
        q: "O que é ENEM?",
        a: (
          <p>
            <strong>ENEM</strong> = <strong>Exame Nacional do Ensino Médio</strong>.
            Prova oficial brasileira aplicada anualmente. Tem 180 questões de
            múltipla escolha (Linguagens, Ciências Humanas, Ciências da Natureza
            e Matemática) + uma redação dissertativo-argumentativa. É o
            principal critério de entrada nas universidades públicas (via
            SISU) e tem peso em vestibulares e bolsas (PROUNI, FIES).
          </p>
        ),
      },
      {
        q: "O que é vestibular?",
        a: (
          <p>
            Prova de seleção da própria universidade. Cada uma tem seu formato
            (Fuvest USP, Vestibular Unicamp, UERJ, etc.), com 1ª fase objetiva
            e 2ª fase discursiva. Diferente do ENEM, é específico da
            universidade que aplica.
          </p>
        ),
      },
      {
        q: "O que é GCD?",
        a: (
          <>
            <p>
              <strong>GCD</strong> = <strong>Global Citizen Diploma</strong>{" "}
              (Diploma de Cidadão Global). É um programa internacional de
              credencial criado em 2011 na Yokohama International School
              (Japão) e adotado por um consórcio de escolas internacionais —
              incluindo a <strong>Escola Concept São Paulo</strong>. O foco é
              reconhecer formalmente o desenvolvimento do aluno como cidadão
              global, além do currículo acadêmico tradicional.
            </p>
            <p className="mt-2">
              <strong>Como funciona:</strong> ao longo do ensino médio, o
              aluno escreve <strong>redações reflexivas</strong> sobre
              experiências próprias em até <strong>16 elementos</strong>{" "}
              (Academics, Advanced Academics, Academic Skills, Intercultural
              Communication, Multilingualism, Global Understanding, Community
              Engagement, Leadership, Work Experience, Public Communication,
              Personal Goal, Personal Accomplishment, Wellness, Wilderness
              Engagement, Artistic Expression e Paraprofessional
              Accomplishment). Cada redação é avaliada e validada.
            </p>
            <p className="mt-2">
              <strong>Níveis de credencial:</strong>
            </p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>
                <strong>Certificate</strong>: Core Values + pelo menos 1
                elemento.
              </li>
              <li>
                <strong>Full Diploma</strong>: Core Values + 9 elementos,
                sendo 3 deles em &ldquo;Areas of Expertise&rdquo;. Reconhece
                desempenho acima do esperado pro ensino médio.
              </li>
            </ul>
            <p className="mt-2">
              <strong>O que o Atenis faz:</strong> o corretor GCD do Atenis
              avalia cada uma dessas redações reflexivas usando os 5 critérios
              da rubrica (Reflection &amp; Insight, Structure &amp;
              Organization, Evidence &amp; Examples, Voice &amp; Tone,
              Mechanics &amp; Style) com nota 0–10 e níveis (developing →
              approaches → meets → exemplifies). É ferramenta de
              pré-correção: o aluno melhora antes de submeter oficialmente
              pra escola.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Fonte:{" "}
              <a
                href="https://globalcitizendiploma.org"
                target="_blank"
                rel="noreferrer"
                className="text-accent underline-offset-2 hover:underline"
              >
                globalcitizendiploma.org
              </a>
              .
            </p>
          </>
        ),
      },
      {
        q: "O que são FRQ, DBQ, LEQ, SAQ?",
        a: (
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong>FRQ</strong> (Free Response Question): questão
              dissertativa das provas AP de ciências, matemática e inglês.
            </li>
            <li>
              <strong>DBQ</strong> (Document-Based Question): redação de
              história AP que usa documentos históricos como base.
            </li>
            <li>
              <strong>LEQ</strong> (Long Essay Question): redação histórica AP
              sobre um tema, sem documentos fornecidos.
            </li>
            <li>
              <strong>SAQ</strong> (Short Answer Question): resposta curta
              (3-4 frases) das provas de história AP.
            </li>
          </ul>
        ),
      },
    ],
  },
  {
    id: "como-usar",
    title: "Como usar",
    icon: BookOpen,
    items: [
      {
        q: "Como começar a estudar pra uma prova?",
        a: (
          <>
            <p>
              No chat, conte qual prova você tem e quando (ex:{" "}
              <em>&ldquo;tenho prova de função quadrática quinta&rdquo;</em>{" "}
              ou <em>&ldquo;ENEM em novembro, quero estar pronto&rdquo;</em>).
              Quanto mais específico, melhor o Atenis calibra.
            </p>
            <p className="mt-2">
              A partir daí ele faz uma <strong>diagnóstica ativa</strong> —
              te pede pra resolver um exercício curto ou explicar com suas
              palavras um conceito-chave. A tentativa revela o que você já
              sabe e o que falta consolidar.
            </p>
          </>
        ),
      },
      {
        q: "E se eu não tiver prova específica?",
        a: (
          <p>
            Tudo bem — diga qual conteúdo quer dominar ou qual objetivo tem
            (ex: <em>&ldquo;quero entender Bhaskara&rdquo;</em>). O Atenis vai
            te perguntar se tem uma prova futura pra calibrar a profundidade,
            e te ensinar de qualquer forma.
          </p>
        ),
      },
      {
        q: "O que a IA sabe fazer?",
        a: (
          <>
            <p>
              Tudo o que um tutor humano faz pra te preparar pra uma prova:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 mt-3">
              <li>
                <strong>📚 Explicar</strong> conceitos com analogia e exemplo
                concreto. Sem manual técnico.
              </li>
              <li>
                <strong>🧠 Revisar</strong> matéria com resumo enxuto +
                mini-quiz + pegadinhas comuns.
              </li>
              <li>
                <strong>📝 Exercícios</strong> guiados, uma questão por vez,
                com correção passo a passo. Espera você tentar antes de dar a
                resposta.
              </li>
              <li>
                <strong>🎯 Simulado</strong> completo no estilo da prova
                escolhida (ENEM, Fuvest, AP), com correção no final.
              </li>
              <li>
                <strong>🧑‍🏫 Tutor de Prova</strong> — a jornada completa: do{" "}
                <em>&ldquo;perdi aulas&rdquo;</em> até{" "}
                <em>&ldquo;estou pronto&rdquo;</em>. Diagnóstica, conceitos,
                exercícios progressivos, análise de erro, reflexão escrita,
                teste final e cola pra revisar antes da prova.
              </li>
            </ul>
            <p className="mt-3">
              A IA escolhe sozinha qual usar baseado no que você pede — só
              fala no chat e ela decide.
            </p>
          </>
        ),
      },
      {
        q: "O que é a Trilha de estudos?",
        a: (
          <p>
            Um <strong>plano dia-a-dia personalizado</strong>. Você diz seu
            objetivo (ex: &ldquo;ENEM 2026&rdquo;, &ldquo;AP Calc em
            maio&rdquo;) e a IA monta os tópicos, a ordem e os exercícios,
            distribuídos pelos dias até a prova. Acessa em{" "}
            <strong>Meu tutor → Trilha de estudos</strong>.
          </p>
        ),
      },
      {
        q: "O que aparece em Insights?",
        a: (
          <p>
            Sua <strong>memória acadêmica</strong>: tópicos que você já
            dominou, conceitos que ainda estão frágeis, o que está na hora de
            revisar (segundo o sistema de repetição espaçada), e quantas
            vezes você já errou em cada tópico. É o termômetro do quão pronto
            você está pras suas provas.
          </p>
        ),
      },
      {
        q: "Posso enviar foto ou arquivo?",
        a: (
          <p>
            Sim, e pode mandar <strong>vários de uma vez</strong>. No campo
            de digitação tem 3 botões: <strong>Anexar</strong> (qualquer
            arquivo/imagem), <strong>Câmera</strong> (tirar foto na hora) e{" "}
            <strong>Escanear</strong> (foto enquadrada como documento). A IA
            lê o conteúdo de cada anexo e responde sobre eles. Ótimo pra
            colar a lista de exercícios ou a prova respondida pra correção.
          </p>
        ),
      },
    ],
  },
  {
    id: "conta",
    title: "Conta e login",
    icon: User,
    items: [
      {
        q: "Quais tipos de conta existem?",
        a: (
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong>Estudante</strong>: conta padrão. Faz signup informando
              a série (6º ao 12º ano).
            </li>
            <li>
              <strong>Professor</strong>: pode ver alunos, histórico,
              progresso e editar dados. No signup informa quais séries
              leciona e, se ensina ensino médio, quais matérias de Natural
              Science (Física/Química/Biologia).
            </li>
            <li>
              <strong>Admin</strong>: acesso total, usado pela equipe Atenis
              e pela coordenação da escola parceira. Não dá pra criar pelo
              signup — é promovido manualmente.
            </li>
          </ul>
        ),
      },
      {
        q: "Esqueci minha senha. E agora?",
        a: (
          <p>
            Na tela de login, clica em{" "}
            <strong>&ldquo;Esqueci minha senha&rdquo;</strong>. Você digita
            seu e-mail, recebe um link e cria uma senha nova. O link vale por
            uma hora.
          </p>
        ),
      },
      {
        q: "Quem vê os meus dados de estudo?",
        a: (
          <p>
            Só você e os professores/admin da escola. Outros alunos não veem
            nada. Os dados ficam num banco com regras de acesso (RLS) que
            impedem leitura cruzada entre alunos.
          </p>
        ),
      },
    ],
  },
]

export default async function HelpPage() {
  // Detecta sessão pra que o botão "Voltar" mande pro lugar certo —
  // antes apontava sempre pra "/" (landing pública) e parecia que o
  // aluno tinha sido deslogado.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const isLoggedIn = !!user
  const backHref = isLoggedIn ? "/dashboard" : "/"
  const backLabel = isLoggedIn ? "Voltar ao chat" : "Início"

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href={backHref}>
                <ArrowLeft className="h-4 w-4" />
                {backLabel}
              </Link>
            </Button>
            <Link
              href={backHref}
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
            <HelpCircle className="h-3.5 w-3.5 text-accent" />
            <span>Ajuda</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-10">
        <div className="max-w-3xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold font-display">
              Perguntas frequentes
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Tudo o que você precisa saber pra usar o Atenis e dominar sua
              próxima prova.
            </p>
          </div>

          {SECTIONS.map((section) => {
            const Icon = section.icon
            return (
              <section key={section.id} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-accent" />
                  <h2 className="text-xl font-semibold font-display">
                    {section.title}
                  </h2>
                </div>
                <Accordion type="single" collapsible className="w-full">
                  {section.items.map((item, idx) => (
                    <AccordionItem key={idx} value={`${section.id}-${idx}`}>
                      <AccordionTrigger className="text-left text-base">
                        {item.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-foreground/90 leading-relaxed">
                        {item.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </section>
            )
          })}

          <div className="rounded-lg border border-accent/30 bg-accent/5 p-4 text-center">
            <p className="text-sm text-foreground/90">
              Não achou sua resposta?{" "}
              <Link
                href={backHref}
                className="text-accent font-medium hover:underline"
              >
                {isLoggedIn
                  ? "Volta pro chat e pergunta direto"
                  : "Cria uma conta e pergunta direto"}
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
