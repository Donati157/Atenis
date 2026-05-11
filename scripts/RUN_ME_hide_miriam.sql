-- Marca miriam@ezaitz.com.br como conta oculta (não aparece na Gestão de Alunos).
-- Idempotente — pode rodar quantas vezes quiser.

update public.profiles
set hidden_from_staff = true,
    full_name = coalesce(nullif(full_name, ''), 'Miriam')
where id = (
  select id from auth.users
  where lower(email) = 'miriam@ezaitz.com.br'
);

-- Verifica:
-- select p.full_name, p.role, p.hidden_from_staff, u.email
-- from public.profiles p
-- join auth.users u on u.id = p.id
-- where u.email = 'miriam@ezaitz.com.br';
