import { Bot } from "grammy";

import {
  cancelLatestPending,
  confirmLatestPending,
  createPendingConfirmation,
  describeParsedTransaction,
  resolveLatestCategoryPrompt,
} from "./confirmations";
import { botConfig } from "./config";
import { getActiveLink, linkTelegramAccount } from "./links";
import { startNotificationWorker } from "./notifications";
import { parseFinancialMessage } from "./parser";
import { getMonthlySummary } from "./summary";
import { normalizeText } from "./utils";

const bot = new Bot(botConfig.telegramBotToken);

async function requireActiveLink(ctx: Parameters<typeof getActiveLink>[0]) {
  const link = await getActiveLink(ctx);

  if (!link) {
    await ctx.reply(
      "Seu Telegram ainda não está conectado ao FluxoPay. Gere um token no site em Configurações > Telegram e envie /start TOKEN aqui.",
    );
    return null;
  }

  return link;
}

bot.command("start", async (ctx) => {
  const token = ctx.match?.trim();

  if (token) {
    const result = await linkTelegramAccount(ctx, token);
    await ctx.reply(result.message);
    return;
  }

  const link = await getActiveLink(ctx);

  if (link) {
    await ctx.reply(
      "Você já está conectado ao FluxoPay. Envie algo como: gastei 25 no mercado.",
    );
    return;
  }

  await ctx.reply(
    "Bem-vindo ao FluxoPay. Gere um token no site em Configurações > Telegram e envie /start TOKEN aqui para conectar.",
  );
});

bot.command("vincular", async (ctx) => {
  const token = ctx.match?.trim();

  if (!token) {
    await ctx.reply("Envie assim: /vincular SEU_TOKEN");
    return;
  }

  const result = await linkTelegramAccount(ctx, token);
  await ctx.reply(result.message);
});

bot.command("ajuda", async (ctx) => {
  await ctx.reply(
    [
      "Comandos disponíveis:",
      "/start TOKEN - conectar sua conta",
      "/vincular TOKEN - conectar sua conta",
      "/saldo - saldo do mês",
      "/resumo - resumo do mês",
      "",
      "Exemplos:",
      "gastei 25 no mercado",
      "recebi 300 de freela hoje",
      "paguei 120 da internet",
      "",
      "Depois eu peço confirmação antes de salvar.",
    ].join("\n"),
  );
});

bot.command(["saldo", "resumo"], async (ctx) => {
  const link = await requireActiveLink(ctx);

  if (!link) {
    return;
  }

  await ctx.reply(await getMonthlySummary(link.user_id));
});

bot.on("message:text", async (ctx) => {
  const text = ctx.message.text.trim();
  const normalized = normalizeText(text);
  const link = await requireActiveLink(ctx);

  if (!link) {
    return;
  }

  if (["sim", "s", "confirmar", "confirma", "ok"].includes(normalized)) {
    const result = await confirmLatestPending(link);
    await ctx.reply(result.message);
    return;
  }

  if (["nao", "não", "n", "cancelar", "cancela"].includes(normalized)) {
    await ctx.reply(await cancelLatestPending(link));
    return;
  }

  const categoryResolution = await resolveLatestCategoryPrompt(link, text);

  if (categoryResolution.handled) {
    await ctx.reply(categoryResolution.message);
    return;
  }

  const parsed = await parseFinancialMessage(link.user_id, text);

  if (parsed.error || !parsed.payload) {
    await ctx.reply(parsed.error ?? "Não consegui interpretar essa mensagem.");
    return;
  }

  if (parsed.payload.category_status === "missing") {
    const suggestedCategory =
      parsed.payload.category_candidate_name ?? parsed.payload.description;
    const pendingError = await createPendingConfirmation({
      link,
      payload: {
        kind: "category_resolution",
        suggested_category_name: suggestedCategory,
        transaction: parsed.payload,
      },
      rawMessage: text,
    });

    if (pendingError) {
      await ctx.reply("Não consegui criar a confirmação. Tente novamente.");
      return;
    }

    await ctx.reply(
      [
        `Não encontrei uma categoria para "${suggestedCategory}".`,
        "Se você escreveu errado, envie o nome de uma categoria existente.",
        `Se quiser criar uma nova, responda: criar ${suggestedCategory}.`,
        "Ou responda: sem categoria.",
      ].join("\n"),
    );
    return;
  }

  const pendingError = await createPendingConfirmation({
    link,
    payload: parsed.payload,
    rawMessage: text,
  });

  if (pendingError) {
    await ctx.reply("Não consegui criar a confirmação. Tente novamente.");
    return;
  }

  await ctx.reply(
    `${describeParsedTransaction(parsed.payload)}\n\nResponda sim para salvar ou não para cancelar.`,
  );
});

bot.catch((error) => {
  console.error("Bot error", {
    error: error.error instanceof Error ? error.error.message : error.error,
  });
});

console.log("FluxoPay Telegram bot running with long polling.");
startNotificationWorker(bot);
bot.start();
