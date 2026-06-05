# FluxoPay

FluxoPay é um SaaS real de finanças pessoais, gratuito no início e preparado
para evoluir para assinaturas no futuro. O objetivo é oferecer um produto
confiável para uso diário: usuários com ambiente isolado, Supabase Auth,
Postgres com RLS, dashboard financeiro e bot Telegram rodando via long polling
em uma máquina local.

## Status

Fase atual: Fase 3 funcional, preparando Fase 4.

Implementado nesta etapa:

- Next.js App Router com TypeScript e Tailwind CSS.
- Supabase SSR separado entre browser, server e proxy de sessao.
- Cadastro, login, logout e rota protegida `/dashboard`.
- Migration inicial com RLS para tabelas financeiras.
- Estrutura de docs, env examples e configuracao local do Supabase.
- Categorias e transacoes com CRUD/filtros.
- Contas futuras, cartões, compras parceladas e parcelas persistidas no Supabase.
- Modal para configurar cartões pré-definidos antes de salvar vencimento,
  fechamento e limite.
- Faturas consolidadas por cartão/mês.
- Ações para marcar parcela ou fatura como paga, criando transação de saída.

Ainda nao implementado:

- Bot Telegram e worker de lembretes.
- Testes automatizados.

## Stack

- Frontend: Next.js, TypeScript, Tailwind CSS, React Hook Form, Zod.
- Backend: Supabase Auth, Supabase Postgres e Row Level Security.
- Bot futuro: Node.js, TypeScript, Telegraf ou grammY, long polling.
- Deploy alvo: Vercel Free para o site e maquina local para bot/worker.

## Arquitetura

```txt
src/
  app/
    (auth)/              # Login e cadastro
    (app)/               # Rotas autenticadas
    auth/callback/       # Callback de e-mail/OAuth do Supabase
  features/
    auth/                # Formulario, schemas e actions de autenticacao
  lib/
    supabase/            # Clients browser/server/proxy
    utils.ts             # Helpers compartilhados
supabase/
  migrations/            # SQL versionado com RLS
  config.toml            # Config local Supabase CLI
docs/
  ARCHITECTURE.md        # Decisoes tecnicas e plano por fases
```

## Setup local

1. Instale dependencias:

```bash
npm install
```

2. Crie um projeto gratuito no Supabase:

- Acesse `https://supabase.com/dashboard`.
- Crie uma organizacao, se ainda nao existir.
- Clique em `New project`.
- Escolha um nome, senha do banco, regiao e plano Free.
- Aguarde o projeto terminar de provisionar.

3. Copie as credenciais do Supabase:

- No projeto Supabase, abra `Project Settings` > `API Keys`.
- Copie o `Project URL`.
- Copie a chave publica do frontend: `Publishable key` ou, em projetos antigos, `anon public`.
- Para o bot futuro, copie apenas em ambiente local/backend a chave elevada: `Secret key` ou, em projetos antigos, `service_role`.

4. Configure variaveis:

```bash
cp .env.example .env.local
```

5. Preencha `.env.local` com:

```txt
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_APP_URL
```

Exemplo:

```txt
NEXT_PUBLIC_SUPABASE_URL="https://abcxyz.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_..."
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

6. Autentique o Supabase CLI:

```bash
npx supabase login
```

O comando abre/pede um access token da sua conta Supabase. Se precisar gerar
manual, use `https://supabase.com/dashboard/account/tokens`.

7. Vincule este repositorio ao projeto Supabase:

```bash
npx supabase link --project-ref npwxkykayvfjbwhanwdb
```

8. Aplique a migration no Supabase:

```bash
npx supabase db push
```

9. Rode o app:

```bash
npm run dev
```

10. Acesse:

```txt
http://localhost:3000
```

## Variaveis de ambiente

Frontend (`.env.local`):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL`

Bot futuro (`.env.bot`):

- `TELEGRAM_BOT_TOKEN`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `BOT_TIMEZONE`
- `REMINDER_CRON`

Nunca exponha `SUPABASE_SERVICE_ROLE_KEY` no frontend ou na Vercel do site.

## Banco de dados

A primeira migration cria:

- `profiles`
- `categories`
- `transactions`
- `bills`
- `credit_cards`
- `credit_card_purchases`
- `installments`
- `telegram_links`
- `bot_pending_confirmations`
- `notification_preferences`

Todas as tabelas de dados financeiros possuem `user_id`. Valores monetarios sao
armazenados como `amount_cents` ou `*_cents` para evitar erro de float.

## E-mails do Supabase

O Supabase pode exigir Custom SMTP para editar o source dos templates de Auth.
O plano para e-mails esta documentado em `docs/SUPABASE_EMAIL.md`.

## Como testar esta fase

- `npm run lint`
- `npm run build`
- Criar conta via `/signup`.
- Entrar via `/login`.
- Confirmar que `/dashboard` redireciona para `/login` quando nao autenticado.
- Confirmar que o logout encerra a sessao.
- No Supabase, confirmar que um usuario nao consegue ler dados de outro via RLS.

## Roadmap

1. CRUD de categorias e transacoes com validacao Zod.
2. Dashboard com resumo mensal e graficos Recharts.
3. Contas a pagar/receber e status automatico.
4. Bot Telegram com vinculação segura e confirmação antes de salvar.
5. Worker local de lembretes e relatórios.
6. Importação CSV/OFX.
7. IA para classificação automática.
8. Open Finance ou agregador externo, se fizer sentido no custo/benefício.
9. Metas, orçamentos e compartilhamento familiar.
10. Exportação PDF/Excel e PWA.

## Capturas futuras

Adicionar aqui capturas da landing, login, dashboard, transacoes, contas,
cartoes e fluxo Telegram assim que cada modulo estiver pronto.
