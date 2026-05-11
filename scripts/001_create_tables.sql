-- Profiles: one row per auth user.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  grade_level text check (grade_level in ('6th_grade','7th_grade','8th_grade','9th_grade','10th_grade','11th_grade','12th_grade')),
  role text default 'student' check (role in ('student','professor','admin')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- Subjects: canonical list.
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  icon text,
  created_at timestamptz default now()
);

insert into public.subjects (name, icon) values
  ('Portuguese', '📖'),
  ('English', '🌍'),
  ('Math', '🔢'),
  ('Sciences', '🔬'),
  ('History', '🏛️'),
  ('Geography', '🗺️')
on conflict (name) do nothing;

-- Content (videos, articles).
create table if not exists public.content (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid references public.subjects(id) on delete cascade,
  title text not null,
  description text,
  video_url text,
  grade_level text check (grade_level in ('6th_grade','7th_grade','8th_grade','9th_grade','10th_grade','11th_grade','12th_grade')),
  content_type text check (content_type in ('enem','vestibular','ap_college_board','general')),
  created_at timestamptz default now()
);

alter table public.content enable row level security;

drop policy if exists "content_select_all" on public.content;
create policy "content_select_all" on public.content for select to authenticated using (true);

-- Quiz questions.
create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  content_id uuid references public.content(id) on delete cascade,
  question_text text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct_answer text check (correct_answer in ('A','B','C','D')) not null,
  explanation text,
  created_at timestamptz default now()
);

alter table public.quiz_questions enable row level security;

drop policy if exists "quiz_questions_select_all" on public.quiz_questions;
create policy "quiz_questions_select_all" on public.quiz_questions for select to authenticated using (true);

-- Per-user progress.
create table if not exists public.user_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  content_id uuid references public.content(id) on delete cascade,
  completed boolean default false,
  quiz_score integer,
  last_accessed timestamptz default now(),
  unique (user_id, content_id)
);

alter table public.user_progress enable row level security;

drop policy if exists "user_progress_select_own" on public.user_progress;
drop policy if exists "user_progress_insert_own" on public.user_progress;
drop policy if exists "user_progress_update_own" on public.user_progress;

create policy "user_progress_select_own" on public.user_progress for select using (auth.uid() = user_id);
create policy "user_progress_insert_own" on public.user_progress for insert with check (auth.uid() = user_id);
create policy "user_progress_update_own" on public.user_progress for update using (auth.uid() = user_id);
