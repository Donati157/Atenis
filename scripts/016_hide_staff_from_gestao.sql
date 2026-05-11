-- 016: Garante que `hidden_from_staff` filtra TANTO alunos QUANTO professores
-- nas listagens de Gestão. Hoje só alunos têm hidden=true (claudia/demo/miriam),
-- mas a coluna existe no profiles e pode ser usada pra qualquer role no futuro.
-- Idempotente.

-- ========== 1. Coluna hidden_from_staff (cria se não existir) ==========
alter table public.profiles
  add column if not exists hidden_from_staff boolean default false;

-- Trava contra UPDATE pelos próprios usuários (só service_role muda).
revoke update (hidden_from_staff) on public.profiles from authenticated;
revoke update (hidden_from_staff) on public.profiles from anon;

-- ========== 2. list_students_for_staff já filtra hidden ==========
-- (Definida em 009_staff_access.sql.) Recriamos pra garantir filtro presente.
create or replace function public.list_students_for_staff()
returns table (
  id uuid,
  full_name text,
  grade_level text,
  role text,
  email text,
  created_at timestamptz,
  hidden_from_staff boolean
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
    select p.id, p.full_name, p.grade_level, p.role, p.email,
           p.created_at, p.hidden_from_staff
    from public.profiles p
    where p.role = 'student'
      and (p.hidden_from_staff is null or p.hidden_from_staff = false)
    order by p.created_at desc;
end;
$$;

grant execute on function public.list_students_for_staff() to authenticated;

-- ========== 3. list_professors_for_admin agora filtra hidden_from_staff ==========
do $$
declare
  r record;
begin
  for r in
    select oid::regprocedure as sig
    from pg_proc
    where proname = 'list_professors_for_admin'
      and pronamespace = 'public'::regnamespace
  loop
    execute 'drop function ' || r.sig || ' cascade';
  end loop;
end;
$$;

create function public.list_professors_for_admin()
returns table (
  id uuid,
  full_name text,
  email text,
  role text,
  teaching_grades text[],
  teaching_natural_sub text[],
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.is_admin() then
    raise exception 'access denied: admin only';
  end if;

  return query
    select p.id, p.full_name, p.email, p.role,
           p.teaching_grades, p.teaching_natural_sub, p.created_at
    from public.profiles p
    where p.role = 'professor'
      and (p.hidden_from_staff is null or p.hidden_from_staff = false)
    order by p.created_at desc;
end;
$$;

grant execute on function public.list_professors_for_admin() to authenticated;

notify pgrst, 'reload schema';
