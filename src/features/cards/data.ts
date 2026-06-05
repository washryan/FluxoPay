import { createClient } from "@/lib/supabase/server";

export type CreditCard = {
  id: string;
  name: string;
  closing_day: number;
  due_day: number;
  limit_cents: number | null;
  is_active: boolean;
  created_at: string;
};

export async function getCreditCards() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("credit_cards")
    .select("id, name, closing_day, due_day, limit_cents, is_active, created_at")
    .order("is_active", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return { cards: [] as CreditCard[], error: error.message };
  }

  return { cards: (data ?? []) as CreditCard[], error: null };
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
  credit_card_purchases: {
    description: string;
    installments_count: number;
    credit_cards: { name: string } | { name: string }[] | null;
  } | {
    description: string;
    installments_count: number;
    credit_cards: { name: string } | { name: string }[] | null;
  }[] | null;
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
