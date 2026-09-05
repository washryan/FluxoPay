import type { SupabaseClient } from "@supabase/supabase-js";

import type { Category } from "./parser";

export type ActiveTelegramLink = {
  id: string;
  user_id: string;
  telegram_user_id: number;
  telegram_chat_id: number | null;
  telegram_username: string | null;
};

export type PendingConfirmation = {
  id: string;
  parsed_payload: unknown;
  expires_at: string;
};

function fail(operation: string, error: { message: string } | null) {
  if (error) throw new Error(`${operation}: ${error.message}`);
}

export class BotRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getActiveLink(telegramUserId: number) {
    const { data, error } = await this.client.from("telegram_links")
      .select("id, user_id, telegram_user_id, telegram_chat_id, telegram_username")
      .eq("telegram_user_id", telegramUserId).eq("status", "active").maybeSingle();
    fail("get active Telegram link", error);
    return data as ActiveTelegramLink | null;
  }

  async touchLink(link: ActiveTelegramLink, chatId: number, username: string | null) {
    const { error } = await this.client.from("telegram_links").update({
      last_seen_at: new Date().toISOString(), telegram_chat_id: chatId,
      telegram_username: username,
    }).eq("id", link.id).eq("user_id", link.user_id)
      .eq("telegram_user_id", link.telegram_user_id).eq("status", "active");
    fail("touch Telegram link", error);
  }

  async activateLink(input: { tokenHash: string; telegramUserId: number; chatId: number; username: string | null }) {
    const { data, error } = await this.client.rpc("activate_telegram_link", {
      p_token_hash: input.tokenHash, p_telegram_user_id: input.telegramUserId,
      p_telegram_chat_id: input.chatId, p_telegram_username: input.username,
    });
    fail("activate Telegram link", error);
    return data as { ok: boolean; code?: string; link_id?: string; user_id?: string };
  }

  async listCategories(userId: string, type?: "income" | "expense") {
    let query = this.client.from("categories").select("id, name, slug, type").eq("user_id", userId);
    if (type) query = query.in("type", [type, "both"]);
    const { data, error } = await query;
    fail("list user categories", error);
    return (data ?? []) as Category[];
  }

  async createCategory(userId: string, category: { name: string; slug: string; type: "income" | "expense" }) {
    const { data, error } = await this.client.from("categories").insert({
      user_id: userId, name: category.name, slug: category.slug, type: category.type,
      color: category.type === "income" ? "#10b981" : "#64748b", icon: "circle", is_default: false,
    }).select("id, name, slug, type").single();
    fail("create user category", error);
    return data as Category;
  }

  async createPending(link: ActiveTelegramLink, payload: unknown, rawMessage: string) {
    const { data, error } = await this.client.from("bot_pending_confirmations").insert({
      user_id: link.user_id, telegram_link_id: link.id,
      raw_message: rawMessage.slice(0, 500), parsed_payload: payload, status: "pending",
    }).select("id, parsed_payload, expires_at").single();
    fail("create pending confirmation", error);
    return data as PendingConfirmation;
  }

  async latestPending(link: ActiveTelegramLink) {
    const { data, error } = await this.client.from("bot_pending_confirmations")
      .select("id, parsed_payload, expires_at").eq("user_id", link.user_id)
      .eq("telegram_link_id", link.id).eq("status", "pending")
      .gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false })
      .limit(1).maybeSingle();
    fail("get pending confirmation", error);
    return data as PendingConfirmation | null;
  }

  async updatePendingPayload(link: ActiveTelegramLink, pendingId: string, payload: unknown) {
    const { data, error } = await this.client.from("bot_pending_confirmations")
      .update({ parsed_payload: payload }).eq("id", pendingId).eq("user_id", link.user_id)
      .eq("telegram_link_id", link.id).eq("status", "pending").select("id").maybeSingle();
    fail("update pending confirmation", error);
    return Boolean(data);
  }

  async cancelPending(link: ActiveTelegramLink, pendingId: string) {
    const { data, error } = await this.client.from("bot_pending_confirmations")
      .update({ status: "cancelled" }).eq("id", pendingId).eq("user_id", link.user_id)
      .eq("telegram_link_id", link.id).eq("status", "pending").select("id").maybeSingle();
    fail("cancel pending confirmation", error);
    return Boolean(data);
  }

  async confirmTransaction(pendingId: string, telegramUserId: number) {
    const { data, error } = await this.client.rpc("confirm_bot_transaction", {
      p_confirmation_id: pendingId, p_telegram_user_id: telegramUserId,
    });
    fail("confirm bot transaction", error);
    return data as { ok: boolean; code?: string; already_confirmed?: boolean; transaction_id?: string };
  }

  async currentBalance(telegramUserId: number) {
    const { data, error } = await this.client.rpc("get_bot_current_balance", {
      p_telegram_user_id: telegramUserId,
    });
    fail("get current balance", error);
    return data === null ? null : Number(data);
  }

  async acquireLease(key: string, ownerId: string, ttlSeconds: number, metadata = {}) {
    const { data, error } = await this.client.rpc("acquire_process_lease", {
      p_lease_key: key, p_owner_id: ownerId, p_ttl_seconds: ttlSeconds, p_metadata: metadata,
    });
    fail("acquire process lease", error); return data === true;
  }
  async heartbeatLease(key: string, ownerId: string, ttlSeconds: number) {
    const { data, error } = await this.client.rpc("heartbeat_process_lease", {
      p_lease_key: key, p_owner_id: ownerId, p_ttl_seconds: ttlSeconds,
    });
    fail("heartbeat process lease", error); return data === true;
  }
  async releaseLease(key: string, ownerId: string) {
    const { data, error } = await this.client.rpc("release_process_lease", {
      p_lease_key: key, p_owner_id: ownerId,
    });
    fail("release process lease", error); return data === true;
  }

  async reserveNotification(input: {
    userId: string; linkId: string; type: string; dedupeKey: string; ownerId: string;
    reservationSeconds: number; maxAttempts: number; referenceTable?: string; referenceId?: string;
  }) {
    const { data, error } = await this.client.rpc("reserve_notification_delivery", {
      p_user_id: input.userId, p_telegram_link_id: input.linkId,
      p_notification_type: input.type, p_dedupe_key: input.dedupeKey,
      p_owner_id: input.ownerId, p_reservation_seconds: input.reservationSeconds,
      p_max_attempts: input.maxAttempts, p_reference_table: input.referenceTable ?? null,
      p_reference_id: input.referenceId ?? null,
    });
    fail("reserve notification", error);
    return data as { claimed: boolean; code?: string; claim_id?: string; attempt?: number };
  }

  async completeNotification(input: { claimId: string; ownerId: string; outcome: "sent" | "failed" | "ambiguous"; error?: string; nextRetryAt?: string }) {
    const { data, error } = await this.client.rpc("complete_notification_delivery", {
      p_claim_id: input.claimId, p_owner_id: input.ownerId, p_outcome: input.outcome,
      p_error: input.error?.slice(0, 500) ?? null, p_next_retry_at: input.nextRetryAt ?? null,
    });
    fail("complete notification", error); return data === true;
  }
}
