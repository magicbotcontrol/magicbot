# Integração de Promo (MagicCopyBot → ControlCopyIQ)

## Objetivo
Quando um usuário chega ao MagicCopyBot por um link de campanha (`?promo=`) e realiza o **primeiro cadastro**, o MagicCopyBot aplica automaticamente um período de teste do produto **Copy Trading** (7/15/30 dias).  
Além disso, o MagicCopyBot precisa repassar ao ControlCopyIQ a informação de qual campanha originou aquele usuário, para que o ControlCopyIQ possa:
- exibir comunicação contextual (“você veio da promo X”);
- aplicar lógica própria de onboarding/trial (se existir);
- registrar origem/campanha para relatórios.

## Contrato (query params)
O MagicCopyBot abre o ControlCopyIQ com os seguintes parâmetros:
- `source=magiccopybot` (fixo)
- `promo=<CODIGO>` (opcional; somente se o usuário tiver `promo_code` no perfil/metadata)

### Exemplo
- Cadastro do copy (com promo):  
  `https://controlcopyiq.com/c/MAGICBOT?source=magiccopybot&promo=COPY7`
- Portal (sem promo):  
  `https://controlcopyiq.com/?source=magiccopybot`

## Regras de negócio
- `promo` é opcional.
- Se `promo` não existir ou estiver inválido, o ControlCopyIQ deve tratar como **“nenhuma promoção”**.
- `promo` deve ser normalizado no ControlCopyIQ: `trim` + `upper`.
- O MagicCopyBot controla a elegibilidade do trial via Supabase (entitlement `copy_trading`). O ControlCopyIQ não deve depender disso para funcionar; ele só “consome” a origem.

## Regras de implementação (ControlCopyIQ)
### Frontend
Na rota de cadastro `/c/MAGICBOT`:
- ler `promo` e `source` da URL;
- se `source !== 'magiccopybot'`, seguir fluxo padrão;
- se `promo` existir, exibir um banner discreto (ex.: “Promo aplicada: COPY7”) e persistir esse valor no backend.

### Backend / Persistência (opcional, recomendado)
Se o ControlCopyIQ usar Postgres/Supabase, sugerimos criar uma tabela para registrar a origem da campanha:

```sql
create table if not exists public.inbound_partner_campaigns (
  id uuid primary key default gen_random_uuid(),
  partner text not null, -- ex: 'magiccopybot'
  promo_code text,
  email text,
  created_at timestamptz not null default timezone('utc', now())
);
```

Boas práticas:
- armazenar `partner`, `promo_code`, `email` (ou `user_id` interno) e timestamps.
- criar índices por `partner`, `promo_code` e `created_at`.

## Segurança
- Não confiar no `promo` para conceder acesso por si só (qualquer pessoa pode forjar URL).
- O ControlCopyIQ deve validar server-side qualquer benefício atrelado a promoções.
- Não logar tokens/chaves.
