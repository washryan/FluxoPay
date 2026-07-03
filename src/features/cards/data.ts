import { createClient } from "@/lib/supabase/server";

export type CreditCard = {
  id: string;
  name: string;
  closing_day: number;
  due_day: number;
  limit_cents: number | null;
  open_cents: number;
  available_cents: number | null;
  is_active: boolean;
  created_at: string;
};

type CardLimitInstallmentRow = {
  amount_cents: number;
  credit_card_purchases:
    | { credit_card_id: string }
    | { credit_card_id: string }[]
    | null;
};

export async function getCreditCards() {
  const supabase = await createClient();
  const [cardsResult, installmentsResult] = await Promise.all([
    supabase
      .from("credit_cards")
      .select(
        "id, name, closing_day, due_day, limit_cents, is_active, created_at",
      )
      .order("is_active", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("installments")
      .select(
        `
        amount_cents,
        credit_card_purchases!inner(credit_card_id)
        `,
      )
      .in("status", ["pending", "overdue"]),
  ]);

  if (cardsResult.error || installmentsResult.error) {
    return {
      cards: [] as CreditCard[],
      error: cardsResult.error?.message ?? installmentsResult.error?.message,
    };
  }

  const openByCard = new Map<string, number>();
  const installmentRows = (installmentsResult.data ??
    []) as unknown as CardLimitInstallmentRow[];

  for (const installment of installmentRows) {
    const purchase = firstRelation(installment.credit_card_purchases);

    if (!purchase) {
      continue;
    }

    openByCard.set(
      purchase.credit_card_id,
      (openByCard.get(purchase.credit_card_id) ?? 0) + installment.amount_cents,
    );
  }

  return {
    cards: (
      (cardsResult.data ?? []) as Omit<
        CreditCard,
        "available_cents" | "open_cents"
      >[]
    ).map((card) => {
      const openCents = openByCard.get(card.id) ?? 0;

      return {
        ...card,
        open_cents: openCents,
        available_cents:
          card.limit_cents === null ? null : card.limit_cents - openCents,
      };
    }),
    error: null,
  };
}

export type CreditCardPurchase = {
  id: string;
  credit_card_id: string;
  category_id: string | null;
  description: string;
  total_amount_cents: number;
  purchase_date: string;
  installments_count: number;
  source: "web" | "telegram" | "import";
  created_at: string;
  card_name: string;
  category_name: string | null;
  category_color: string | null;
};

type CreditCardPurchaseRow = Omit<
  CreditCardPurchase,
  "card_name" | "category_name" | "category_color"
> & {
  credit_cards: { name: string } | { name: string }[] | null;
  categories:
    | { name: string; color: string }
    | { name: string; color: string }[]
    | null;
};

function firstRelation<T>(relation: T | T[] | null) {
  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation;
}

export async function getCreditCardPurchases() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("credit_card_purchases")
    .select(
      `
      id,
      credit_card_id,
      category_id,
      description,
      total_amount_cents,
      purchase_date,
      installments_count,
      source,
      created_at,
      credit_cards(name),
      categories(name, color)
      `,
    )
    .order("purchase_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return { purchases: [] as CreditCardPurchase[], error: error.message };
  }

  const rows = (data ?? []) as unknown as CreditCardPurchaseRow[];

  return {
    purchases: rows.map((purchase) => {
      const card = firstRelation(purchase.credit_cards);
      const category = firstRelation(purchase.categories);

      return {
        id: purchase.id,
        credit_card_id: purchase.credit_card_id,
        category_id: purchase.category_id,
        description: purchase.description,
        total_amount_cents: purchase.total_amount_cents,
        purchase_date: purchase.purchase_date,
        installments_count: purchase.installments_count,
        source: purchase.source,
        created_at: purchase.created_at,
        card_name: card?.name ?? "Cartão",
        category_name: category?.name ?? null,
        category_color: category?.color ?? null,
      };
    }),
    error: null,
  };
}

export type UpcomingInstallment = {
  id: string;
  purchase_id: string;
  installment_number: number;
  amount_cents: number;
  due_date: string;
  status: "pending" | "paid" | "overdue" | "cancelled";
  purchase_description: string;
  installments_count: number;
  card_name: string;
};

type UpcomingInstallmentRow = Omit<
  UpcomingInstallment,
  "purchase_description" | "installments_count" | "card_name"
> & {
  credit_card_purchases:
    | {
        description: string;
        installments_count: number;
        credit_cards: { name: string } | { name: string }[] | null;
      }
    | {
        description: string;
        installments_count: number;
        credit_cards: { name: string } | { name: string }[] | null;
      }[]
    | null;
};

export async function getUpcomingInstallments() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("installments")
    .select(
      `
      id,
      purchase_id,
      installment_number,
      amount_cents,
      due_date,
      status,
      credit_card_purchases(
        description,
        installments_count,
        credit_cards(name)
      )
      `,
    )
    .in("status", ["pending", "overdue"])
    .order("due_date", { ascending: true })
    .limit(12);

  if (error) {
    return { installments: [] as UpcomingInstallment[], error: error.message };
  }

  const rows = (data ?? []) as unknown as UpcomingInstallmentRow[];

  return {
    installments: rows.map((installment) => {
      const purchase = firstRelation(installment.credit_card_purchases);
      const card = firstRelation(purchase?.credit_cards ?? null);

      return {
        id: installment.id,
        purchase_id: installment.purchase_id,
        installment_number: installment.installment_number,
        amount_cents: installment.amount_cents,
        due_date: installment.due_date,
        status: installment.status,
        purchase_description: purchase?.description ?? "Compra",
        installments_count: purchase?.installments_count ?? 1,
        card_name: card?.name ?? "Cartão",
      };
    }),
    error: null,
  };
}

export type CreditCardInvoiceItem = {
  id: string;
  purchase_id: string;
  purchase_description: string;
  installment_number: number;
  installments_count: number;
  amount_cents: number;
  due_date: string;
  status: "pending" | "paid" | "overdue" | "cancelled";
  paid_transaction_id: string | null;
  category_name: string | null;
  category_color: string | null;
  source_invoice_transaction_id: string | null;
  source_invoice_details: CreditCardInvoicePaymentDetail[];
  can_delete_purchase: boolean;
};

export type CreditCardInvoicePaymentDetail = {
  id: string;
  purchase_description: string;
  card_name: string;
  category_name: string | null;
  category_color: string | null;
  installment_number: number;
  installments_count: number;
  amount_cents: number;
};

export type CreditCardInvoice = {
  key: string;
  card_id: string;
  card_name: string;
  invoice_month: string;
  due_date: string;
  total_cents: number;
  open_cents: number;
  paid_cents: number;
  interest_cents: number;
  payment_transaction_id: string | null;
  status: "pending" | "paid" | "overdue" | "cancelled";
  items: CreditCardInvoiceItem[];
};

type InvoiceInstallmentRow = {
  id: string;
  purchase_id: string;
  installment_number: number;
  amount_cents: number;
  due_date: string;
  status: "pending" | "paid" | "overdue" | "cancelled";
  paid_transaction_id: string | null;
  credit_card_purchases:
    | {
        description: string;
        installments_count: number;
        credit_card_id: string;
        source_invoice_transaction_id: string | null;
        categories:
          | { name: string; color: string }
          | { name: string; color: string }[]
          | null;
        credit_cards: { name: string } | { name: string }[] | null;
      }
    | {
        description: string;
        installments_count: number;
        credit_card_id: string;
        source_invoice_transaction_id: string | null;
        categories:
          | { name: string; color: string }
          | { name: string; color: string }[]
          | null;
        credit_cards: { name: string } | { name: string }[] | null;
      }[]
    | null;
};

type SourceInvoiceDetailRow = {
  id: string;
  paid_transaction_id: string | null;
  installment_number: number;
  amount_cents: number;
  credit_card_purchases:
    | {
        description: string;
        installments_count: number;
        categories:
          | { name: string; color: string }
          | { name: string; color: string }[]
          | null;
        credit_cards: { name: string } | { name: string }[] | null;
      }
    | {
        description: string;
        installments_count: number;
        categories:
          | { name: string; color: string }
          | { name: string; color: string }[]
          | null;
        credit_cards: { name: string } | { name: string }[] | null;
      }[]
    | null;
};

type PaymentTransactionRow = {
  id: string;
  amount_cents: number;
};

function invoiceStatus(
  items: CreditCardInvoiceItem[],
): CreditCardInvoice["status"] {
  if (items.length > 0 && items.every((item) => item.status === "paid")) {
    return "paid";
  }

  if (items.some((item) => item.status === "overdue")) {
    return "overdue";
  }

  if (items.length > 0 && items.every((item) => item.status === "cancelled")) {
    return "cancelled";
  }

  return "pending";
}

function invoicePaymentTransactionId(items: CreditCardInvoiceItem[]) {
  const transactionIds = Array.from(
    new Set(
      items
        .filter((item) => item.status === "paid" && item.paid_transaction_id)
        .map((item) => item.paid_transaction_id),
    ),
  );

  if (
    items.length > 0 &&
    items.every((item) => item.status === "paid") &&
    transactionIds.length === 1
  ) {
    return transactionIds[0] ?? null;
  }

  return null;
}

export async function getCreditCardInvoices() {
  const supabase = await createClient();
  const pageSize = 1000;
  const rows: InvoiceInstallmentRow[] = [];

  for (let page = 0; page < 10; page += 1) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from("installments")
      .select(
        `
        id,
        purchase_id,
        installment_number,
        amount_cents,
        due_date,
        status,
        paid_transaction_id,
        credit_card_purchases(
          description,
          installments_count,
          credit_card_id,
          source_invoice_transaction_id,
          categories(name, color),
          credit_cards(name)
        )
        `,
      )
      .order("due_date", { ascending: false })
      .range(from, to);

    if (error) {
      return { error: error.message, invoices: [] as CreditCardInvoice[] };
    }

    const pageRows = (data ?? []) as unknown as InvoiceInstallmentRow[];
    rows.push(...pageRows);

    if (pageRows.length < pageSize) {
      break;
    }
  }

  const grouped = new Map<string, CreditCardInvoice>();
  const purchasesWithPaidInstallments = new Set(
    rows
      .filter((installment) => installment.status === "paid")
      .map((installment) => installment.purchase_id),
  );
  const paidTransactionIds = Array.from(
    new Set(
      rows
        .map((installment) => installment.paid_transaction_id)
        .filter(Boolean),
    ),
  ) as string[];
  const paymentAmountById = new Map<string, number>();
  const sourceTransactionIds = Array.from(
    new Set(
      rows
        .map((installment) => {
          const purchase = firstRelation(installment.credit_card_purchases);

          return purchase?.source_invoice_transaction_id ?? null;
        })
        .filter(Boolean),
    ),
  ) as string[];
  const sourceDetailsByTransaction = new Map<
    string,
    CreditCardInvoicePaymentDetail[]
  >();

  if (paidTransactionIds.length > 0) {
    const { data: paymentData, error: paymentError } = await supabase
      .from("transactions")
      .select("id, amount_cents")
      .in("id", paidTransactionIds);

    if (paymentError) {
      return {
        error: paymentError.message,
        invoices: [] as CreditCardInvoice[],
      };
    }

    for (const transaction of (paymentData ?? []) as PaymentTransactionRow[]) {
      paymentAmountById.set(transaction.id, transaction.amount_cents);
    }
  }

  if (sourceTransactionIds.length > 0) {
    const { data: detailsData, error: detailsError } = await supabase
      .from("installments")
      .select(
        `
        id,
        paid_transaction_id,
        installment_number,
        amount_cents,
        credit_card_purchases(
          description,
          installments_count,
          categories(name, color),
          credit_cards(name)
        )
        `,
      )
      .in("paid_transaction_id", sourceTransactionIds)
      .order("due_date", { ascending: true });

    if (detailsError) {
      return {
        error: detailsError.message,
        invoices: [] as CreditCardInvoice[],
      };
    }

    for (const detail of (detailsData ??
      []) as unknown as SourceInvoiceDetailRow[]) {
      if (!detail.paid_transaction_id) {
        continue;
      }

      const purchase = firstRelation(detail.credit_card_purchases);
      const category = firstRelation(purchase?.categories ?? null);
      const card = firstRelation(purchase?.credit_cards ?? null);
      const current =
        sourceDetailsByTransaction.get(detail.paid_transaction_id) ?? [];

      current.push({
        id: detail.id,
        purchase_description: purchase?.description ?? "Compra",
        card_name: card?.name ?? "Cartão",
        category_name: category?.name ?? null,
        category_color: category?.color ?? null,
        installment_number: detail.installment_number,
        installments_count: purchase?.installments_count ?? 1,
        amount_cents: detail.amount_cents,
      });
      sourceDetailsByTransaction.set(detail.paid_transaction_id, current);
    }
  }

  for (const installment of rows) {
    const purchase = firstRelation(installment.credit_card_purchases);

    if (!purchase) {
      continue;
    }

    const card = firstRelation(purchase.credit_cards);
    const category = firstRelation(purchase.categories);
    const invoiceMonth = installment.due_date.slice(0, 7);
    const key = `${purchase.credit_card_id}:${invoiceMonth}`;
    const current = grouped.get(key) ?? {
      key,
      card_id: purchase.credit_card_id,
      card_name: card?.name ?? "Cartão",
      invoice_month: invoiceMonth,
      due_date: installment.due_date,
      total_cents: 0,
      open_cents: 0,
      paid_cents: 0,
      interest_cents: 0,
      payment_transaction_id: null,
      status: "pending" as const,
      items: [],
    };

    const item: CreditCardInvoiceItem = {
      id: installment.id,
      purchase_id: installment.purchase_id,
      purchase_description: purchase.description,
      installment_number: installment.installment_number,
      installments_count: purchase.installments_count,
      amount_cents: installment.amount_cents,
      due_date: installment.due_date,
      status: installment.status,
      paid_transaction_id: installment.paid_transaction_id,
      category_name: category?.name ?? null,
      category_color: category?.color ?? null,
      source_invoice_transaction_id: purchase.source_invoice_transaction_id,
      source_invoice_details: purchase.source_invoice_transaction_id
        ? (sourceDetailsByTransaction.get(
            purchase.source_invoice_transaction_id,
          ) ?? [])
        : [],
      can_delete_purchase:
        !purchase.source_invoice_transaction_id &&
        !purchasesWithPaidInstallments.has(installment.purchase_id),
    };

    current.items.push(item);
    current.total_cents += item.amount_cents;

    if (item.status === "paid") {
      current.paid_cents += item.amount_cents;
    }

    if (item.status === "pending" || item.status === "overdue") {
      current.open_cents += item.amount_cents;
    }

    if (item.due_date > current.due_date) {
      current.due_date = item.due_date;
    }

    grouped.set(key, current);
  }

  const invoices = Array.from(grouped.values())
    .map((invoice) => {
      const paymentTransactionId = invoicePaymentTransactionId(invoice.items);
      const paidCents = paymentTransactionId
        ? (paymentAmountById.get(paymentTransactionId) ?? invoice.paid_cents)
        : invoice.paid_cents;

      return {
        ...invoice,
        paid_cents: paidCents,
        interest_cents: Math.max(0, paidCents - invoice.total_cents),
        items: invoice.items.sort((a, b) =>
          a.due_date.localeCompare(b.due_date),
        ),
        payment_transaction_id: paymentTransactionId,
        status: invoiceStatus(invoice.items),
      };
    })
    .sort((a, b) => b.invoice_month.localeCompare(a.invoice_month));

  return { error: null, invoices };
}
