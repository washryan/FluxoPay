import { syncOverdueStatuses } from "@/features/overdue/sync";
import { createClient } from "@/lib/supabase/server";

type TransactionRow = {
  id: string;
  type: "income" | "expense";
  amount_cents: number;
  description: string;
  transaction_date: string;
  categories:
    | { name: string; color: string }
    | { name: string; color: string }[]
    | null;
};

type BillRow = {
  id: string;
  name: string;
  amount_cents: number;
  due_date: string;
  status: "pending" | "paid" | "overdue" | "cancelled";
};

type InstallmentRow = {
  id: string;
  amount_cents: number;
  due_date: string;
  status: "pending" | "paid" | "overdue" | "cancelled";
  credit_card_purchases:
    | {
        description: string;
        categories:
          | { name: string; color: string }
          | { name: string; color: string }[]
          | null;
        credit_cards: { id: string; name: string } | { id: string; name: string }[] | null;
      }
    | {
        description: string;
        categories:
          | { name: string; color: string }
          | { name: string; color: string }[]
          | null;
        credit_cards: { id: string; name: string } | { id: string; name: string }[] | null;
      }[]
    | null;
};

export type MonthlyReport = {
  month: string;
  monthLabel: string;
  period: {
    start: string;
    end: string;
  };
  totals: {
    incomeCents: number;
    expenseCents: number;
    balanceCents: number;
    cardInvoiceCents: number;
    cardOpenCents: number;
    billPendingCents: number;
  };
  transactions: {
    count: number;
    largestExpenses: Array<{
      id: string;
      description: string;
      amountCents: number;
      date: string;
      categoryName: string;
      categoryColor: string;
    }>;
  };
  categories: Array<{
    key: string;
    name: string;
    color: string;
    amountCents: number;
  }>;
  cardCategories: Array<{
    key: string;
    name: string;
    color: string;
    amountCents: number;
  }>;
  invoices: Array<{
    key: string;
    cardName: string;
    totalCents: number;
    openCents: number;
    paidCents: number;
    status: "pending" | "paid" | "overdue" | "cancelled";
    itemsCount: number;
  }>;
  bills: {
    pending: BillRow[];
    paid: BillRow[];
    overdue: BillRow[];
  };
  error: string | null;
};

function firstRelation<T>(relation: T | T[] | null) {
  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation;
}

function normalizeMonth(value?: string) {
  if (value && /^\d{4}-\d{2}$/.test(value)) {
    return value;
  }

  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
}

function monthRange(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, monthNumber - 1, 1));
  const end = new Date(Date.UTC(year, monthNumber, 1));

  return {
    end: end.toISOString().slice(0, 10),
    start: start.toISOString().slice(0, 10),
  };
}

function monthLabel(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);

  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}

function addCategoryTotal(
  totals: Map<string, { name: string; color: string; amountCents: number }>,
  category: { name: string; color: string } | null,
  amountCents: number,
) {
  const key = category?.name ?? "Sem categoria";
  const current = totals.get(key) ?? {
    amountCents: 0,
    color: category?.color ?? "#64748b",
    name: key,
  };

  current.amountCents += amountCents;
  totals.set(key, current);
}

function sortCategoryTotals(
  totals: Map<string, { name: string; color: string; amountCents: number }>,
) {
  return Array.from(totals.entries())
    .map(([key, value]) => ({ key, ...value }))
    .sort((a, b) => b.amountCents - a.amountCents)
    .slice(0, 6);
}

function invoiceStatus(items: InstallmentRow[]) {
  if (items.length > 0 && items.every((item) => item.status === "paid")) {
    return "paid" as const;
  }

  if (items.some((item) => item.status === "overdue")) {
    return "overdue" as const;
  }

  if (items.length > 0 && items.every((item) => item.status === "cancelled")) {
    return "cancelled" as const;
  }

  return "pending" as const;
}

export async function getMonthlyReport(rawMonth?: string): Promise<MonthlyReport> {
  await syncOverdueStatuses();

  const month = normalizeMonth(rawMonth);
  const range = monthRange(month);
  const supabase = await createClient();
  const [transactionsResult, billsResult, installmentsResult] = await Promise.all([
    supabase
      .from("transactions")
      .select(
        "id, type, amount_cents, description, transaction_date, categories(name, color)",
      )
      .gte("transaction_date", range.start)
      .lt("transaction_date", range.end)
      .order("transaction_date", { ascending: false }),
    supabase
      .from("bills")
      .select("id, name, amount_cents, due_date, status")
      .gte("due_date", range.start)
      .lt("due_date", range.end)
      .order("due_date", { ascending: true }),
    supabase
      .from("installments")
      .select(
        `
        id,
        amount_cents,
        due_date,
        status,
        credit_card_purchases(
          description,
          categories(name, color),
          credit_cards(id, name)
        )
        `,
      )
      .gte("due_date", range.start)
      .lt("due_date", range.end)
      .order("due_date", { ascending: true }),
  ]);
  const firstError =
    transactionsResult.error ?? billsResult.error ?? installmentsResult.error;

  if (firstError) {
    return {
      bills: { overdue: [], paid: [], pending: [] },
      cardCategories: [],
      categories: [],
      error: "Não foi possível carregar o relatório mensal agora.",
      invoices: [],
      month,
      monthLabel: monthLabel(month),
      period: range,
      totals: {
        balanceCents: 0,
        billPendingCents: 0,
        cardInvoiceCents: 0,
        cardOpenCents: 0,
        expenseCents: 0,
        incomeCents: 0,
      },
      transactions: { count: 0, largestExpenses: [] },
    };
  }

  const transactions = (transactionsResult.data ?? []) as unknown as TransactionRow[];
  const bills = (billsResult.data ?? []) as BillRow[];
  const installments = (installmentsResult.data ?? []) as unknown as InstallmentRow[];
  const incomeCents = transactions
    .filter((transaction) => transaction.type === "income")
    .reduce((total, transaction) => total + transaction.amount_cents, 0);
  const expenseTransactions = transactions.filter(
    (transaction) => transaction.type === "expense",
  );
  const expenseCents = expenseTransactions.reduce(
    (total, transaction) => total + transaction.amount_cents,
    0,
  );
  const categoryTotals = new Map<
    string,
    { name: string; color: string; amountCents: number }
  >();

  for (const transaction of expenseTransactions) {
    addCategoryTotal(
      categoryTotals,
      firstRelation(transaction.categories),
      transaction.amount_cents,
    );
  }

  const cardCategoryTotals = new Map<
    string,
    { name: string; color: string; amountCents: number }
  >();
  const invoiceGroups = new Map<string, InstallmentRow[]>();

  for (const installment of installments) {
    const purchase = firstRelation(installment.credit_card_purchases);
    const card = firstRelation(purchase?.credit_cards ?? null);
    const category = firstRelation(purchase?.categories ?? null);

    addCategoryTotal(cardCategoryTotals, category, installment.amount_cents);

    const key = `${card?.id ?? "card"}:${installment.due_date.slice(0, 7)}`;
    const current = invoiceGroups.get(key) ?? [];
    current.push(installment);
    invoiceGroups.set(key, current);
  }

  const invoices = Array.from(invoiceGroups.entries())
    .map(([key, items]) => {
      const firstPurchase = firstRelation(items[0]?.credit_card_purchases ?? null);
      const card = firstRelation(firstPurchase?.credit_cards ?? null);
      const totalCents = items.reduce(
        (total, item) => total + item.amount_cents,
        0,
      );
      const paidCents = items
        .filter((item) => item.status === "paid")
        .reduce((total, item) => total + item.amount_cents, 0);
      const openCents = items
        .filter((item) => item.status === "pending" || item.status === "overdue")
        .reduce((total, item) => total + item.amount_cents, 0);

      return {
        cardName: card?.name ?? "Cartão",
        itemsCount: items.length,
        key,
        openCents,
        paidCents,
        status: invoiceStatus(items),
        totalCents,
      };
    })
    .sort((a, b) => b.totalCents - a.totalCents);
  const cardInvoiceCents = invoices.reduce(
    (total, invoice) => total + invoice.totalCents,
    0,
  );
  const cardOpenCents = invoices.reduce(
    (total, invoice) => total + invoice.openCents,
    0,
  );
  const pendingBills = bills.filter(
    (bill) => bill.status === "pending" || bill.status === "overdue",
  );

  return {
    bills: {
      overdue: bills.filter((bill) => bill.status === "overdue"),
      paid: bills.filter((bill) => bill.status === "paid"),
      pending: bills.filter((bill) => bill.status === "pending"),
    },
    cardCategories: sortCategoryTotals(cardCategoryTotals),
    categories: sortCategoryTotals(categoryTotals),
    error: null,
    invoices,
    month,
    monthLabel: monthLabel(month),
    period: range,
    totals: {
      balanceCents: incomeCents - expenseCents,
      billPendingCents: pendingBills.reduce(
        (total, bill) => total + bill.amount_cents,
        0,
      ),
      cardInvoiceCents,
      cardOpenCents,
      expenseCents,
      incomeCents,
    },
    transactions: {
      count: transactions.length,
      largestExpenses: expenseTransactions
        .sort((a, b) => b.amount_cents - a.amount_cents)
        .slice(0, 5)
        .map((transaction) => {
          const category = firstRelation(transaction.categories);

          return {
            amountCents: transaction.amount_cents,
            categoryColor: category?.color ?? "#64748b",
            categoryName: category?.name ?? "Sem categoria",
            date: transaction.transaction_date,
            description: transaction.description,
            id: transaction.id,
          };
        }),
    },
  };
}
