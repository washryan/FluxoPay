# Bot Telegram

O bot do FluxoPay roda via long polling em uma maquina local 24h. Ele nao
precisa de IP publico, dominio, webhook, Render ou porta aberta no roteador.

## Como funciona o vinculo

1. O usuario loga no site.
2. Acessa `/settings/telegram`.
3. Gera um token temporario de 15 minutos.
4. Envia `/start TOKEN` para o bot no Telegram.
5. O bot procura o hash do token no Supabase usando `service_role`.
6. Se o token estiver valido, o bot salva `telegram_user_id`,
   `telegram_chat_id`, username e marca o vinculo como `active`.

A maquina que roda o bot nao e a identidade do usuario. Ela so executa o
processo. O vinculo real fica em `telegram_links`.

## Setup na maquina 24h

1. Instale Node.js LTS.
2. Clone o repositorio.
3. Rode:

```bash
npm install
```

4. Crie `.env.bot` a partir de `.env.bot.example`.
5. Preencha:

```txt
TELEGRAM_BOT_TOKEN="token-do-botfather"
SUPABASE_URL="https://seu-projeto.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="sua-service-role-key"
BOT_TIMEZONE="America/Sao_Paulo"
```

6. Inicie:

```bash
npm run bot
```

## MVP implementado

- `/start TOKEN`
- `/vincular TOKEN`
- `/ajuda`
- `/saldo`
- `/resumo`
- Parser simples para entradas e saidas.
- Confirmacao antes de salvar.
- Salvamento em `transactions` com `source = telegram`.

## Exemplos

```txt
gastei 25 no mercado
recebi 300 de freela hoje
paguei 120 da internet
```

O bot responde com a interpretacao e so salva apos `sim`.

## Seguranca

- `SUPABASE_SERVICE_ROLE_KEY` fica apenas na maquina do bot.
- O frontend nunca usa service role.
- O bot valida `telegram_links.status = active`.
- O token de vinculo e salvo apenas como hash.
- Tokens pendentes expiram em 15 minutos.
- Mensagens sao limitadas antes de salvar em `bot_pending_confirmations`.
