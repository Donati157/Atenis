-- RESET TOTAL do schema de profiles. Rode esse no SQL Editor do Supabase.
-- Substitui qualquer estado anterior (triggers, constraints, RLS) pelo correto.
-- Roda em qualquer estado do DB. Seguro rodar múltiplas vezes.
--
-- ATENÇÃO: isso NÃO apaga usuários (auth.users) nem dados de profiles.
-- Só recria as regras em volta.

-- ========== 1. Remove trigger e função antigos ==========
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;

-- ========== 2. Garante que a tabela profiles existe ==========
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  grade_level text,
  role text default 'student',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Adiciona colunas que podem ter ficado pra trás
alter table public.profiles add column if not exists role text default 'student';
alter table public.profiles add column if not exists grade_level text;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists created_at timestamptz default now();
alter table public.profiles add column if not exists updated_at timestamptz default now();

-- ========== 3. Remove TODAS as constraints antigas ==========
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles drop constraint if exists profiles_grade_level_check;
alter table public.profiles drop constraint if exists profiles_role_grade_check;

-- ========== 4. Normaliza dados legados ==========
update public.profiles set role = 'professor' where role = 'teacher';
update public.profiles set role = 'student' where role is null or role = '' or role not in ('student','professor','admin');
update public.profiles set grade_level = null where grade_level in ('high_school','ap_college');
update public.profiles set grade_level = null where grade_level is not null
  and grade_level not in ('6th_grade','7th_grade','8th_grade','9th_grade','10th_grade','11th_grade','12th_grade');

-- ========== 5. Reaplica constraints corretas (sem a checagem estrita role×grade) ==========
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('student','professor','admin'));

alter table public.profiles
  add constraint profiles_grade_level_check
  check (grade_level is null or grade_level in
    ('6th_grade','7th_grade','8th_grade','9th_grade','10th_grade','11th_grade','12th_grade'));

-- ========== 6. RLS ==========
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own"  on public.profiles;
drop policy if exists "profiles_insert_own"  on public.profiles;
drop policy if exists "profiles_update_own"  on public.profiles;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- ========== 7. Tranca o campo `role` para usuários não poderem se auto-promover ==========
revoke update (role) on public.profiles from authenticated;
revoke update (role) on public.profiles from anon;

-- ========== 8. Trigger novo, seguro, que cria o profile automaticamente ==========
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text;
  safe_role text;
  requested_grade text;
  safe_grade text;
begin
  requested_role  := nullif(new.raw_user_meta_data->>'role', '');
  requested_grade := nullif(new.raw_user_meta_data->>'grade_level', '');

  -- 'admin' NUNCA vem do cliente. Só 'student' e 'professor' são aceitos.
  safe_role := case
    when requested_role in ('student','professor') then requested_role
    else 'student'
  end;

  -- Só valida o grade_level contra a lista conhecida; se for inválido, vira null.
  safe_grade := case
    when requested_grade in ('6th_grade','7th_grade','8th_grade','9th_grade',
                             '10th_grade','11th_grade','12th_grade') then requested_grade
    else null
  end;

  insert into public.profiles (id, full_name, role, grade_level)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    safe_role,
    safe_grade
  )
  on conflict (id) do nothing;
  return new;
exception when others then
  -- Não quebra o signup do auth se algo der errado no profile.
  -- (O profile pode ser criado depois pelo app, se necessário.)
  raise warning 'handle_new_user falhou: %', sqlerrm;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ========== 9. Diagnóstico — rode esses SELECTs depois pra confirmar ==========
-- Devem retornar as 2 constraints corretas:
-- select conname, pg_get_constraintdef(oid)
--   from pg_constraint
--   where conrelid = 'public.profiles'::regclass;

-- Deve retornar 1 trigger:
-- select tgname from pg_trigger
--   where tgrelid = 'auth.users'::regclass and not tgisinternal;
