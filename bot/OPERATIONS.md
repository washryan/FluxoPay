# Operação no ATLAS

## Pré-requisito obrigatório

Antes do primeiro start remoto, execute `npm run schema:check` com `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` fornecidos explicitamente. O comando é somente leitura/validação: chamadas de escrita recebem identificadores sentinela inválidos e não criam registros. Se qualquer objeto F2.1 estiver ausente, não inicie o bot e não aplique migration automaticamente.

## Secrets

Arquivos esperados, fora do repositório:

- `/data/atlas/secrets/fluxopay/bot.env`
- `/data/atlas/secrets/fluxopay/worker.env`

Diretório com modo `700`; arquivos com modo `600`; owner `ryan`. Nunca use `docker build --build-arg`, copie esses arquivos para a imagem ou mostre seu conteúdo em logs.

Variáveis mínimas em ambos: `TELEGRAM_BOT_TOKEN`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `BOT_TIMEZONE=America/Sao_Paulo` e `REMINDER_INTERVAL_MINUTES`. Copie também os limites documentados em `.env.bot.example`. No worker mantenha `WORKER_ENABLED=false` até autorização explícita para notificações reais.

## Build e operação

Execute a partir de `bot/`:

```bash
docker compose -f compose.atlas.yml build
docker compose -f compose.atlas.yml up -d bot worker
docker compose -f compose.atlas.yml ps
docker compose -f compose.atlas.yml logs --tail=100 bot
docker compose -f compose.atlas.yml restart bot
docker compose -f compose.atlas.yml stop bot worker
```

Nenhum serviço publica portas. A rede bridge fornece apenas o egress necessário. Os containers não montam Docker socket, executam como `node`, removem capabilities, usam root filesystem read-only e `/tmp` efêmero.

## Health

O healthcheck lê `/tmp/fluxopay-health.json` dentro do próprio container:

- bot: processo vivo, polling ativo e lease válido;
- worker habilitado: processo vivo, lease válido, ciclo atual, último sucesso e último erro sanitizado;
- worker desabilitado: processo vivo em estado `disabled`, sem envio.

Use `docker inspect fluxopay-bot --format '{{json .State.Health}}'`. O arquivo não contém secrets nem valores financeiros.

## Rotação e recuperação

Para rotacionar o token Telegram, altere somente `bot.env` e `worker.env` com modo `600`, depois recrie os containers. Não coloque o token em argumentos de build ou comandos compartilhados.

Um lease stale é assumido automaticamente depois de `BOT_LEASE_TTL_SECONDS`. Não apague a linha manualmente durante um incidente: confirme primeiro que nenhuma instância antiga ainda está viva. Para desabilitar notificações, defina `WORKER_ENABLED=false` e recrie apenas o worker.

Para atualizar: faça checkout de commit revisado, rode testes, reconstrua a imagem e recrie os serviços. Rollback consiste em reconstruir o commit anterior; migrations nunca são aplicadas por este Compose.

## Testes operacionais pendentes de credenciais autorizadas

Após schema check aprovado: vincular uma conta real, validar `/start`, `/ajuda`, `/saldo` e `/resumo`, testar uma segunda instância, reiniciar o bot e comparar `/saldo` com o dashboard. Não habilite o worker antes de autorização explícita.
