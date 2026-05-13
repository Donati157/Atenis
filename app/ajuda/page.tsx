import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
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
    id: "atenis",
    title: "Sobre o Atenis",
    icon: Sparkles,
    items: [
      {
        q: "O que é o Atenis?",
        a: (
          <p>
            O <strong>Atenis</strong> é um tutor de estudos com inteligência
            artificial pra alunos do <strong>6º ao 12º ano</strong>. Ele responde
            dúvidas, explica conteúdos, monta planos de estudo, corrige redações
            (ENEM, AP, GCD) e simula provas — tudo personalizado pro nível do
            aluno.
          </p>
        ),
      },
      {
        q: "Qual a diferença pra um ChatGPT comum?",
        a: (
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              É <strong>focado em educação básica brasileira</strong>: segue a{" "}
              <strong>BNCC</strong> (Base Nacional Comum Curricular), o currículo
              da escola parceira (<strong>Concept SP</strong>), ENEM, vestibulares e
              AP.
            </li>
            <li>
              Tem <strong>modos de estudo guiados</strong> (Explicar, Revisar,
              Exercícios, Simulado), não só chat livre.
            </li>
            <li>
              <strong>Corretores específicos</strong> com a rubrica oficial de
              cada prova (ex: 5 competências do ENEM, 0-6 da AP Lang).
            </li>
            <li>
              <strong>Acompanha o aluno ao longo do tempo</strong>: o que ele
              acertou, errou, e o que sugere revisar.
            </li>
          </ul>
        ),
      },
      {
        q: "O que é a BNCC?",
        a: (
          <p>
            <strong>BNCC</strong> = <strong>Base Nacional Comum Curricular</strong>.
            Documento oficial do MEC que define o que todo aluno do Brasil deve
            aprender em cada série, do infantil ao 12º ano. Define competências,
            habilidades, objetos de conhecimento e o ritmo dos conteúdos. O Atenis
            usa a BNCC como referência principal pra explicar conteúdos no nível
            certo da série do aluno.
          </p>
        ),
      },
      {
        q: "É grátis?",
        a: (
          <p>
            Sim, durante a fase atual de testes. Quando entrar em produção pra
            escolas, vai ter um plano por aluno — mas nada está sendo cobrado
            agora.
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
        q: "O que é AP (College Board)?",
        a: (
          <>
            <p>
              <strong>AP</strong> = <strong>Advanced Placement</strong>. É um
              programa do College Board (mesma instituição do SAT) que oferece
              cursos e provas de <strong>nível universitário</strong> ainda no
              ensino médio. Os alunos fazem provas em maio e, dependendo da
              nota (1-5), conseguem créditos universitários nos EUA e em várias
              universidades do mundo.
            </p>
            <p className="mt-2">
              Existem <strong>36 disciplinas AP</strong> divididas em 6
              categorias: Matemática & Computação, Ciências, História & Sociais,
              Inglês, Línguas Estrangeiras e Artes. As mais comuns no Brasil
              são AP Calculus, AP Physics, AP English Language, AP World History
              e AP US History.
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
            principal critério de entrada nas universidades públicas (via SISU)
            e tem peso em vestibulares e bolsas (PROUNI, FIES).
          </p>
        ),
      },
      {
        q: "O que é vestibular?",
        a: (
          <p>
            Prova de seleção da própria universidade. Cada uma tem seu formato
            (Fuvest USP, Vestibular Unicamp, UERJ, etc.), com 1ª fase objetiva e
            2ª fase discursiva. Diferente do ENEM, é específico da universidade
            que aplica.
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
              credencial criado em 2011 na Yokohama International School (Japão)
              e adotado por um consórcio de escolas internacionais — incluindo a{" "}
              <strong>Escola Concept São Paulo</strong>. O foco é reconhecer
              formalmente o desenvolvimento do aluno como cidadão global, além
              do currículo acadêmico tradicional.
            </p>
            <p className="mt-2">
              <strong>Como funciona:</strong> ao longo do ensino médio, o aluno
              escreve <strong>redações reflexivas</strong> sobre experiências
              próprias em até <strong>16 elementos</strong> (Academics, Advanced
              Academics, Academic Skills, Intercultural Communication,
              Multilingualism, Global Understanding, Community Engagement,
              Leadership, Work Experience, Public Communication, Personal Goal,
              Personal Accomplishment, Wellness, Wilderness Engagement, Artistic
              Expression e Paraprofessional Accomplishment). Cada redação é
              avaliada e validada.
            </p>
            <p className="mt-2">
              <strong>Níveis de credencial:</strong>
            </p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>
                <strong>Certificate</strong>: Core Values + pelo menos 1 elemento.
              </li>
              <li>
                <strong>Full Diploma</strong>: Core Values + 9 elementos, sendo 3
                deles em "Areas of Expertise". Reconhece desempenho acima do
                esperado pro ensino médio.
              </li>
            </ul>
            <p className="mt-2">
              <strong>O que o Atenis faz:</strong> o corretor GCD do Atenis
              avalia cada uma dessas redações reflexivas usando os 5 critérios
              da rubrica (Reflection & Insight, Structure & Organization,
              Evidence & Examples, Voice & Tone, Mechanics & Style) com nota
              0–10 e níveis (developing → approaches → meets → exemplifies). É
              ferramenta de pré-correção: o aluno melhora antes de submeter
              oficialmente pra escola.
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
              <strong>FRQ</strong> (Free Response Question): questão dissertativa
              das provas AP de ciências, matemática e inglês.
            </li>
            <li>
              <strong>DBQ</strong> (Document-Based Question): redação de história
              AP que usa documentos históricos como base.
            </li>
            <li>
              <strong>LEQ</strong> (Long Essay Question): redação histórica AP
              sobre um tema, sem documentos fornecidos.
            </li>
            <li>
              <strong>SAQ</strong> (Short Answer Question): resposta curta (3-4
              frases) das provas de história AP.
            </li>
          </ul>
        ),
      },
    ],
  },
  {
    id: "como-usar",
    title: "Como usar o Atenis",
    icon: BookOpen,
    items: [
      {
        q: "O que a IA sabe fazer?",
        a: (
          <>
            <p>
              A IA do Atenis tem 5 habilidades de ensino e escolhe sozinha qual
              usar, baseado no que você pede no chat — não precisa selecionar
              "modo" em lugar nenhum.
            </p>
            <ul className="list-disc pl-5 space-y-1.5 mt-3">
              <li>
                <strong>📚 Explicar</strong> — "me explica X", "o que é Y", "como
                funciona Z". Conteúdo do zero com analogia e exemplo prático.
              </li>
              <li>
                <strong>🧠 Revisar</strong> — "me revisa X", "resumo de Y", "pontos
                que mais caem em Z". Resumo + mini-quiz + pegadinhas.
              </li>
              <li>
                <strong>📝 Exercícios</strong> — "me dá uma questão de X", "quero
                treinar Y". Uma questão por vez, com correção passo a passo. A
                IA espera você tentar antes de dar a resposta (técnica socrática).
              </li>
              <li>
                <strong>🎯 Simulado</strong> — "monte um simulado de X", "5
                questões de Y", "simulado ENEM/Fuvest/AP". Bloco completo, sem
                gabarito até você entregar.
              </li>
              <li>
                <strong>🧑‍🏫 Tutor de Prova</strong> — "tenho prova de X", "perdi
                aulas de Y", "me prepara pra tirar 100". Jornada completa: de
                "perdi aulas" até "tiro 100" com avaliação contínua em
                porcentagem a cada turno, análise de erro, reflexão escrita e
                correção da prova no final.
              </li>
            </ul>
            <p className="mt-3">
              Só fala no chat o que precisa. Pode trocar de habilidade no meio
              da conversa (ex: termina explicação → pede questão → vira modo
              Exercícios automaticamente).
            </p>
          </>
        ),
      },
      {
        q: "O que é a Trilha de estudos?",
        a: (
          <p>
            Um <strong>plano dia-a-dia personalizado</strong>. Você diz seu
            objetivo (ex: "ENEM 2026", "AP Calc em maio") e a IA monta os
            tópicos, a ordem e os exercícios, distribuídos pelos dias até a
            prova. Acessa em <strong>Meu tutor → Trilha de estudos</strong>.
          </p>
        ),
      },
      {
        q: "O que aparece em Insights?",
        a: (
          <p>
            Estatísticas do que você estudou: matérias com mais erros, tópicos
            que precisam de revisão, dias ativos na semana. Útil pra saber onde
            focar.
          </p>
        ),
      },
      {
        q: "Posso enviar foto ou arquivo?",
        a: (
          <p>
            Sim. No campo de digitação tem 3 botões: <strong>Anexar</strong>{" "}
            (qualquer arquivo/imagem), <strong>Câmera</strong> (tirar foto na
            hora) e <strong>Escanear</strong> (foto enquadrada como documento).
            A IA lê o texto da imagem e responde sobre ele.
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
              progresso e editar dados. No signup informa quais séries leciona
              e, se ensina ensino médio, quais matérias de Natural Science
              (Física/Química/Biologia).
            </li>
            <li>
              <strong>Admin</strong>: acesso total, usado pela equipe Atenis.
              Não dá pra criar pelo signup — é promovido manualmente.
            </li>
          </ul>
        ),
      },
      {
        q: "Esqueci minha senha. E agora?",
        a: (
          <p>
            Na tela de login, clica em <strong>"Esqueci minha senha"</strong>.
            Você digita seu e-mail, recebe um link e cria uma senha nova. O link
            vale por uma hora.
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

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
                Início
              </Link>
            </Button>
            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-border/50">
              <Image
                src="/logo.jpeg"
                alt="Atenis"
                width={28}
                height={28}
                className="rounded-full ring-1 ring-border/50"
              />
              <span className="font-semibold font-display">Atenis</span>
            </div>
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
            <h1 className="text-3xl sm:text-4xl font-bold font-display">Perguntas frequentes</h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Tudo que você precisa saber pra começar a usar o Atenis — incluindo
              o que significam siglas como AP, ENEM, GCD e os modos de estudo.
            </p>
          </div>

          <nav className="flex flex-wrap gap-2 rounded-lg border border-border/50 bg-card/40 p-3">
            {SECTIONS.map((s) => {
              const Icon = s.icon
              return (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm hover:bg-secondary/50 transition-colors"
                >
                  <Icon className="h-3.5 w-3.5 text-accent" />
                  {s.title}
                </a>
              )
            })}
          </nav>

          {SECTIONS.map((section) => {
            const Icon = section.icon
            return (
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-20 space-y-3"
              >
                <h2 className="text-xl sm:text-2xl font-bold font-display flex items-center gap-2">
                  <Icon className="h-6 w-6 text-accent" />
                  {section.title}
                </h2>
                <Accordion type="multiple" className="rounded-lg border border-border/50 bg-card/40 px-4">
                  {section.items.map((item, i) => (
                    <AccordionItem
                      key={i}
                      value={`${section.id}-${i}`}
                      className="last:border-b-0"
                    >
                      <AccordionTrigger className="text-left text-base">
                        {item.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-foreground/80 leading-relaxed">
                        {item.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </section>
            )
          })}

          <div className="rounded-lg border border-accent/30 bg-accent/5 p-5 text-center space-y-3">
            <p className="text-sm">
              Não achou sua dúvida aqui? Fale com a equipe de suporte do Atenis.
            </p>
            <Button asChild>
              <a href="mailto:walter.neto@conceptstudent.com.br?subject=Suporte%20Atenis">
                walter.neto@conceptstudent.com.br
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
