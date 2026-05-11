-- 019: Conceito de "admin principal" (super admin) + RPC pra trocar de role.
--
-- Regras (definidas pelo Davi):
-- - Admin comum pode trocar student <-> professor.
-- - Admin comum NÃO pode promover/rebaixar admin (nem virar admin, nem tirar admin).
-- - Só o super admin (UUID hardcoded) pode envolver role='admin' em qualquer
--   transição.
-- - Super admin pode tudo.
--
-- O super admin atual: 654ace27-861f-47c2-a918-993ef1b3f993
--
-- Idempotente.

-- ========== 1. is_super_admin() ==========
-- Retorna true se o usuário autenticado for o super admin.
create or replace function public.is_super_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select auth.uid() = '654ace27-861f-47c2-a918-993ef1b3f993'::uuid;
$$;

grant execute on function public.is_super_admin() to authenticated;

-- ========== 2. staff_change_role(target, new_role) ==========
-- Troca a role de um perfil. Aplica a matriz de permissão do Davi.
-- Limpa campos incompatíveis na transição:
--   - virou student: limpa teaching_grades, teaching_assignments, teaching_natural_sub
--   - virou professor: limpa grade_level
--   - virou admin: mantém tudo (admin pode ter dados de aluno/professor por trás)
drop function if exists public.staff_change_role(uuid, text) cascade;

create function public.staff_change_role(
  p_target_id uuid,
  p_new_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_target_role text;
  is_super boolean;
  is_regular_admin boolean;
  is_admin_involved boolean;
begin
  -- Quem está chamando precisa ser admin no mínimo
  if not public.is_admin() then
    raise exception 'access denied: admin only';
  end if;

  is_super := public.is_super_admin();
  is_regular_admin := not is_super; -- admin que não é super

  -- Validação da role nova
  if p_new_role not in ('student','professor','admin') then
    raise exception 'invalid role: %', p_new_role;
  end if;

  -- Pega role atual do alvo
  select role into current_target_role
  from public.profiles
  where id = p_target_id;

  if current_target_role is null then
    raise exception 'target profile not found';
  end if;

  -- Se nada muda, sai cedo
  if current_target_role = p_new_role then
    return;
  end if;

  -- "admin envolvido" = role atual ou nova é admin
  is_admin_involved := (current_target_role = 'admin' or p_new_role = 'admin');

  -- Admin comum NÃO pode mexer em transições que envolvem admin
  if is_regular_admin and is_admin_involved then
    raise exception 'access denied: only super admin can change admin role';
  end if;

  -- Ninguém pode rebaixar o super admin (segurança)
  if p_target_id = '654ace27-861f-47c2-a918-993ef1b3f993'::uuid
     and p_new_role <> 'admin' then
    raise exception 'cannot demote the super admin';
  end if;

  -- Aplica a mudança + limpa campos incompatíveis
  update public.profiles
  set
    role = p_new_role,
    grade_level = case
      when p_new_role = 'student' then grade_level
      when p_new_role = 'professor' then null
      else grade_level
    end,
    teaching_grades = case
      when p_new_role = 'professor' then teaching_grades
      when p_new_role = 'student' then null
      else teaching_grades
    end,
    teaching_assignments = case
      when p_new_role = 'professor' then teaching_assignments
      when p_new_role = 'student' then '{}'::jsonb
      else teaching_assignments
    end,
    teaching_natural_sub = case
      when p_new_role = 'professor' then teaching_natural_sub
      when p_new_role = 'student' then null
      else teaching_natural_sub
    end,
    updated_at = now()
  where id = p_target_id;
end;
$$;

grant execute on function public.staff_change_role(uuid, text) to authenticated;

-- ========== 3. list_admins_for_admin() ==========
-- Lista todos os perfis com role='admin', visível para qualquer admin.
-- Inclui flag is_super pra UI marcar quem é o admin principal.
do $$
declare
  r record;
begin
  for r in
    select oid::regprocedure as sig
    from pg_proc
    where proname = 'list_admins_for_admin'
      and pronamespace = 'public'::regnamespace
  loop
    execute 'drop function ' || r.sig || ' cascade';
  end loop;
end;
$$;

create function public.list_admins_for_admin()
returns table (
  id uuid,
  full_name text,
  email text,
  role text,
  is_super boolean,
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
           (p.id = '654ace27-861f-47c2-a918-993ef1b3f993'::uuid) as is_super,
           p.created_at
    from public.profiles p
    where p.role = 'admin'
      and (p.hidden_from_staff is null or p.hidden_from_staff = false)
    order by (p.id = '654ace27-861f-47c2-a918-993ef1b3f993'::uuid) desc,
             p.created_at desc;
end;
$$;

grant execute on function public.list_admins_for_admin() to authenticated;

-- ========== 4. staff_update_admin_name(target_id, full_name) ==========
-- Qualquer admin pode atualizar o nome de outro admin (baixo risco).
-- Pra dados sensíveis (senha, role) há funções/APIs separadas com checks
-- mais estritos.
drop function if exists public.staff_update_admin_name(uuid, text) cascade;

create function public.staff_update_admin_name(
  p_admin_id uuid,
  p_full_name text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_role text;
begin
  if not public.is_admin() then
    raise exception 'access denied: admin only';
  end if;

  if p_full_name is null or trim(p_full_name) = '' then
    raise exception 'full_name cannot be empty';
  end if;

  select role into target_role from public.profiles where id = p_admin_id;
  if target_role is null then
    raise exception 'target profile not found';
  end if;
  if target_role <> 'admin' then
    raise exception 'target is not an admin (role=%)', target_role;
  end if;

  update public.profiles
  set full_name = trim(p_full_name),
      updated_at = now()
  where id = p_admin_id;
end;
$$;

grant execute on function public.staff_update_admin_name(uuid, text) to authenticated;

notify pgrst, 'reload schema';
