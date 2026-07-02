import { createClient } from "@/lib/supabase/server";

export type TransactionFilters = {
  start?: string;
  end?: string;
  type?: "income" | "expense" | "all";
  category?: string;
};

export type Transaction = {
  id: string;
  type: "income" | "expense";
  amount_cents: number;
  description: string;
  category_id: string | null;
  payment_method:
    | "cash"
    | "pix"
    | "debit_card"
    | "credit_card"
    | "bank_transfer"
    | "boleto"
    | "other";
  transaction_date: string;
  source: "web" | "telegram" | "import";
  created_at: string;
  categories: {
    name: string;
    color: string;
  } | null;
};

type TransactionQueryRow = Omit<Transaction, "categories"> & {
  categories:
    | {
        name: string;
        color: string;
      }
    | Array<{
        name: string;
        color: string;
      }>
    | null;
};

function normalizeTransaction(row: TransactionQueryRow): Transaction {
  const category = Array.isArray(row.categories)
    ? (row.categories[0] ?? null)
    : row.categories;

  return {
    ...row,
    categories: category,
  };
}

export async function getTransactions(filters: TransactionFilters) {
  const supabase = await createClient();
  let query = supabase
    .from("transactions")
    .select(
      "id, type, amount_cents, description, category_id, payment_method, transaction_date, source, created_at, categories(name, color)",
    )
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters.start) {
    query = query.gte("transaction_date", filters.start);
  }

  if (filters.end) {
    query = query.lte("transaction_date", filters.end);
  }

  if (filters.type && filters.type !== "all") {
    query = query.eq("type", filters.type);
  }

  if (filters.category) {
    query = query.eq("category_id", filters.category);
  }

  const { data, error } = await query.limit(100);

  if (error) {
    return { transactions: [] as Transaction[], error: error.message };
  }

  return {
    transactions: ((data ?? []) as unknown as TransactionQueryRow[]).map(
      normalizeTransaction,
    ),
    error: null,
  };
}

export async function getTransaction(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select(
      "id, type, amount_cents, description, category_id, payment_method, transaction_date, source, created_at, categories(name, color)",
    )
    .eq("id", id)
    .single();

  if (error) {
    return { transaction: null, error: error.message };
  }

  return {
    transaction: normalizeTransaction(data as unknown as TransactionQueryRow),
    error: null,
  };
}
