import { Bot } from "grammy";
import { botConfig } from "./config";
import { cancelPending, confirmationKeyboard, confirmPending, createPendingConfirmation,
  describeParsedTransaction, resolveLatestCategoryPrompt } from "./confirmations";
import { getActiveLink, linkTelegramAccount } from "./links";
import { logger } from "./logger";
import { parseBotIntent } from "./parser";
import { InMemoryRateLimiter } from "./rate-limit";
import { repository } from "./supabase";
import { getCurrentBalance, getMonthlySummary } from "./summary";
import { normalizeText } from "./utils";

export function createFluxoPayBot(token = botConfig.telegramBotToken) {
  const bot = new Bot(token);
  const limiter = new InMemoryRateLimiter(botConfig.rateLimitMaxRequests, botConfig.rateLimitWindowSeconds * 1000);
  bot.use(async (ctx, next) => {
    const key = String(ctx.from?.id ?? ctx.chat?.id ?? "unknown");
    if (!limiter.allow(key)) { await ctx.reply("Muitas solicitações em pouco tempo. Aguarde um instante."); return; }
    await next();
  });
  async function linked(ctx: Parameters<typeof getActiveLink>[0]) {
    const link = await getActiveLink(ctx);
    if (!link) await ctx.reply("Conecte seu Telegram em Configurações > Telegram no FluxoPay e envie /start TOKEN.");
    return link;
  }
  bot.command("start", async (ctx) => {
    const tokenValue = ctx.match?.trim();
    if (tokenValue) { await ctx.reply((await linkTelegramAccount(ctx, tokenValue)).message); return; }
    await ctx.reply(await getActiveLink(ctx) ? "Você já está conectado ao FluxoPay." : "Bem-vindo. Gere um token no FluxoPay e envie /start TOKEN.");
  });
  bot.command("vincular", async (ctx) => {
    const tokenValue = ctx.match?.trim();
    await ctx.reply(tokenValue ? (await linkTelegramAccount(ctx, tokenValue)).message : "Envie: /vincular SEU_TOKEN");
  });
  bot.command("ajuda", async (ctx) => { logger.info("bot_command", { command: "help", userId: ctx.from?.id }); return ctx.reply(["Você pode me enviar:", "“gastei 35 no pix com almoço”",
    "“recebi 500 hoje”", "“qual é meu saldo?”", "“resumo do mês”", "", "Eu sempre peço confirmação antes de salvar."].join("\n"));
  });
  bot.command("saldo", async (ctx) => { logger.info("bot_command", { command: "balance", userId: ctx.from?.id }); const link = await linked(ctx); if (link) await ctx.reply(await getCurrentBalance(link.telegram_user_id)); });
  bot.command("resumo", async (ctx) => { logger.info("bot_command", { command: "summary", userId: ctx.from?.id }); const link = await linked(ctx); if (link) await ctx.reply(await getMonthlySummary(link.user_id)); });

  bot.callbackQuery(/^(confirm|edit|cancel):([0-9a-f-]{36})$/, async (ctx) => {
    const link = await linked(ctx); if (!link) return;
    const [, action, id] = ctx.match;
    if (action === "confirm") {
      const result = await confirmPending(link, id);
      await ctx.answerCallbackQuery({ text: result.ok ? "Confirmado" : "Não confirmado" });
      await ctx.reply(result.message);
      if (result.ok) await ctx.editMessageReplyMarkup();
    }
    else if (action === "cancel") { await ctx.answerCallbackQuery({ text: await cancelPending(link, id) }); await ctx.editMessageReplyMarkup(); }
    else await ctx.answerCallbackQuery({ text: "Envie o novo nome da categoria ou “sem categoria”.", show_alert: true });
  });
  bot.on("message:text", async (ctx) => {
    const text = ctx.message.text.trim(); const normalized = normalizeText(text); const link = await linked(ctx); if (!link) return;
    if (["sim", "s", "confirmar", "confirma", "ok"].includes(normalized)) { await ctx.reply((await confirmPending(link)).message); return; }
    if (["nao", "n", "cancelar", "cancela"].includes(normalized)) { await ctx.reply(await cancelPending(link)); return; }
    const categoryReply = await resolveLatestCategoryPrompt(link, text);
    if (categoryReply.handled) { await ctx.reply(categoryReply.message); return; }
    let categories;
    try { categories = await repository.listCategories(link.user_id); } catch { await ctx.reply("Não consegui consultar suas categorias agora."); return; }
    const intent = parseBotIntent(text, { categories, maxAmountCents: botConfig.maxAmountCents, timezone: botConfig.timezone });
    logger.info("bot_intent", { intent: intent.type, userId: link.user_id });
    if (intent.type === "QUERY_BALANCE") { await ctx.reply(await getCurrentBalance(link.telegram_user_id)); return; }
    if (intent.type === "QUERY_SUMMARY") { await ctx.reply(await getMonthlySummary(link.user_id)); return; }
    if (intent.type !== "CREATE_TRANSACTION") {
      await ctx.reply(intent.type === "CREATE_CARD_PURCHASE" || intent.type === "CREATE_BILL"
        ? "Entendi o pedido, mas esse lançamento guiado será ativado na próxima etapa. Nada foi salvo."
        : intent.payload && "reason" in intent.payload && intent.payload.reason === "ambiguous_type"
          ? "Isso é uma entrada ou uma saída?" : "Não consegui interpretar com segurança. Veja /ajuda."); return;
    }
    const payload = intent.payload;
    if (payload.category_status !== "matched") {
      await createPendingConfirmation({ link, rawMessage: text, payload: { kind: "category_resolution",
        suggested_category_name: payload.category_candidate_name ?? payload.description, transaction: payload } });
      await ctx.reply(`Preciso confirmar a categoria. Envie o nome exato, “criar ${payload.category_candidate_name ?? payload.description}” ou “sem categoria”.`); return;
    }
    const pending = await createPendingConfirmation({ link, payload, rawMessage: text });
    await ctx.reply(`${describeParsedTransaction(payload)}\n\nConfirme, edite ou cancele.`, { reply_markup: confirmationKeyboard(pending.id) });
  });
  bot.catch((error) => logger.error("bot_update_failed", { error: error.error }));
  return bot;
}
