"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  creditCardPurchaseSchema,
  creditCardSchema,
} from "@/features/cards/schemas";
import { parseCurrencyToCents } from "@/features/transactions/money";
import { createClient } from "@/lib/supabase/server";

function cardsRedirect(params: Record<string, string>): never {
  const query = new URLSearchParams(params);
  redirect(`/cards?${query.toString()}`);
}

function todayInSaoPaulo() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).formatToParts(new Date());
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

export async function createCreditCard(formData: FormData) {
  const parsed = creditCardSchema.safeParse({
    name: formData.get("name"),
    closing_day: formData.get("closing_day"),
    due_day: formData.get("due_day"),
    limit: formData.get("limit"),
  });

  if (!parsed.success) {
    cardsRedirect({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." });
  }

  const limitCents = parsed.data.limit
    ? parseCurrencyToCents(parsed.data.limit)
    : null;

  if (parsed.data.limit && (!limitCents || limitCents <= 0)) {
    cardsRedirect({ error: "Informe um limite válido ou deixe em branco." });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase.from("credit_cards").insert({
    user_id: user.id,
    name: parsed.data.name,
    closing_day: parsed.data.closing_day,
    due_day: parsed.data.due_day,
    limit_cents: limitCents,
  });

  if (error) {
    cardsRedirect({ error: "Não foi possível criar o cartão." });
  }

  revalidatePath("/cards");
  cardsRedirect({ success: "Cartão criado." });
}

export async function deleteCreditCard(formData: FormData) {
  const id = String(formData.get("id") ?? "");

  if (!id) {
    cardsRedirect({ error: "Cartão inválido." });
  }

  const supabase = await createClient();
  const { error } = await supabase.from("credit_cards").delete().eq("id", id);

  if (error) {
    cardsRedirect({ error: "Não foi possível excluir o cartão." });
  }

  revalidatePath("/cards");
  cardsRedirect({ success: "Cartão excluído." });
}

export async function createCreditCardPurchase(formData: FormData) {
  const parsed = creditCardPurchaseSchema.safeParse({
    credit_card_id: formData.get("credit_card_id"),
    description: formData.get("description"),
    total_amount: formData.get("total_amount"),
    purchase_date: formData.get("purchase_date"),
    installments_count: formData.get("installments_count"),
    category_id: formData.get("category_id"),
  });

  if (!parsed.success) {
    cardsRedirect({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." });
  }

  const totalAmountCents = parseCurrencyToCents(parsed.data.total_amount);

  if (!totalAmountCents || totalAmountCents <= 0) {
    cardsRedirect({ error: "Informe um valor de compra maior que zero." });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase.rpc(
    "create_credit_card_purchase_with_installments",
    {
      p_category_id: parsed.data.category_id || null,
      p_credit_card_id: parsed.data.credit_card_id,
      p_description: parsed.data.description,
      p_installments_count: parsed.data.installments_count,
      p_purchase_date: parsed.data.purchase_date,
      p_total_amount_cents: totalAmountCents,
    },
  );

  if (error) {
    cardsRedirect({ error: "Não foi possível registrar a compra." });
  }

  revalidatePath("/cards");
  cardsRedirect({ success: "Compra parcelada registrada." });
}

export async function deleteCreditCardPurchase(formData: FormData) {
  const id = String(formData.get("id") ?? "");

  if (!id) {
    cardsRedirect({ error: "Compra inválida." });
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("credit_card_purchases")
    .delete()
    .eq("id", id);

  if (error) {
    cardsRedirect({ error: "Não foi possível excluir a compra." });
  }

  revalidatePath("/cards");
  revalidatePath("/dashboard");
  cardsRedirect({ success: "Compra excluída." });
}

type InstallmentPaymentRow = {
  id: string;
  user_id: string;
  amount_cents: number;
  due_date: string;
  status: "pending" | "paid" | "overdue" | "cancelled";
  paid_transaction_id: string | null;
  credit_card_purchases:
    | {
        description: string;
        category_id: string | null;
        installments_count: number;
        credit_cards: { name: string } | { name: string }[] | null;
      }
    | {
        description: string;
        category_id: string | null;
        installments_count: number;
        credit_cards: { name: string } | { name: string }[] | null;
      }[]
    | null;
};

function firstRelation<T>(relation: T | T[] | null) {
  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation;
}

export async function markInstallmentAsPaid(formData: FormData) {
  const id = String(formData.get("id") ?? "");

  if (!id) {
    cardsRedirect({ error: "Parcela inválida." });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("installments")
    .select(
      `
      id,
      user_id,
      amount_cents,
      due_date,
      status,
      paid_transaction_id,
      credit_card_purchases(
        description,
        category_id,
        installments_count,
        credit_cards(name)
      )
      `,
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  const installment = data as unknown as InstallmentPaymentRow | null;

  if (error || !installment) {
    cardsRedirect({ error: "Parcela não encontrada." });
  }

  if (installment.status === "paid" || installment.paid_transaction_id) {
    cardsRedirect({ success: "Parcela já estava paga." });
  }

  if (installment.status === "cancelled") {
    cardsRedirect({ error: "Parcela cancelada não pode ser paga." });
  }

  const purchase = firstRelation(installment.credit_card_purchases);
  const card = firstRelation(purchase?.credit_cards ?? null);
  const { data: transaction, error: transactionError } = await supabase
    .from("transactions")
    .insert({
      user_id: user.id,
      type: "expense",
      amount_cents: installment.amount_cents,
      description: `Pagamento parcela: ${purchase?.description ?? "Cartão"}`,
      category_id: purchase?.category_id ?? null,
      payment_method: "bank_transfer",
      transaction_date: todayInSaoPaulo(),
      source: "web",
    })
    .select("id")
    .single();

  if (transactionError || !transaction) {
    cardsRedirect({ error: "Não foi possível criar a transação de pagamento." });
  }

  const { error: updateError } = await supabase
    .from("installments")
    .update({
      status: "paid",
      paid_transaction_id: transaction.id,
    })
    .eq("id", installment.id)
    .eq("user_id", user.id);

  if (updateError) {
    await supabase
      .from("transactions")
      .delete()
      .eq("id", transaction.id)
      .eq("user_id", user.id);
    cardsRedirect({ error: "Não foi possível marcar a parcela como paga." });
  }

  revalidatePath("/cards");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  cardsRedirect({
    success: `Parcela paga${card?.name ? ` no ${card.name}` : ""}.`,
  });
}

function monthRange(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);

  if (!year || !monthNumber || monthNumber < 1 || monthNumber > 12) {
    return null;
  }

  const start = new Date(Date.UTC(year, monthNumber - 1, 1))
    .toISOString()
    .slice(0, 10);
  const end = new Date(Date.UTC(year, monthNumber, 1)).toISOString().slice(0, 10);

  return { end, start };
}

type InvoicePaymentRow = {
  id: string;
  user_id: string;
  amount_cents: number;
  status: "pending" | "paid" | "overdue" | "cancelled";
  credit_card_purchases:
    | {
        credit_card_id: string;
        credit_cards: { name: string } | { name: string }[] | null;
      }
    | {
        credit_card_id: string;
        credit_cards: { name: string } | { name: string }[] | null;
      }[]
    | null;
};

export async function markInvoiceAsPaid(formData: FormData) {
  const cardId = String(formData.get("card_id") ?? "");
  const month = String(formData.get("invoice_month") ?? "");
  const range = monthRange(month);

  if (!cardId || !range) {
    cardsRedirect({ error: "Fatura inválida." });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("installments")
    .select(
      `
      id,
      user_id,
      amount_cents,
      status,
      credit_card_purchases!inner(
        credit_card_id,
        credit_cards(name)
      )
      `,
    )
    .eq("user_id", user.id)
    .eq("credit_card_purchases.credit_card_id", cardId)
    .gte("due_date", range.start)
    .lt("due_date", range.end)
    .in("status", ["pending", "overdue"]);

  const installments = (data ?? []) as unknown as InvoicePaymentRow[];

  if (error) {
    cardsRedirect({ error: "Não foi possível carregar a fatura." });
  }

  if (installments.length === 0) {
    cardsRedirect({ success: "Fatura já estava paga." });
  }

  const totalCents = installments.reduce(
    (total, installment) => total + installment.amount_cents,
    0,
  );
  const purchase = firstRelation(installments[0]?.credit_card_purchases ?? null);
  const card = firstRelation(purchase?.credit_cards ?? null);
  const { data: transaction, error: transactionError } = await supabase
    .from("transactions")
    .insert({
      user_id: user.id,
      type: "expense",
      amount_cents: totalCents,
      description: `Pagamento fatura ${card?.name ?? "cartão"} ${month}`,
      category_id: null,
      payment_method: "bank_transfer",
      transaction_date: todayInSaoPaulo(),
      source: "web",
    })
    .select("id")
    .single();

  if (transactionError || !transaction) {
    cardsRedirect({ error: "Não foi possível criar o pagamento da fatura." });
  }

  const ids = installments.map((installment) => installment.id);
  const { error: updateError } = await supabase
    .from("installments")
    .update({
      status: "paid",
      paid_transaction_id: transaction.id,
    })
    .in("id", ids)
    .eq("user_id", user.id);

  if (updateError) {
    await supabase
      .from("transactions")
      .delete()
      .eq("id", transaction.id)
      .eq("user_id", user.id);
    cardsRedirect({ error: "Não foi possível marcar a fatura como paga." });
  }

  revalidatePath("/cards");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  cardsRedirect({ success: "Fatura marcada como paga." });
}
