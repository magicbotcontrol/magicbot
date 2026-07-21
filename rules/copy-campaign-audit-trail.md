# Audit trail de campanhas (Copy Trading)

## Objetivo
Registrar uma trilha de auditoria das campanhas de Copy Trading aplicadas no **primeiro cadastro** do usuário, para medir:
- quantos cadastros cada campanha gerou;
- quando o benefício foi aplicado;
- quando expira;
- evitar múltiplas aplicações indevidas.

## Implementação no MagicCopyBot (Supabase)
### Tabela
`public.copy_trading_campaign_redemptions`
- 1 linha por `workspace_id` (primeiro cadastro).
- Campos principais: `campaign_code`, `trial_days`, `entitlement_expires_at`, `applied_at`.

Migração:
- `supabase/migrations/20260607001200_phase15_copy_trading_campaign_redemptions.sql`

### Regra de aplicação
A função `public.apply_copy_trading_campaign(workspace_id, campaign_code)`:
- verifica se já existe redemption para aquele `workspace_id`; se existir, não aplica novamente;
- valida a campanha em `public.copy_trading_campaigns` (ativa e com `trial_days` permitido);
- grava/atualiza o entitlement `copy_trading` em `public.workspace_entitlements`;
- cria a linha de auditoria em `public.copy_trading_campaign_redemptions`.

## Consultas úteis (admin)
### Cadastros por campanha (últimos 30 dias)
```sql
select
  campaign_code,
  count(*) as signups
from public.copy_trading_campaign_redemptions
where applied_at >= timezone('utc', now()) - interval '30 days'
group by campaign_code
order by signups desc;
```

### Redemptions recentes
```sql
select *
from public.copy_trading_campaign_redemptions
order by applied_at desc
limit 100;
```

## Próximo passo (recomendado)
Adicionar um painel no Admin com:
- ranking de campanhas por cadastros;
- expiração média;
- export CSV.
