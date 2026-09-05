import type { Context } from "grammy";
import { repository } from "./supabase";
import type { ActiveTelegramLink } from "./repository";
import { hashTelegramLinkToken } from "./utils";
export type { ActiveTelegramLink } from "./repository";

export function getTelegramIdentity(ctx: Context) {
  if (!ctx.from || !ctx.chat) return null;
  return { chatId: ctx.chat.id, telegramUserId: ctx.from.id, username: ctx.from.username ?? null };
}
export async function getActiveLink(ctx: Context) {
  const identity = getTelegramIdentity(ctx); if (!identity) return null;
  const link = await repository.getActiveLink(identity.telegramUserId);
  if (link) await repository.touchLink(link, identity.chatId, identity.username);
  return link;
}
export async function linkTelegramAccount(ctx: Context, token: string) {
  const identity = getTelegramIdentity(ctx);
  if (!identity) return { ok: false, message: "Não consegui identificar seu usuário do Telegram." };
  try {
    const result = await repository.activateLink({ tokenHash: hashTelegramLinkToken(token), ...identity });
    return result.ok
      ? { ok: true, message: "Telegram conectado ao FluxoPay. Você já pode registrar e consultar suas finanças." }
      : { ok: false, message: "Token inválido ou expirado. Gere um novo token no FluxoPay." };
  } catch { return { ok: false, message: "Não consegui ativar o vínculo agora. Tente novamente." }; }
}
export function ownsTelegramIdentity(link: ActiveTelegramLink, telegramUserId: number) {
  return link.telegram_user_id === telegramUserId;
}
