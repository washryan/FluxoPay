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

type TrendMonth = {
  key: string;
  label: string;
};

export type DashboardTrendPoint = {
  month: string;
  income: number;
  expense: number;
};

export type DashboardTrendRange = "6m" | "1y" | "total";
export type DashboardExpenseRange = "month" | "year" | "total";

export type DashboardData = {
  currentMonth: {
    incomeCents: number;
    expenseCents: number;
    balanceCents: number;
    transactionsCount: number;
  };
  lifetime: {
    incomeCents: number;
    expenseCents: number;
    balanceCents: number;
  };
  upcomingBills: BillRow[];
  topExpenseCategories: Array<{
    id: string;
    name: string;
    color: string;
    amountCents: number;
  }>;
  topExpenseRangeLabel: string;
  trendRangeLabel: string;
  trend: DashboardTrendPoint[];
  error: string | null;
};

function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfYear(date: Date) {
  return new Date(date.getFullYear(), 0, 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date, includeYear = false) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    ...(includeYear ? { year: "2-digit" } : {}),
  }).format(date);
}

function getTrendMonths({
  referenceDate,
  range,
  transactions,
}: {
  referenceDate: Date;
  range: DashboardTrendRange;
  transactions: TransactionRow[];
}): TrendMonth[] {
  if (range === "total") {
    const sorted = [...transactions].sort((a, b) =>
      a.transaction_date.localeCompare(b.transaction_date),
    );
    const firstDate = sorted[0]?.transaction_date
      ? new Date(`${sorted[0].transaction_date}T00:00:00`)
      : new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
    const firstMonth = startOfMonth(firstDate);
    const lastMonth = startOfMonth(referenceDate);
    const months: TrendMonth[] = [];
    const cursor = new Date(firstMonth);

    while (cursor <= lastMonth) {
      months.push({
        key: monthKey(cursor),
        label: monthLabel(cursor, true),
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    return months;
  }

  const length = range === "1y" ? 12 : 6;

  return Array.from({ length }, (_, index) => {
    const date = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth() - (length - 1 - index),
      1,
    );

    return {
      key: monthKey(date),
      label: monthLabel(date, range === "1y"),
    };
  });
}

function normalizeTrendRange(value?: string): DashboardTrendRange {
  if (value === "1y" || value === "total") {
    return value;
  }

  return "6m";
}

function normalizeExpenseRange(value?: string): DashboardExpenseRange {
  if (value === "year" || value === "total") {
    return value;
  }

  return "month";
}

export async function getDashboardData({
  expenseRange: rawExpenseRange,
  trendRange: rawTrendRange,
}: {
  expenseRange?: string;
  trendRange?: string;
} = {}): Promise<DashboardData> {
  await syncOverdueStatuses();

  const supabase = await createClient();
  const today = new Date();
  const todayInput = toDateInput(today);
  const currentMonthStart = startOfMonth(today);
  const currentMonthEnd = endOfMonth(today);
  const expenseRange = normalizeExpenseRange(rawExpenseRange);
  const trendRange = normalizeTrendRange(rawTrendRange);

  const [transactionsResult, billsResult, categoriesResult] = await Promise.all([
    supabase
      .from("transactions")
      .select("type, amount_cents, transaction_date, category_id")
      .lte("transaction_date", todayInput),
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
  const fallbackTrendMonths = getTrendMonths({
    referenceDate: today,
    range: trendRange,
    transactions: [],
  });

  if (firstError) {
    return {
      currentMonth: {
        incomeCents: 0,
        expenseCents: 0,
        balanceCents: 0,
        transactionsCount: 0,
      },
      lifetime: {
        incomeCents: 0,
        expenseCents: 0,
        balanceCents: 0,
      },
      upcomingBills: [],
      topExpenseCategories: [],
      topExpenseRangeLabel: "mês atual",
      trendRangeLabel: "últimos 6 meses",
      trend: fallbackTrendMonths.map((month) => ({
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

  const lifetimeIncomeCents = transactions
    .filter((transaction) => transaction.type === "income")
    .reduce((total, transaction) => total + transaction.amount_cents, 0);

  const lifetimeExpenseCents = transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((total, transaction) => total + transaction.amount_cents, 0);

  const topExpenseStart =
    expenseRange === "month"
      ? currentMonthStart
      : expenseRange === "year"
        ? startOfYear(today)
        : null;
  const expenseTransactions = transactions.filter((transaction) => {
    if (transaction.type !== "expense") {
      return false;
    }

    if (!topExpenseStart) {
      return true;
    }

    const date = new Date(`${transaction.transaction_date}T00:00:00`);
    return date >= topExpenseStart && date <= today;
  });
  const expensesByCategory = new Map<string, number>();

  expenseTransactions.forEach((transaction) => {
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

  const trendMonths = getTrendMonths({
    referenceDate: today,
    range: trendRange,
    transactions,
  });
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
    lifetime: {
      incomeCents: lifetimeIncomeCents,
      expenseCents: lifetimeExpenseCents,
      balanceCents: lifetimeIncomeCents - lifetimeExpenseCents,
    },
    upcomingBills: bills,
    topExpenseCategories,
    topExpenseRangeLabel:
      expenseRange === "month"
        ? "mês atual"
        : expenseRange === "year"
          ? "ano atual"
          : "todo o histórico",
    trendRangeLabel:
      trendRange === "6m"
        ? "últimos 6 meses"
        : trendRange === "1y"
          ? "últimos 12 meses"
          : "todo o histórico",
    trend,
    error: null,
  };
}
