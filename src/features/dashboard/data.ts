import { createClient } from "@/lib/supabase/server";
import { syncOverdueStatuses } from "@/features/overdue/sync";

type TransactionRow = {
  type: "income" | "expense";
  amount_cents: number;
  transaction_date: string;
  category_id: string | null;
};

type CategoryRow = {
  id: string;
  name: string;
  color: string;
};

type BillRow = {
  id: string;
  name: string;
  amount_cents: number;
  due_date: string;
  status: "pending" | "paid" | "overdue" | "cancelled";
};

export type DashboardTrendPoint = {
  month: string;
  income: number;
  expense: number;
};

export type DashboardData = {
  currentMonth: {
    incomeCents: number;
    expenseCents: number;
    balanceCents: number;
    transactionsCount: number;
  };
  upcomingBills: BillRow[];
  topExpenseCategories: Array<{
    id: string;
    name: string;
    color: string;
    amountCents: number;
  }>;
  trend: DashboardTrendPoint[];
  error: string | null;
};

function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function getTrendMonths(referenceDate: Date) {
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth() - (5 - index),
      1,
    );

    return {
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(date),
      start: toDateInput(startOfMonth(date)),
      end: toDateInput(endOfMonth(date)),
    };
  });
}

export async function getDashboardData(): Promise<DashboardData> {
  await syncOverdueStatuses();

  const supabase = await createClient();
  const today = new Date();
  const currentMonthStart = startOfMonth(today);
  const currentMonthEnd = endOfMonth(today);
  const trendMonths = getTrendMonths(today);
  const trendStart = trendMonths[0]?.start ?? toDateInput(currentMonthStart);

  const [transactionsResult, billsResult, categoriesResult] = await Promise.all([
    supabase
      .from("transactions")
      .select("type, amount_cents, transaction_date, category_id")
      .gte("transaction_date", trendStart)
      .lte("transaction_date", toDateInput(currentMonthEnd)),
    supabase
      .from("bills")
      .select("id, name, amount_cents, due_date, status")
      .in("status", ["pending", "overdue"])
      .lte("due_date", toDateInput(addDays(today, 7)))
      .order("due_date", { ascending: true })
      .limit(5),
    supabase.from("categories").select("id, name, color"),
  ]);

  const firstError =
    transactionsResult.error ?? billsResult.error ?? categoriesResult.error;

  if (firstError) {
    return {
      currentMonth: {
        incomeCents: 0,
        expenseCents: 0,
        balanceCents: 0,
        transactionsCount: 0,
      },
      upcomingBills: [],
      topExpenseCategories: [],
      trend: trendMonths.map((month) => ({
        month: month.label,
        income: 0,
        expense: 0,
      })),
      error:
        "Não foi possível carregar os dados financeiros agora. Tente novamente em instantes.",
    };
  }

  const transactions = (transactionsResult.data ?? []) as TransactionRow[];
  const bills = (billsResult.data ?? []) as BillRow[];
  const categories = (categoriesResult.data ?? []) as CategoryRow[];
  const categoriesById = new Map(
    categories.map((category) => [category.id, category]),
  );

  const currentMonthTransactions = transactions.filter((transaction) => {
    const date = new Date(`${transaction.transaction_date}T00:00:00`);
    return date >= currentMonthStart && date <= currentMonthEnd;
  });

  const incomeCents = currentMonthTransactions
    .filter((transaction) => transaction.type === "income")
    .reduce((total, transaction) => total + transaction.amount_cents, 0);

  const expenseCents = currentMonthTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((total, transaction) => total + transaction.amount_cents, 0);

  const expensesByCategory = new Map<string, number>();

  currentMonthTransactions
    .filter((transaction) => transaction.type === "expense")
    .forEach((transaction) => {
      const categoryId = transaction.category_id ?? "uncategorized";
      expensesByCategory.set(
        categoryId,
        (expensesByCategory.get(categoryId) ?? 0) + transaction.amount_cents,
      );
    });

  const topExpenseCategories = Array.from(expensesByCategory.entries())
    .map(([categoryId, amountCents]) => {
      const category = categoriesById.get(categoryId);

      return {
        id: categoryId,
        name: category?.name ?? "Sem categoria",
        color: category?.color ?? "#64748b",
        amountCents,
      };
    })
    .sort((a, b) => b.amountCents - a.amountCents)
    .slice(0, 5);

  const trend = trendMonths.map((month) => {
    const monthTransactions = transactions.filter((transaction) => {
      const transactionMonth = transaction.transaction_date.slice(0, 7);
      return transactionMonth === month.key;
    });

    return {
      month: month.label,
      income:
        monthTransactions
          .filter((transaction) => transaction.type === "income")
          .reduce((total, transaction) => total + transaction.amount_cents, 0) /
        100,
      expense:
        monthTransactions
          .filter((transaction) => transaction.type === "expense")
          .reduce((total, transaction) => total + transaction.amount_cents, 0) /
        100,
    };
  });

  return {
    currentMonth: {
      incomeCents,
      expenseCents,
      balanceCents: incomeCents - expenseCents,
      transactionsCount: currentMonthTransactions.length,
    },
    upcomingBills: bills,
    topExpenseCategories,
    trend,
    error: null,
  };
}
