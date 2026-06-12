-- 026_add_phone.sql
-- Adiciona coluna phone em profiles. Usada pro signup de usuários
-- fora da Concept (caminho "Outro" no signup): nome + telefone são
-- obrigatórios pra contas individuais. Concept SP fica sem phone
-- (não é exigido).
-- Idempotente.

alter table public.profiles
  add column if not exists phone text;

-- Não precisa de policy nova — herda das policies existentes
-- (auth.uid() = id pra select/update, etc).
