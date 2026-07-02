import type { ActiveTelegramLink } from "./links";
import type { Category, ParsedTransaction } from "./parser";
import { supabase } from "./supabase";
import { formatCurrencyFromCents, normalizeText, slugify } from "./utils";

type CategoryResolutionPayload = {
  kind: "category_resolution";
  suggested_category_name: string;
  transaction: ParsedTransaction;
};

type PendingPayload = ParsedTransaction | CategoryResolutionPayload;

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
  payload: PendingPayload;
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

async function getLatestPending(link: ActiveTelegramLink) {
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
    return null;
  }

  return {
    id: data.id as string,
    payload: data.parsed_payload as PendingPayload,
  };
}

function categoryTypeFromTransaction(type: ParsedTransaction["type"]) {
  return type === "income" ? "income" : "expense";
}

async function findCategoryByText(userId: string, text: string, type: string) {
  const normalized = normalizeText(text);
  const { data } = await supabase
    .from("categories")
    .select("id, name, slug, type")
    .eq("user_id", userId)
    .in("type", [type, "both"]);
  const categories = (data ?? []) as Category[];

  return (
    categories.find(
      (category) =>
        normalizeText(category.name) === normalized ||
        normalizeText(category.slug) === normalized,
    ) ??
    categories.find(
      (category) =>
        normalizeText(category.name).includes(normalized) ||
        normalized.includes(normalizeText(category.name)) ||
        normalizeText(category.slug).includes(normalized),
    ) ??
    null
  );
}

async function createCategory({
  name,
  transaction,
  userId,
}: {
  name: string;
  transaction: ParsedTransaction;
  userId: string;
}) {
  const cleanName = name.trim().slice(0, 80);
  const slug = slugify(cleanName);
  const existing = await findCategoryByText(
    userId,
    cleanName,
    transaction.type,
  );

  if (existing) {
    return existing;
  }

  const { data, error } = await supabase
    .from("categories")
    .insert({
      user_id: userId,
      name: cleanName,
      slug,
      color: transaction.type === "income" ? "#10b981" : "#64748b",
      icon: "circle",
      type: categoryTypeFromTransaction(transaction.type),
      is_default: false,
    })
    .select("id, name, slug, type")
    .single();

  if (error || !data) {
    return null;
  }

  return data as Category;
}

async function updatePendingTransactionCategory({
  category,
  pendingId,
  transaction,
}: {
  category: Category | null;
  pendingId: string;
  transaction: ParsedTransaction;
}) {
  const updated: ParsedTransaction = {
    ...transaction,
    category_id: category?.id ?? null,
    category_name: category?.name ?? null,
    category_candidate_name: null,
    category_status: "matched",
  };

  const { error } = await supabase
    .from("bot_pending_confirmations")
    .update({ parsed_payload: updated })
    .eq("id", pendingId);

  if (error) {
    return "Não consegui atualizar a confirmação. Tente novamente.";
  }

  return `${describeParsedTransaction(updated)}\n\nResponda sim para salvar ou não para cancelar.`;
}

function categoryNameFromCreateCommand(message: string, fallback: string) {
  const clean = message
    .replace(/^criar\s+(categoria\s+)?/i, "")
    .replace(/^nova\s+(categoria\s+)?/i, "")
    .trim();

  return clean || fallback;
}

function wantsCreateCategory(normalized: string) {
  return ["criar", "criar categoria", "nova", "nova categoria"].includes(
    normalized,
  ) || normalized.startsWith("criar ") || normalized.startsWith("nova ");
}

function wantsNoCategory(normalized: string) {
  return [
    "sem categoria",
    "sem",
    "nenhuma",
    "salvar sem categoria",
    "ignorar categoria",
  ].includes(normalized);
}

export async function resolveLatestCategoryPrompt(
  link: ActiveTelegramLink,
  message: string,
) {
  const pending = await getLatestPending(link);

  if (!pending || pending.payload.kind !== "category_resolution") {
    return { handled: false, message: "" };
  }

  const normalized = normalizeText(message);
  const { suggested_category_name: suggestedName, transaction } =
    pending.payload;

  if (wantsNoCategory(normalized)) {
    return {
      handled: true,
      message: await updatePendingTransactionCategory({
        category: null,
        pendingId: pending.id,
        transaction,
      }),
    };
  }

  if (wantsCreateCategory(normalized)) {
    const category = await createCategory({
      name: categoryNameFromCreateCommand(message, suggestedName),
      transaction,
      userId: link.user_id,
    });

    if (!category) {
      return {
        handled: true,
        message: "Não consegui criar a categoria agora. Tente outro nome.",
      };
    }

    return {
      handled: true,
      message: await updatePendingTransactionCategory({
        category,
        pendingId: pending.id,
        transaction,
      }),
    };
  }

  const category = await findCategoryByText(
    link.user_id,
    message,
    transaction.type,
  );

  if (category) {
    return {
      handled: true,
      message: await updatePendingTransactionCategory({
        category,
        pendingId: pending.id,
        transaction,
      }),
    };
  }

  return {
    handled: true,
    message: [
      `Não encontrei a categoria "${message}".`,
      `Se você escreveu errado, envie o nome de uma categoria existente.`,
      `Se quiser criar, responda: criar ${suggestedName}.`,
      "Ou responda: sem categoria.",
    ].join("\n"),
  };
}

export async function confirmLatestPending(link: ActiveTelegramLink) {
  const pending = await getLatestPending(link);

  if (!pending) {
    return {
      ok: false,
      message: "Não encontrei nenhuma confirmação pendente.",
    };
  }

  const payload = pending.payload;

  if (payload.kind === "category_resolution") {
    return {
      ok: false,
      message:
        "Antes de salvar, preciso resolver a categoria. Envie o nome correto, responda criar categoria ou sem categoria.",
    };
  }

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
    .eq("id", pending.id);

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
