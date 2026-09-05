import { InlineKeyboard } from "grammy";
import type { ActiveTelegramLink } from "./repository";
import type { Category, ParsedTransaction } from "./parser";
import { repository } from "./supabase";
import { formatCurrencyFromCents, normalizeText, slugify } from "./utils";

export type CategoryResolutionPayload = { kind: "category_resolution"; suggested_category_name: string; transaction: ParsedTransaction };
export type PendingPayload = ParsedTransaction | CategoryResolutionPayload;

export function confirmationKeyboard(id: string) {
  return new InlineKeyboard().text("Confirmar", `confirm:${id}`).text("Editar", `edit:${id}`).text("Cancelar", `cancel:${id}`);
}
export function describeParsedTransaction(payload: ParsedTransaction) {
  return [payload.type === "income" ? "Entrada" : "Saída", formatCurrencyFromCents(payload.amount_cents),
    payload.description, payload.category_name ? `Categoria: ${payload.category_name}` : "Sem categoria",
    `Data: ${payload.transaction_date}`].join("\n");
}
export async function createPendingConfirmation(input: { link: ActiveTelegramLink; payload: PendingPayload; rawMessage: string }) {
  return repository.createPending(input.link, input.payload, input.rawMessage);
}
function payloadOf(pending: { parsed_payload: unknown }) { return pending.parsed_payload as PendingPayload; }

export async function confirmPending(link: ActiveTelegramLink, pendingId?: string) {
  const pending = pendingId ? { id: pendingId, parsed_payload: null } : await repository.latestPending(link);
  if (!pending) return { ok: false, message: "Não encontrei nenhuma confirmação pendente." };
  if (!pendingId && payloadOf(pending).kind === "category_resolution") return { ok: false, message: "Escolha uma categoria ou responda “sem categoria” antes de confirmar." };
  try {
    const result = await repository.confirmTransaction(pending.id, link.telegram_user_id);
    if (result.ok) return { ok: true, transactionId: result.transaction_id,
      message: result.already_confirmed ? "Essa movimentação já estava salva." : "Movimentação salva no FluxoPay." };
    const messages: Record<string, string> = { confirmation_expired: "Essa confirmação expirou. Envie a movimentação novamente.",
      confirmation_not_pending: "Essa confirmação já foi encerrada.", active_link_not_found: "Seu vínculo não está ativo.",
      category_not_owned: "A categoria selecionada não pertence à sua conta.", invalid_payload: "A confirmação contém dados inválidos." };
    return { ok: false, message: messages[result.code ?? ""] ?? "Não consegui confirmar essa movimentação." };
  } catch { return { ok: false, message: "Não consegui confirmar agora. Tente novamente." }; }
}
export async function cancelPending(link: ActiveTelegramLink, pendingId?: string) {
  const pending = pendingId ? { id: pendingId } : await repository.latestPending(link);
  if (!pending) return "Não encontrei nenhuma confirmação pendente.";
  try { return await repository.cancelPending(link, pending.id) ? "Combinado, não salvei essa movimentação." : "Essa confirmação já foi encerrada."; }
  catch { return "Não consegui cancelar a confirmação pendente."; }
}
async function findCategory(userId: string, text: string, type: ParsedTransaction["type"]) {
  const normalized = normalizeText(text); const categories = await repository.listCategories(userId, type);
  const exact = categories.filter((item) => [item.name, item.slug].some((v) => normalizeText(v) === normalized));
  if (exact.length === 1) return exact[0];
  const partial = categories.filter((item) => [item.name, item.slug].some((v) => normalizeText(v).includes(normalized)));
  return partial.length === 1 ? partial[0] : null;
}
async function setCategory(link: ActiveTelegramLink, pendingId: string, transaction: ParsedTransaction, category: Category | null) {
  const updated = { ...transaction, category_id: category?.id ?? null, category_name: category?.name ?? null,
    category_candidate_name: null, category_status: "matched" as const };
  return await repository.updatePendingPayload(link, pendingId, updated)
    ? `${describeParsedTransaction(updated)}\n\nConfirme ou cancele.` : "Não consegui atualizar a confirmação.";
}
export async function resolveLatestCategoryPrompt(link: ActiveTelegramLink, message: string) {
  const pending = await repository.latestPending(link);
  if (!pending || payloadOf(pending).kind !== "category_resolution") return { handled: false, message: "" };
  const payload = payloadOf(pending) as CategoryResolutionPayload; const normalized = normalizeText(message);
  if (["sem", "nenhuma", "sem categoria", "salvar sem categoria"].includes(normalized)) return { handled: true, message: await setCategory(link, pending.id, payload.transaction, null) };
  let category = await findCategory(link.user_id, message, payload.transaction.type);
  if (!category && (normalized.startsWith("criar ") || normalized.startsWith("nova "))) {
    const name = message.replace(/^(criar|nova)\s+(categoria\s+)?/i, "").trim().slice(0, 80) || payload.suggested_category_name;
    try { category = await repository.createCategory(link.user_id, { name, slug: slugify(name), type: payload.transaction.type }); } catch { category = null; }
  }
  if (category) return { handled: true, message: await setCategory(link, pending.id, payload.transaction, category) };
  return { handled: true, message: "Não encontrei uma opção inequívoca. Envie o nome exato, “criar NOME” ou “sem categoria”." };
}
