# Atenis

Assistente de estudos com IA para estudantes brasileiros do 6º ao 12º ano.

## Stack

- **Next.js 15** (App Router, React 19)
- **Supabase** (auth + Postgres + RLS)
- **Vercel AI SDK 5** (streaming, AI Gateway)
- **Tailwind CSS 3** + shadcn/ui primitives
- **react-markdown** com GFM

## Setup

1. **Instalar dependências**

   ```bash
   npm install
   ```

2. **Variáveis de ambiente**

   Copie `.env.example` para `.env.local` e preencha:

   ```bash
   cp .env.example .env.local
   ```

   Variáveis:
   - `NEXT_PUBLIC_SUPABASE_URL`: URL do seu projeto Supabase.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: anon key do Supabase (pode ficar no client).
   - `AI_GATEWAY_API_KEY`: chave do Vercel AI Gateway (necessária para `openai/gpt-5`).

3. **Rodar os scripts SQL no Supabase**

   No SQL Editor do Supabase, execute em ordem:
   1. [scripts/001_create_tables.sql](scripts/001_create_tables.sql) — tabelas + RLS.
   2. [scripts/002_profile_trigger.sql](scripts/002_profile_trigger.sql) — cria
      profile automaticamente no signup.

4. **Logo**

   Adicione `public/logo.jpeg` (ver [public/README.md](public/README.md)).

5. **Rodar em dev**

   ```bash
   npm run dev
   ```

## Estrutura

```
app/
  page.tsx                    landing page
  layout.tsx                  root layout (fonts, analytics)
  globals.css                 tokens de tema + prose-chat
  auth/
    login/                    login com e-mail + senha
    sign-up/                  cadastro com nome e série
    sign-up-success/
    error/
  dashboard/                  chat protegido por auth
  api/chat/route.ts           streaming endpoint (Vercel AI SDK)

components/
  ui/                         primitives (button, card, input, label, textarea)
  chat-dashboard.tsx          shell do dashboard (sidebar + header)
  chat-interface.tsx          área de chat com sugestões contextuais
  chat-message.tsx            mensagem individual (com markdown p/ assistente)
  login-form.tsx              form de login (Supabase)
  sign-up-form.tsx            form de cadastro (Supabase, grava metadata)
  auth-shell.tsx              layout compartilhado das telas de auth

lib/
  utils.ts                    cn() helper
  subjects.ts                 matérias, preparações e system prompts
  supabase/
    env.ts                    leitura/validação das env vars
    client.ts                 browser client
    server.ts                 server client (RSC)
    middleware.ts             refresh de sessão + guard de rotas

middleware.ts                 Next.js middleware (usa lib/supabase/middleware)
scripts/                      migrations SQL
```

## Decisões / diferenças do protótipo original

- **Login real via Supabase**, não o redirect fake anterior.
- **Fluxo de signup** com nome completo e série, gravados na `profiles` via
  trigger SQL (`handle_new_user`).
- **Credenciais saíram do código** para `.env.local`.
- **Sidebar é funcional**: clicar em uma matéria ou preparação muda o system
  prompt do chat e mostra sugestões específicas daquele contexto.
- **Respostas do assistente são renderizadas em Markdown** (negrito, listas,
  código), usando `react-markdown` + `remark-gfm`.
- **Botão "Nova conversa"** reinicia o chat preservando o contexto selecionado.
- Middleware agora também redireciona usuários logados de volta para `/dashboard`
  se acessarem `/auth/*`, e propaga `?next=` para voltar ao destino original.

## Equipe

- Davi Donati — CTO e Fundador
- Jose Leonardo Abarca — Diretor de Marketing e Business
- Walter Neto — Diretor da Equipe de Support
- Escola Concept São Paulo — Parceiro Educacional
