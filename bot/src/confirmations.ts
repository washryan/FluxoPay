import type { ActiveTelegramLink } from "./links";
import type { ParsedTransaction } from "./parser";
import { supabase } from "./supabase";
import { formatCurrencyFromCents } from "./utils";

export function describeParsedTransaction(payload: ParsedTransaction) {
  const typeLabel = payload.type === "income" ? "entrada" : "saída";
  const category = payload.category_name
    ? ` na categoria ${payload.category_name}`
    : "";

  return `${typeLabel} de ${formatCurrencyFromCents(payload.amount_cents)}${category}. Descrição: ${payload.description}. Confirmar?`;
}

export async function createPendingConfirmation({
  link,
  payload,
  rawMessage,
}: {
  link: ActiveTelegramLink;
  payload: ParsedTransaction;
  rawMessage: string;
}) {
  await supabase
    .from("bot_pending_confirmations")
    .update({ status: "expired" })
    .eq("telegram_link_id", link.id)
    .eq("status", "pending")
    .lt("expires_at", new Date().toISOString());

  const { error } = await supabase.from("bot_pending_confirmations").insert({
    user_id: link.user_id,
    telegram_link_id: link.id,
    raw_message: rawMessage.slice(0, 500),
    parsed_payload: payload,
    status: "pending",
  });

  return error;
}

export async function confirmLatestPending(link: ActiveTelegramLink) {
  const { data, error } = await supabase
    .from("bot_pending_confirmations")
    .select("id, parsed_payload, expires_at")
    .eq("telegram_link_id", link.id)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return {
      ok: false,
      message: "Não encontrei nenhuma confirmação pendente.",
    };
  }

  const payload = data.parsed_payload as ParsedTransaction;

  if (payload.kind !== "transaction") {
    return {
      ok: false,
      message: "Essa confirmação ainda não é suportada pelo bot.",
    };
  }

  const { error: transactionError } = await supabase.from("transactions").insert({
    user_id: link.user_id,
    type: payload.type,
    amount_cents: payload.amount_cents,
    description: payload.description,
    category_id: payload.category_id,
    payment_method: payload.payment_method,
    transaction_date: payload.transaction_date,
    source: "telegram",
  });

  if (transactionError) {
    return {
      ok: false,
      message: "Não consegui salvar a movimentação no Supabase.",
    };
  }

  await supabase
    .from("bot_pending_confirmations")
    .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
    .eq("id", data.id);

  return {
    ok: true,
    message: "Movimentação salva no FluxoPay.",
  };
}

export async function cancelLatestPending(link: ActiveTelegramLink) {
  const { error } = await supabase
    .from("bot_pending_confirmations")
    .update({ status: "cancelled" })
    .eq("telegram_link_id", link.id)
    .eq("status", "pending");

  if (error) {
    return "Não consegui cancelar a confirmação pendente.";
  }

  return "Combinado, não salvei essa movimentação.";
}
