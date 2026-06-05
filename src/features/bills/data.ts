import { createClient } from "@/lib/supabase/server";

export type Bill = {
  id: string;
  name: string;
  amount_cents: number;
  due_date: string;
  status: "pending" | "paid" | "overdue" | "cancelled";
  recurrence: "none" | "weekly" | "monthly" | "yearly";
  category_id: string | null;
  notes: string | null;
  created_at: string;
  categories: {
    name: string;
    color: string;
  } | null;
};

type BillQueryRow = Omit<Bill, "categories"> & {
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

function normalizeBill(row: BillQueryRow): Bill {
  return {
    ...row,
    categories: Array.isArray(row.categories)
      ? (row.categories[0] ?? null)
      : row.categories,
  };
}

export async function getBills() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bills")
    .select(
      "id, name, amount_cents, due_date, status, recurrence, category_id, notes, created_at, categories(name, color)",
    )
    .order("due_date", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    return { bills: [] as Bill[], error: error.message };
  }

  return {
    bills: ((data ?? []) as unknown as BillQueryRow[]).map(normalizeBill),
    error: null,
  };
}
