# FluxoPay Telegram Bot

Esta pasta e standalone. Para rodar o bot em outra maquina, voce pode copiar
somente a pasta `bot/`.

## Requisitos

- Node.js LTS.
- Token do Telegram gerado no BotFather.
- `SUPABASE_URL`.
- `SUPABASE_SERVICE_ROLE_KEY`.

## Setup

```bash
cd bot
npm install
copy .env.bot.example .env.bot
npm run start
```

No Linux/macOS:

```bash
cp .env.bot.example .env.bot
```

## Variaveis

```txt
TELEGRAM_BOT_TOKEN="token-do-botfather"
SUPABASE_URL="https://seu-projeto.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="sua-service-role-key"
BOT_TIMEZONE="America/Sao_Paulo"
```

## Operacao

O bot usa long polling. A maquina nao precisa IP publico, dominio, webhook ou
porta aberta. Ela so precisa fazer conexoes de saida para Telegram e Supabase.

Comandos:

- `/start TOKEN`
- `/vincular TOKEN`
- `/ajuda`
- `/saldo`
- `/resumo`

Exemplos:

```txt
gastei 25 no mercado
recebi 300 de freela hoje
```

O bot pede confirmacao antes de salvar.
