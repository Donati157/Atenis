-- 023: "Liderança principal" (super leadership) — análogo do super admin no
-- tier de liderança. Identificado por UUID hardcoded.
-- UUID: aee6d329-a599-4506-88e3-90b3b7f19a72
--
-- Pode:
-- - Listar/editar outras lideranças (mesmo nível que admin)
-- - Promover/rebaixar leadership (transições student/professor <-> leadership)
-- - Trocar senha de outras lideranças
--
-- NÃO pode:
-- - Mexer em admin (role admin permanece exclusiva do super admin)
-- - Ser rebaixada pela RPC staff_change_role
--
-- Idempotente.

-- ========== 1. is_super_leadership() ==========
create or replace function public.is_super_leadership()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select auth.uid() = 'aee6d329-a599-4506-88e3-90b3b7f19a72'::uuid;
$$;

grant execute on function public.is_super_leadership() to authenticated;

-- ========== 2. list_leaders_for_admin — agora inclui super leadership ==========
do $$
declare
  r record;
begin
  for r in
    select oid::regprocedure as sig
    from pg_proc
    where proname = 'list_leaders_for_admin'
      and pronamespace = 'public'::regnamespace
  loop
    execute 'drop function ' || r.sig || ' cascade';
  end loop;
end;
$$;

create function public.list_leaders_for_admin()
returns table (
  id uuid,
  full_name text,
  email text,
  role text,
  leadership_title text,
  is_super boolean,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not (public.is_admin() or public.is_super_leadership()) then
    raise exception 'access denied: admin or super leadership only';
  end if;

  return query
    select p.id, p.full_name, p.email, p.role,
           p.leadership_title,
           (p.id = 'aee6d329-a599-4506-88e3-90b3b7f19a72'::uuid) as is_super,
           p.created_at
    from public.profiles p
    where p.role = 'leadership'
      and (p.hidden_from_staff is null or p.hidden_from_staff = false)
    order by (p.id = 'aee6d329-a599-4506-88e3-90b3b7f19a72'::uuid) desc,
             p.created_at desc;
end;
$$;

grant execute on function public.list_leaders_for_admin() to authenticated;

-- ========== 3. staff_update_leadership — admin OR super leadership ==========
drop function if exists public.staff_update_leadership(uuid, text, text) cascade;

create function public.staff_update_leadership(
  p_leadership_id uuid,
  p_full_name text default null,
  p_leadership_title text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_role text;
begin
  if not (public.is_admin() or public.is_super_leadership()) then
    raise exception 'access denied: admin or super leadership only';
  end if;

  if public.is_protected_account(p_leadership_id) and not public.is_super_admin() then
    raise exception 'access denied: only super admin can edit this account';
  end if;

  -- A super leadership não pode editar o próprio profile via essa RPC
  -- (evita auto-rename estranho); ela edita pelo fluxo normal de profile.
  if public.is_super_leadership() and p_leadership_id = 'aee6d329-a599-4506-88e3-90b3b7f19a72'::uuid then
    raise exception 'super leadership não edita a si mesma por aqui';
  end if;

  select role into target_role from public.profiles where id = p_leadership_id;
  if target_role is null then
    raise exception 'target profile not found';
  end if;
  if target_role <> 'leadership' then
    raise exception 'target is not leadership (role=%)', target_role;
  end if;

  update public.profiles
  set
    full_name = case
      when p_full_name is not null and trim(p_full_name) <> ''
        then trim(p_full_name)
      else full_name
    end,
    leadership_title = case
      when p_leadership_title is not null
        then nullif(trim(p_leadership_title), '')
      else leadership_title
    end,
    updated_at = now()
  where id = p_leadership_id;
end;
$$;

grant execute on function public.staff_update_leadership(uuid, text, text) to authenticated;

-- ========== 4. staff_change_role — super leadership pode mudar role no tier dela ==========
-- Regras agora:
-- - Super admin: pode tudo (incl. role admin)
-- - Admin comum: pode student/professor/leadership transitions, NÃO admin
-- - Super leadership: pode student/professor/leadership transitions, NÃO admin
-- - Liderança comum: NADA (continua sem permissão)
-- - Conta protegida: só super admin
-- - Super admin não pode ser rebaixado
-- - Super leadership não pode ser rebaixada
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
  is_super_a boolean;
  is_super_l boolean;
  is_regular_admin boolean;
  is_admin_involved boolean;
begin
  -- Caller precisa ser admin ou super leadership
  if not (public.is_admin() or public.is_super_leadership()) then
    raise exception 'access denied: admin or super leadership only';
  end if;

  is_super_a := public.is_super_admin();
  is_super_l := public.is_super_leadership();
  is_regular_admin := public.is_admin() and not is_super_a;

  if p_new_role not in ('student','professor','leadership','admin') then
    raise exception 'invalid role: %', p_new_role;
  end if;

  select role into current_target_role from public.profiles where id = p_target_id;
  if current_target_role is null then
    raise exception 'target profile not found';
  end if;
  if current_target_role = p_new_role then
    return;
  end if;

  is_admin_involved := (current_target_role = 'admin' or p_new_role = 'admin');

  -- Apenas super admin pode mexer em admin role
  if is_admin_involved and not is_super_a then
    raise exception 'access denied: only super admin can change admin role';
  end if;

  -- Conta protegida: só super admin
  if public.is_protected_account(p_target_id) and not is_super_a then
    raise exception 'access denied: only super admin can edit this account';
  end if;

  -- Super admin não pode ser rebaixado
  if p_target_id = '654ace27-861f-47c2-a918-993ef1b3f993'::uuid
     and p_new_role <> 'admin' then
    raise exception 'cannot demote the super admin';
  end if;

  -- Super leadership não pode ser rebaixada
  if p_target_id = 'aee6d329-a599-4506-88e3-90b3b7f19a72'::uuid
     and p_new_role <> 'leadership' then
    raise exception 'cannot demote the super leadership';
  end if;

  update public.profiles
  set
    role = p_new_role,
    grade_level = case
      when p_new_role = 'student' then grade_level
      else null
    end,
    teaching_grades = case
      when p_new_role = 'professor' then teaching_grades
      else null
    end,
    teaching_assignments = case
      when p_new_role = 'professor' then teaching_assignments
      else '{}'::jsonb
    end,
    teaching_natural_sub = case
      when p_new_role = 'professor' then teaching_natural_sub
      else null
    end,
    leadership_title = case
      when p_new_role = 'leadership' then leadership_title
      else null
    end,
    updated_at = now()
  where id = p_target_id;
end;
$$;

grant execute on function public.staff_change_role(uuid, text) to authenticated;

notify pgrst, 'reload schema';
