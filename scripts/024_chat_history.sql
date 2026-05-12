-- 024_chat_history.sql
-- Histórico de conversas do chat + base pra memória contextual da IA.
-- Cria duas tabelas: chat_threads (uma conversa) + chat_messages (mensagens).
-- RLS: aluno enxerga só as próprias conversas. Staff opcional via flag (não
-- exposto por padrão pra preservar privacidade do aluno).
-- Idempotente.

-- ========== 1. chat_threads ==========
create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Nova conversa',
  -- Snapshot da configuração da sidebar no momento da criação. Permite
  -- mostrar contexto da conversa na listagem (ex: "Matemática + ENEM").
  subject text,
  sub_subject text,
  exam_prep text,
  corrector text,
  study_mode text,
  active_learning boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists chat_threads_user_updated_idx
  on public.chat_threads (user_id, updated_at desc);

alter table public.chat_threads enable row level security;

drop policy if exists "ct_select_own" on public.chat_threads;
drop policy if exists "ct_insert_own" on public.chat_threads;
drop policy if exists "ct_update_own" on public.chat_threads;
drop policy if exists "ct_delete_own" on public.chat_threads;

create policy "ct_select_own" on public.chat_threads
  for select using (auth.uid() = user_id);

create policy "ct_insert_own" on public.chat_threads
  for insert with check (auth.uid() = user_id);

create policy "ct_update_own" on public.chat_threads
  for update using (auth.uid() = user_id);

create policy "ct_delete_own" on public.chat_threads
  for delete using (auth.uid() = user_id);

-- ========== 2. chat_messages ==========
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  -- parts é o formato canônico do Vercel AI SDK 5: [{type:'text',text:...},
  -- {type:'file',url:...,mediaType:...}, ...]. JSONB pra preservar.
  parts jsonb not null default '[]'::jsonb,
  created_at timestamptz default now()
);

create index if not exists chat_messages_thread_idx
  on public.chat_messages (thread_id, created_at asc);

create index if not exists chat_messages_user_idx
  on public.chat_messages (user_id, created_at desc);

alter table public.chat_messages enable row level security;

drop policy if exists "cm_select_own" on public.chat_messages;
drop policy if exists "cm_insert_own" on public.chat_messages;
drop policy if exists "cm_delete_own" on public.chat_messages;

create policy "cm_select_own" on public.chat_messages
  for select using (auth.uid() = user_id);

create policy "cm_insert_own" on public.chat_messages
  for insert with check (auth.uid() = user_id);

create policy "cm_delete_own" on public.chat_messages
  for delete using (auth.uid() = user_id);

-- ========== 3. Trigger pra manter updated_at do thread em sync ==========
create or replace function public.touch_chat_thread()
returns trigger
language plpgsql
as $$
begin
  update public.chat_threads
    set updated_at = now()
    where id = new.thread_id;
  return new;
end;
$$;

drop trigger if exists trg_touch_chat_thread on public.chat_messages;
create trigger trg_touch_chat_thread
  after insert on public.chat_messages
  for each row execute function public.touch_chat_thread();
