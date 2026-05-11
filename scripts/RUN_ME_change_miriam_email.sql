-- Troca o email da Miriam de miriam@ezaitz.com.br para miriam@ezaitz.com.
-- Idempotente — se já tiver mudado, não faz nada.

do $$
declare
  uid uuid;
begin
  -- Acha o usuário (aceita qualquer um dos dois emails, caso já tenha trocado).
  select id into uid
  from auth.users
  where lower(email) in ('miriam@ezaitz.com.br', 'miriam@ezaitz.com');

  if uid is null then
    raise notice 'Miriam não encontrada (auth.users sem email miriam@ezaitz.com.br).';
    return;
  end if;

  -- Atualiza auth.users.
  update auth.users
  set email = 'miriam@ezaitz.com',
      raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
        || jsonb_build_object('email', 'miriam@ezaitz.com')
  where id = uid
    and email <> 'miriam@ezaitz.com';

  -- Atualiza profiles (espelho).
  update public.profiles
  set email = 'miriam@ezaitz.com'
  where id = uid
    and email is distinct from 'miriam@ezaitz.com';

  raise notice 'Email da Miriam atualizado para miriam@ezaitz.com (uid=%)', uid;
end $$;

-- Verifica:
-- select p.full_name, p.email as profile_email, u.email as auth_email,
--        p.hidden_from_staff
-- from public.profiles p join auth.users u on u.id = p.id
-- where u.email = 'miriam@ezaitz.com';
