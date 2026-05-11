-- Permite que professores e admins vejam o histórico (profiles) de outros
-- usuários. Estudantes continuam vendo só o próprio profile.
-- Também adiciona `email` a profiles (copiado de auth.users) pra facilitar
-- listagens sem depender de join cross-schema.
-- Idempotente.

-- ========== 1. Coluna email em profiles ==========
alter table public.profiles add column if not exists email text;

-- Backfill dos profiles existentes a partir de auth.users.
update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id and (p.email is null or p.email = '');

-- Trava o email contra UPDATEs do cliente (só service_role edita).
revoke update (email) on public.profiles from authenticated;
revoke update (email) on public.profiles from anon;

-- ========== 2. Função is_staff() — segura contra recursão de RLS ==========
create or replace function public.is_staff()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('professor','admin')
  );
$$;

grant execute on function public.is_staff() to authenticated;

-- ========== 3. Policy: staff lê todos os profiles ==========
drop policy if exists "profiles_select_staff" on public.profiles;
create policy "profiles_select_staff" on public.profiles
  for select using (public.is_staff());

-- Obs.: a policy antiga "profiles_select_own" continua existindo e permite
-- que qualquer usuário veja o próprio profile. As duas são permissivas
-- (OR), então staff vê tudo e não-staff vê só o próprio.

-- ========== 4. RPC que lista estudantes com email (só staff) ==========
create or replace function public.list_students_for_staff()
returns table (
  id uuid,
  full_name text,
  grade_level text,
  role text,
  email text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.is_staff() then
    raise exception 'access denied: staff only';
  end if;

  return query
    select p.id, p.full_name, p.grade_level, p.role, p.email, p.created_at
    from public.profiles p
    where p.role = 'student'
    order by p.created_at desc;
end;
$$;

grant execute on function public.list_students_for_staff() to authenticated;

-- ========== 5. Atualiza o trigger de signup pra gravar o email ==========
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

  safe_role := case
    when requested_role in ('student','professor') then requested_role
    else 'student'
  end;

  safe_grade := case
    when requested_grade in ('6th_grade','7th_grade','8th_grade','9th_grade',
                             '10th_grade','11th_grade','12th_grade') then requested_grade
    else null
  end;

  insert into public.profiles (id, full_name, role, grade_level, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    safe_role,
    safe_grade,
    new.email
  )
  on conflict (id) do nothing;
  return new;
exception when others then
  raise warning 'handle_new_user falhou: %', sqlerrm;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
