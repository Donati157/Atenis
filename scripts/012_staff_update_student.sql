-- 012: Staff (professor/admin) pode editar dados de alunos.
-- Campos editáveis: full_name, grade_level.
-- Role, email, hidden_from_staff continuam intocáveis por essa via.
-- Idempotente.

create or replace function public.staff_update_student(
  p_student_id uuid,
  p_full_name text,
  p_grade_level text
)
returns table (
  id uuid,
  full_name text,
  grade_level text,
  role text,
  email text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_role text;
  safe_grade text;
begin
  -- Só staff pode chamar.
  if not public.is_staff() then
    raise exception 'access denied: staff only';
  end if;

  -- Valida que o alvo é realmente um estudante — staff não edita outros staff por essa via.
  select p.role into target_role
  from public.profiles p
  where p.id = p_student_id;

  if target_role is null then
    raise exception 'student not found';
  end if;
  if target_role <> 'student' then
    raise exception 'target is not a student (role=%)', target_role;
  end if;

  -- Normaliza grade_level (null se vier vazio ou inválido).
  safe_grade := case
    when p_grade_level is null or p_grade_level = '' then null
    when p_grade_level in ('6th_grade','7th_grade','8th_grade','9th_grade',
                           '10th_grade','11th_grade','12th_grade') then p_grade_level
    else null
  end;

  update public.profiles
  set
    full_name   = coalesce(nullif(trim(p_full_name), ''), full_name),
    grade_level = safe_grade,
    updated_at  = now()
  where public.profiles.id = p_student_id;

  return query
    select p.id, p.full_name, p.grade_level, p.role, p.email
    from public.profiles p
    where p.id = p_student_id;
end;
$$;

grant execute on function public.staff_update_student(uuid, text, text) to authenticated;
