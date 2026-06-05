import type { Context } from "grammy";

import { supabase } from "./supabase";
import { hashTelegramLinkToken } from "./utils";

export type ActiveTelegramLink = {
  id: string;
  user_id: string;
  telegram_user_id: number;
  telegram_chat_id: number | null;
  telegram_username: string | null;
};

function getTelegramIdentity(ctx: Context) {
  const telegramUser = ctx.from;
  const chat = ctx.chat;

  if (!telegramUser || !chat) {
    return null;
  }

  return {
    chatId: chat.id,
    telegramUserId: telegramUser.id,
    username: telegramUser.username ?? null,
  };
}

export async function getActiveLink(ctx: Context) {
  const identity = getTelegramIdentity(ctx);

  if (!identity) {
    return null;
  }

  const { data, error } = await supabase
    .from("telegram_links")
    .select(
      "id, user_id, telegram_user_id, telegram_chat_id, telegram_username",
    )
    .eq("telegram_user_id", identity.telegramUserId)
    .eq("status", "active")
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  await supabase
    .from("telegram_links")
    .update({
      last_seen_at: new Date().toISOString(),
      telegram_chat_id: identity.chatId,
      telegram_username: identity.username,
    })
    .eq("id", data.id);

  return data as ActiveTelegramLink;
}

export async function linkTelegramAccount(ctx: Context, token: string) {
  const identity = getTelegramIdentity(ctx);

  if (!identity) {
    return {
      ok: false,
      message: "Não consegui identificar seu usuário do Telegram.",
    };
  }

  const tokenHash = hashTelegramLinkToken(token);
  const { data: pendingLink, error } = await supabase
    .from("telegram_links")
    .select("id, user_id, link_token_expires_at")
    .eq("link_token_hash", tokenHash)
    .eq("status", "pending")
    .gt("link_token_expires_at", new Date().toISOString())
    .maybeSingle();

  if (error || !pendingLink) {
    return {
      ok: false,
      message:
        "Token inválido ou expirado. Gere um novo token no site e tente novamente.",
    };
  }

  await supabase
    .from("telegram_links")
    .update({ status: "revoked", revoked_at: new Date().toISOString() })
    .eq("telegram_user_id", identity.telegramUserId)
    .eq("status", "active");

  await supabase
    .from("telegram_links")
    .update({ status: "revoked", revoked_at: new Date().toISOString() })
    .eq("user_id", pendingLink.user_id)
    .eq("status", "active");

  const { error: updateError } = await supabase
    .from("telegram_links")
    .update({
      telegram_user_id: identity.telegramUserId,
      telegram_chat_id: identity.chatId,
      telegram_username: identity.username,
      status: "active",
      linked_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      link_token_hash: null,
    })
    .eq("id", pendingLink.id)
    .eq("status", "pending");

  if (updateError) {
    return {
      ok: false,
      message:
        "Não consegui ativar o vínculo. Verifique se essa conta já não está vinculada.",
    };
  }

  return {
    ok: true,
    message:
      "Telegram conectado ao FluxoPay. Agora você pode enviar mensagens como: gastei 25 no mercado.",
  };
}
