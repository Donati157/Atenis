-- Manually promote a user to admin. Run this in the Supabase SQL Editor.
-- The user must already exist (tenha feito signup no site antes).
--
-- Substitua o email abaixo pelo seu:

update public.profiles
set role = 'admin',
    grade_level = null
where id = (
  select id from auth.users
  where lower(email) = lower('SEU_EMAIL@exemplo.com')
);

-- Verificar que funcionou:
-- select p.role, u.email
-- from public.profiles p
-- join auth.users u on u.id = p.id
-- where p.role = 'admin';

-- Para rebaixar um admin de volta a estudante (sem grade, pra forçar escolha no próximo login):
-- update public.profiles set role = 'student' where id = (select id from auth.users where email = 'x@y.com');
