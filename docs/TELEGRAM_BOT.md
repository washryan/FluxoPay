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

Voce pode usar o repositorio inteiro ou copiar somente a pasta `bot/` para a
maquina 24h. Para operacao do bot, a pasta `bot/` ja e suficiente.

1. Instale Node.js LTS.
2. Copie a pasta `bot/` para a maquina ou clone o repositorio.
3. Rode:

```bash
cd bot
npm install
```

4. Crie `.env.bot` a partir de `bot/.env.bot.example`.
5. Preencha:

```txt
TELEGRAM_BOT_TOKEN="token-do-botfather"
SUPABASE_URL="https://seu-projeto.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="sua-service-role-key"
BOT_TIMEZONE="America/Sao_Paulo"
REMINDER_INTERVAL_MINUTES="1440"
```

6. Inicie:

```bash
npm run start
```

Se estiver usando o repositorio inteiro e estiver na raiz do projeto, tambem
pode usar:

```bash
npm run bot
```

## MVP implementado

- `/start TOKEN`
- `/vincular TOKEN`
- `/ajuda`
- `/saldo`
- `/resumo`
- Parser para entradas e saidas usando as categorias reais do usuario.
- Confirmacao antes de salvar.
- Fluxo para corrigir, criar ou ignorar categoria quando o bot nao encontra
  correspondencia.
- Salvamento em `transactions` com `source = telegram`.
- Worker local de lembretes e relatorios.
- Logs em `notification_logs` para evitar alertas duplicados.

## Lembretes automaticos

O worker inicia junto com o bot e verifica:

- contas que vencem amanha;
- contas que vencem hoje;
- contas atrasadas;
- faturas de cartao com vencimento em ate 3 dias;
- relatorio semanal nas segundas-feiras;
- relatorio mensal no primeiro dia do mes.

Para teste, coloque `REMINDER_INTERVAL_MINUTES="15"` no `.env.bot`. Para uso
real, mantenha `1440` para checagem diaria.

## Exemplos

```txt
gastei 25 no mercado
recebi 300 de freela hoje
paguei 120 da internet
```

O bot responde com a interpretacao e so salva apos `sim`.

Se a categoria nao existir, o bot pergunta antes de salvar. Voce pode responder:

- nome de uma categoria existente;
- `criar Nome da Categoria`;
- `sem categoria`;
- `nao` para cancelar.

## Seguranca

- `SUPABASE_SERVICE_ROLE_KEY` fica apenas na maquina do bot.
- O frontend nunca usa service role.
- O bot valida `telegram_links.status = active`.
- O token de vinculo e salvo apenas como hash.
- Tokens pendentes expiram em 15 minutos.
- Mensagens sao limitadas antes de salvar em `bot_pending_confirmations`.
