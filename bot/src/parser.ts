import { supabase } from "./supabase";
import { normalizeText, parseCurrencyToCents, today } from "./utils";

type Category = {
  id: string;
  name: string;
  slug: string;
  type: "income" | "expense" | "both";
};

export type ParsedTransaction = {
  kind: "transaction";
  type: "income" | "expense";
  amount_cents: number;
  description: string;
  category_id: string | null;
  category_name: string | null;
  payment_method:
    | "cash"
    | "pix"
    | "debit_card"
    | "credit_card"
    | "bank_transfer"
    | "other";
  transaction_date: string;
};

const incomeWords = [
  "recebi",
  "ganhei",
  "salario",
  "salário",
  "caiu",
  "deposito",
  "depósito",
  "freela",
  "renda",
];

const expenseWords = [
  "gastei",
  "paguei",
  "comprei",
  "lanche",
  "mercado",
  "internet",
  "aluguel",
  "conta",
];

function detectType(message: string) {
  const normalized = normalizeText(message);
  const hasIncome = incomeWords.some((word) =>
    normalized.includes(normalizeText(word)),
  );
  const hasExpense = expenseWords.some((word) =>
    normalized.includes(normalizeText(word)),
  );

  if (hasIncome && !hasExpense) {
    return "income" as const;
  }

  return "expense" as const;
}

function detectPaymentMethod(message: string): ParsedTransaction["payment_method"] {
  const normalized = normalizeText(message);

  if (normalized.includes("pix")) {
    return "pix";
  }

  if (normalized.includes("dinheiro")) {
    return "cash";
  }

  if (normalized.includes("debito") || normalized.includes("débito")) {
    return "debit_card";
  }

  if (
    normalized.includes("credito") ||
    normalized.includes("crédito") ||
    normalized.includes("cartao") ||
    normalized.includes("cartão")
  ) {
    return "credit_card";
  }

  if (normalized.includes("transferencia") || normalized.includes("ted")) {
    return "bank_transfer";
  }

  return "other";
}

function extractAmount(message: string) {
  const match = message.match(/(?:r\$\s*)?(\d+(?:[.,]\d{1,2})?)/i);

  if (!match?.[1]) {
    return null;
  }

  return parseCurrencyToCents(match[1]);
}

function buildDescription(message: string) {
  return message
    .replace(/(?:r\$\s*)?\d+(?:[.,]\d{1,2})?/i, "")
    .replace(/\b(hoje|ontem|amanha|amanhã|reais|real|no|na|de|do|da)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

async function findCategory(userId: string, message: string, type: string) {
  const { data } = await supabase
    .from("categories")
    .select("id, name, slug, type")
    .eq("user_id", userId)
    .in("type", [type, "both"]);
  const categories = (data ?? []) as Category[];
  const normalized = normalizeText(message);

  return (
    categories.find((category) => normalized.includes(normalizeText(category.name))) ??
    categories.find((category) => normalized.includes(normalizeText(category.slug))) ??
    null
  );
}

export async function parseFinancialMessage(userId: string, message: string) {
  const sanitized = message.trim().slice(0, 500);
  const amountCents = extractAmount(sanitized);

  if (!amountCents || amountCents <= 0) {
    return {
      error:
        "Não encontrei um valor válido. Tente algo como: gastei 25 no mercado.",
      payload: null,
    };
  }

  const type = detectType(sanitized);
  const category = await findCategory(userId, sanitized, type);
  const description = buildDescription(sanitized) || sanitized.slice(0, 180);

  return {
    error: null,
    payload: {
      kind: "transaction",
      type,
      amount_cents: amountCents,
      description,
      category_id: category?.id ?? null,
      category_name: category?.name ?? null,
      payment_method: detectPaymentMethod(sanitized),
      transaction_date: today(),
    } satisfies ParsedTransaction,
  };
}
