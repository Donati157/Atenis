-- 014: RPC apply_signup_intent.
-- Aplica os dados que o usuário escolheu no signup (role, série, séries que
-- leciona, sub-matérias NS) DEPOIS dele autenticar via OAuth (Google).
-- Como o OAuth não permite passar metadata customizada, capturamos no
-- localStorage do navegador antes de redirecionar pro Google e aplicamos aqui.
--
-- Regras de segurança:
-- - Só o próprio usuário pode aplicar a sua intenção (auth.uid() = id).
-- - Role só pode ser 'student' ou 'professor' (NUNCA 'admin').
-- - Se o profile já existe com role definida (ex: aluno antigo), MANTÉM a
--   role atual — não promove silenciosamente.
-- - Idempotente: rodar várias vezes não causa estrago.
-- Idempotente.

create or replace function public.apply_signup_intent(
  p_role text,
  p_full_name text default null,
  p_grade_level text default null,
  p_teaching_grades text[] default null,
  p_teaching_natural_sub text[] default null
)
returns table (
  id uuid,
  role text,
  full_name text,
  grade_level text,
  teaching_grades text[],
  teaching_natural_sub text[]
)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  current_role text;
  safe_role text;
  safe_grade text;
  safe_teaching_grades text[];
  safe_teaching_sub text[];
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  -- Sanitiza role (admin nunca passa)
  safe_role := case
    when p_role in ('student','professor') then p_role
    else 'student'
  end;

  safe_grade := case
    when p_grade_level in ('6th_grade','7th_grade','8th_grade','9th_grade',
                           '10th_grade','11th_grade','12th_grade') then p_grade_level
    else null
  end;

  -- Filtra arrays
  safe_teaching_grades := case
    when p_teaching_grades is null then null
    else (
      select array_agg(g) from unnest(p_teaching_grades) g
      where g in ('6th_grade','7th_grade','8th_grade','9th_grade',
                  '10th_grade','11th_grade','12th_grade')
    )
  end;

  safe_teaching_sub := case
    when p_teaching_natural_sub is null then null
    else (
      select array_agg(s) from unnest(p_teaching_natural_sub) s
      where s in ('fisica','quimica','biologia')
    )
  end;

  -- Cria profile se ainda não existir (caso trigger não tenha rodado).
  insert into public.profiles (id, full_name, role)
  values (
    uid,
    coalesce(nullif(trim(p_full_name), ''), ''),
    safe_role
  )
  on conflict (id) do nothing;

  -- Pega a role atual (depois do insert acima).
  select p.role into current_role from public.profiles p where p.id = uid;

  -- Atualiza sem sobrescrever campos que já têm valor:
  -- - Role: se já é admin OU professor, NÃO rebaixa pra student.
  --   Se é student e o intent é professor, promove (o usuário pediu).
  --   Se é student e o intent é student, fica student.
  update public.profiles p
  set
    role = case
      when current_role = 'admin' then 'admin'
      when current_role = 'professor' then 'professor'
      when safe_role = 'professor' then 'professor'
      else 'student'
    end,
    full_name = case
      when (p.full_name is null or p.full_name = '') and p_full_name is not null
        then nullif(trim(p_full_name), '')
      else p.full_name
    end,
    grade_level = case
      when safe_role = 'student' and safe_grade is not null then safe_grade
      else p.grade_level
    end,
    teaching_grades = case
      when safe_role = 'professor' and safe_teaching_grades is not null
        then safe_teaching_grades
      else p.teaching_grades
    end,
    teaching_natural_sub = case
      when safe_role = 'professor' and safe_teaching_sub is not null
        then safe_teaching_sub
      else p.teaching_natural_sub
    end,
    updated_at = now()
  where p.id = uid;

  return query
    select p.id, p.role, p.full_name, p.grade_level,
           p.teaching_grades, p.teaching_natural_sub
    from public.profiles p
    where p.id = uid;
end;
$$;

grant execute on function public.apply_signup_intent(text, text, text, text[], text[])
  to authenticated;

notify pgrst, 'reload schema';
