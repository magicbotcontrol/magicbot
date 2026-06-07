-- Uso:
-- 1. Aplique a migration 20260607001300_phase15_test_accounts_guardrails.sql
-- 2. Execute este SQL no projeto correto (somente admin autenticado)
-- 3. Ajuste a whitelist antes de rodar

select *
from public.cleanup_test_accounts(
  array[
    'wilson270043@gmail.com',
    'academiadevencedores3@gmail.com',
    'magicbotcontrol@gmail.com'
  ]
);
