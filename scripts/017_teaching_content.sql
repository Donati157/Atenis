-- 017: Conteúdo postado por professores (Matéria, Provas, "O que estudar").
-- Cada item pertence a um professor, é categorizado por subject + tipo + séries.
-- Idempotente.

-- ========== 1. Tabela teaching_content ==========
create table if not exists public.teaching_content (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('materia', 'prova', 'estudar')),
  subject text,
  grade_levels text[],
  title text not null,
  content text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists teaching_content_professor_created_idx
  on public.teaching_content (professor_id, created_at desc);

create index if not exists teaching_content_subject_idx
  on public.teaching_content (subject);

create index if not exists teaching_content_grades_idx
  on public.teaching_content using gin (grade_levels);

alter table public.teaching_content enable row level security;

-- ========== 2. Constraints de domínio ==========
alter table public.teaching_content drop constraint if exists tc_grades_check;
alter table public.teaching_content
  add constraint tc_grades_check
  check (
    grade_levels is null
    or grade_levels <@ array[
      '6th_grade','7th_grade','8th_grade','9th_grade',
      '10th_grade','11th_grade','12th_grade'
    ]::text[]
  );

-- ========== 3. RLS policies ==========
drop policy if exists "tc_select_own"     on public.teaching_content;
drop policy if exists "tc_insert_own"     on public.teaching_content;
drop policy if exists "tc_update_own"     on public.teaching_content;
drop policy if exists "tc_delete_own"     on public.teaching_content;
drop policy if exists "tc_select_students" on public.teaching_content;
drop policy if exists "tc_select_staff"   on public.teaching_content;

-- Professor lê/cria/edita/apaga só o próprio conteúdo
create policy "tc_select_own" on public.teaching_content
  for select using (auth.uid() = professor_id);

create policy "tc_insert_own" on public.teaching_content
  for insert with check (auth.uid() = professor_id);

create policy "tc_update_own" on public.teaching_content
  for update using (auth.uid() = professor_id);

create policy "tc_delete_own" on public.teaching_content
  for delete using (auth.uid() = professor_id);

-- Alunos podem ler todo conteúdo (eventualmente filtrar por série no app)
create policy "tc_select_students" on public.teaching_content
  for select using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'student'
    )
  );

-- Staff (admin/professor) leem tudo
create policy "tc_select_staff" on public.teaching_content
  for select using (public.is_staff());

-- ========== 4. Trigger pra updated_at ==========
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tc_set_updated_at on public.teaching_content;
create trigger tc_set_updated_at
  before update on public.teaching_content
  for each row execute function public.set_updated_at();

notify pgrst, 'reload schema';
