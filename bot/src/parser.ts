import type { BotIntent, PaymentMethod, TransactionDraft } from "./intents";
import { addDays, normalizeText, parseCurrencyToCents, today } from "./utils";

export type Category = { id: string; name: string; slug: string; type: "income" | "expense" | "both" };
export type ParsedTransaction = TransactionDraft;
export type ParseContext = { categories?: Category[]; maxAmountCents?: number; now?: Date; timezone?: string };

const incomeWords = ["recebi", "ganhei", "salario", "caiu", "deposito", "renda", "entrada"];
const expenseWords = ["gastei", "paguei", "comprei", "despesa", "saida"];
const months: Record<string, number> = {
  janeiro: 1, fevereiro: 2, marco: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
};
const stopWords = new Set([
  ...incomeWords, ...expenseWords, "hoje", "ontem", "amanha", "real", "reais",
  "no", "na", "nos", "nas", "em", "de", "do", "da", "dos", "das", "com",
  "por", "via", "pix", "dinheiro", "debito", "transferencia", "ted",
]);

function extractMoney(message: string, max?: number) {
  const withoutDates = message.replace(/\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g, " ");
  const match = withoutDates.match(/(?:r\$\s*)?(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{1,2})?(?:\s*reais?)?/i);
  return match ? parseCurrencyToCents(match[0], max) : null;
}

function detectType(message: string) {
  const normalized = normalizeText(message);
  const income = incomeWords.some((word) => normalized.includes(word));
  const expense = expenseWords.some((word) => normalized.includes(word));
  return income === expense ? null : income ? "income" as const : "expense" as const;
}

function detectPaymentMethod(message: string): PaymentMethod {
  const normalized = normalizeText(message);
  if (normalized.includes("pix")) return "pix";
  if (normalized.includes("dinheiro")) return "cash";
  if (normalized.includes("debito")) return "debit_card";
  if (normalized.includes("transferencia") || normalized.includes("ted")) return "bank_transfer";
  return "other";
}

function validCivilDate(year: number, month: number, day: number) {
  const value = new Date(Date.UTC(year, month - 1, day));
  return value.getUTCFullYear() === year && value.getUTCMonth() === month - 1 && value.getUTCDate() === day;
}

export function parseFinancialDate(message: string, context: ParseContext = {}) {
  const base = today(context.now, context.timezone);
  const normalized = normalizeText(message);
  if (/\bontem\b/.test(normalized)) return addDays(base, -1);
  if (/\bamanha\b/.test(normalized)) return addDays(base, 1);
  if (/\bhoje\b/.test(normalized)) return base;
  const [currentYear] = base.split("-").map(Number);
  const numeric = normalized.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (numeric) {
    const year = numeric[3] ? Number(numeric[3].length === 2 ? `20${numeric[3]}` : numeric[3]) : currentYear;
    const month = Number(numeric[2]);
    const day = Number(numeric[1]);
    return validCivilDate(year, month, day) ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` : null;
  }
  const textual = normalized.match(/\b(\d{1,2})\s+de\s+([a-z]+)(?:\s+de\s+(\d{4}))?\b/);
  if (textual) {
    const year = textual[3] ? Number(textual[3]) : currentYear;
    const month = months[textual[2]];
    const day = Number(textual[1]);
    return month && validCivilDate(year, month, day) ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` : null;
  }
  return base;
}

function resolveCategory(categories: Category[], message: string, type: "income" | "expense") {
  const normalized = normalizeText(message);
  const aliases: Record<string, string[]> = {
    alimentacao: ["almoco", "jantar", "lanche", "restaurante", "comida"],
    transporte: ["uber", "onibus", "gasolina", "combustivel"],
  };
  const matches = categories.filter((category) => {
    if (category.type !== type && category.type !== "both") return false;
    return [category.name, category.slug, ...(aliases[normalizeText(category.slug)] ?? [])]
      .some((key) => normalized.includes(normalizeText(key)));
  });
  return matches.length === 1
    ? { status: "matched" as const, category: matches[0] }
    : matches.length > 1
      ? { status: "ambiguous" as const, category: null }
      : { status: "missing" as const, category: null };
}

function buildDescription(message: string, amountCents: number) {
  const clean = message
    .replace(/(?:r\$\s*)?(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{1,2})?(?:\s*reais?)?/i, "")
    .split(/\s+/)
    .filter((word) => {
      const normalized = normalizeText(word.replace(/[^\p{L}\p{N}-]/gu, ""));
      return normalized && !stopWords.has(normalized) && !/^\d+x$/.test(normalized);
    })
    .join(" ")
    .trim();
  if (!clean) return `Movimentação de ${amountCents} centavos pelo Telegram`;
  return clean.split(" ").map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase()).join(" ").slice(0, 180);
}

export function parseBotIntent(message: string, context: ParseContext = {}): BotIntent {
  const sanitized = message.trim().slice(0, 500);
  const normalized = normalizeText(sanitized);
  if (/^(ajuda|help|\/ajuda)$/.test(normalized)) return { type: "HELP", payload: {} };
  if (/\b(saldo|quanto tenho)\b/.test(normalized)) return { type: "QUERY_BALANCE", payload: {} };
  if (/\bresumo\b/.test(normalized)) return { type: "QUERY_SUMMARY", payload: { period: normalized.includes("seman") ? "week" : "month" } };
  if (/\b(cartoes|cartao)\b/.test(normalized) && /\b(quais|listar|meus)\b/.test(normalized)) return { type: "QUERY_CARDS", payload: {} };
  if (/\b(vence|vencimentos)\b/.test(normalized)) return { type: "QUERY_DUE_ITEMS", payload: { period: normalized.includes("mes") ? "month" : "week" } };

  const amountCents = extractMoney(sanitized, context.maxAmountCents);
  if (!amountCents) return { type: "UNKNOWN", payload: { reason: "invalid_amount" } };
  const transactionDate = parseFinancialDate(sanitized, context);
  if (!transactionDate) return { type: "UNKNOWN", payload: { reason: "unsupported" } };
  const installments = normalized.match(/\b(\d{1,2})\s*x\b/);
  if (installments && (normalized.includes("cartao") || /\b(?:no|na)\s+[\p{L}\p{N} -]+$/u.test(normalized))) {
    const installmentsCount = Number(installments[1]);
    if (installmentsCount < 1 || installmentsCount > 72) return { type: "UNKNOWN", payload: { reason: "unsupported" } };
    return { type: "CREATE_CARD_PURCHASE", payload: {
      amount_cents: amountCents,
      installments: installmentsCount,
      card_query: normalized.match(/\b(?:no|na)\s+([\p{L}\p{N} -]+)$/u)?.[1]?.trim() ?? null,
      description: buildDescription(sanitized, amountCents),
      purchase_date: transactionDate,
    } };
  }
  if (/\bconta\s+a\s+(pagar|receber)\b/.test(normalized)) {
    return { type: "CREATE_BILL", payload: {
      direction: normalized.includes("receber") ? "income" : "expense",
      amount_cents: amountCents,
      description: buildDescription(sanitized, amountCents),
      due_date: transactionDate,
    } };
  }
  const type = detectType(sanitized);
  if (!type) return { type: "UNKNOWN", payload: { reason: "ambiguous_type" } };
  const resolved = resolveCategory(context.categories ?? [], sanitized, type);
  return { type: "CREATE_TRANSACTION", payload: {
    kind: "transaction",
    type,
    amount_cents: amountCents,
    description: buildDescription(sanitized, amountCents),
    category_id: resolved.category?.id ?? null,
    category_name: resolved.category?.name ?? null,
    category_candidate_name: resolved.category ? null : buildDescription(sanitized, amountCents),
    category_status: resolved.status,
    payment_method: detectPaymentMethod(sanitized),
    transaction_date: transactionDate,
  } };
}
