# FluxoPay Bot 2.0

Interface conversacional determinística do FluxoPay, preparada para execução 24/7 no ATLAS. O bot nunca grava uma movimentação interpretada de linguagem natural sem confirmação explícita.

## Processos

- `npm start`: interações Telegram por long polling, com lease `telegram_polling`.
- `npm run worker`: lembretes e relatórios em loop sequencial, com lease `notification_worker`.

Os processos são independentes e compartilham configuração, repositórios, leases, parser e logging. Não é preciso expor portas. O lease persistente impede uma segunda instância de operar enquanto a primeira estiver saudável.

## Ambiente

Copie `.env.bot.example` para `.env.bot` somente no host de execução. Nunca use prefixo `NEXT_PUBLIC_` para o token do Telegram ou a chave service role. A chave privilegiada chama somente RPCs internas com `EXECUTE` revogado para `anon` e `authenticated`.

## Confirmações e vínculo

`confirm_bot_transaction` bloqueia a confirmação, revalida vínculo, ownership, expiração e payload, cria no máximo uma transaction e guarda seu ID na mesma transação PostgreSQL. Retries devolvem a mesma transaction.

`activate_telegram_link` consome o hash de token uma única vez e substitui vínculos anteriores atomicamente. Tokens crus não são persistidos pelo bot nem registrados em log.

## Notificações

O worker reserva uma dedupe key antes de chamar o Telegram. Uma resposta explícita transitória pode receber retry limitado com backoff. Falha de rede com resultado remoto desconhecido vira `ambiguous` e não recebe retry automático: PostgreSQL e Telegram não formam uma transação distribuída, portanto não há promessa falsa de exactly-once.

## Desenvolvimento seguro

```bash
cd bot
npm ci
npm test
npm run typecheck
npm run build
```

Use apenas Supabase local e token Telegram fictício nos testes. A suíte não chama a API real.

## Comandos atuais

- `/start TOKEN` e `/vincular TOKEN`
- `/ajuda`
- `/saldo`: saldo realizado atual (opening balance + ledger até hoje)
- `/resumo`: entradas e saídas do mês

Criação conversacional de transaction está habilitada com confirmação. Intents de conta e compra parcelada já são tipadas, mas permanecem sem persistência até reutilizarem operações financeiras oficiais em fase posterior.
