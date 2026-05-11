-- Depois de criar admin@gmail.com pelo Supabase Dashboard,
-- rode este script para promovê-lo a admin.

-- 1) Garante que existe um profile para o usuário (caso tenha sido criado
--    antes do trigger 002 estar instalado).
insert into public.profiles (id, full_name, role)
select id, 'Admin', 'student'
from auth.users
where lower(email) = 'admin@gmail.com'
on conflict (id) do nothing;

-- 2) Promove para admin.
update public.profiles
set role = 'admin',
    grade_level = null,
    full_name = coalesce(nullif(full_name, ''), 'Admin')
where id = (select id from auth.users where lower(email) = 'admin@gmail.com');

-- 3) Verificar (deve retornar 1 linha com role='admin'):
-- select p.role, p.full_name, u.email
-- from public.profiles p join auth.users u on u.id = p.id
-- where u.email = 'admin@gmail.com';
