"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  adjustCreditCardPurchaseInstallmentsSchema,
  creditCardPurchaseSchema,
  creditCardSchema,
  invoicePaymentSchema,
  updateCreditCardSchema,
} from "@/features/cards/schemas";
import { parseCurrencyToCents } from "@/features/transactions/money";
import { createClient } from "@/lib/supabase/server";

function cardsRedirect(
  params: Record<string, string>,
  formData?: FormData,
): never {
  const query = new URLSearchParams(params);
  const invoiceStatus = String(formData?.get("cards_invoice_status") ?? "");
  const invoiceSearch = String(formData?.get("cards_invoice_search") ?? "");
  const anchor = String(formData?.get("cards_return_anchor") ?? "");

  if (
    invoiceStatus === "paid" ||
    invoiceStatus === "open" ||
    invoiceStatus === "overdue"
  ) {
    query.set("invoiceStatus", invoiceStatus);
  }

  if (invoiceSearch.trim()) {
    query.set("q", invoiceSearch.trim());
  }

  const queryString = query.toString();
  const hash = /^[a-z0-9-]+$/i.test(anchor) ? `#${anchor}` : "";

  redirect(`/cards${queryString ? `?${queryString}` : ""}${hash}`);
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

function addMonthsToMonth(month: string, offset: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + offset, 1));

  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function dueDateForMonth(month: string, dueDay: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();

  return `${year}-${String(monthNumber).padStart(2, "0")}-${String(
    Math.min(dueDay, lastDay),
  ).padStart(2, "0")}`;
}

async function findNextOpenInvoiceDueDate({
  cardId,
  dueDay,
  invoiceMonth,
  supabase,
  userId,
}: {
  cardId: string;
  dueDay: number;
  invoiceMonth: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
}) {
  for (let offset = 1; offset <= 72; offset += 1) {
    const candidateMonth = addMonthsToMonth(invoiceMonth, offset);
    const range = monthRange(candidateMonth);

    if (!range) {
      continue;
    }

    const { data, error } = await supabase
      .from("installments")
      .select(
        `
        status,
        credit_card_purchases!inner(credit_card_id)
        `,
      )
      .eq("user_id", userId)
      .eq("credit_card_purchases.credit_card_id", cardId)
      .gte("due_date", range.start)
      .lt("due_date", range.end);

    if (error) {
      throw new Error("next_invoice_lookup_failed");
    }

    const statuses = (data ?? []).map((row) => row.status as string);
    const isClosedAsPaid =
      statuses.length > 0 && statuses.every((status) => status === "paid");

    if (!isClosedAsPaid) {
      return dueDateForMonth(candidateMonth, dueDay);
    }
  }

  throw new Error("next_invoice_not_found");
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

async function ensureInvoiceCategory(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  const slug = "fatura";
  const { data: existing, error: existingError } = await supabase
    .from("categories")
    .select("id")
    .eq("user_id", userId)
    .eq("slug", slug)
    .maybeSingle();

  if (existingError) {
    throw new Error("invoice_category_lookup_failed");
  }

  if (existing) {
    return existing.id as string;
  }

  const { data: created, error: createError } = await supabase
    .from("categories")
    .insert({
      user_id: userId,
      name: "Fatura",
      slug,
      color: "#0f172a",
      type: "expense",
      is_default: false,
    })
    .select("id")
    .single();

  if (!createError && created) {
    return created.id as string;
  }

  const { data: fallback, error: fallbackError } = await supabase
    .from("categories")
    .select("id")
    .eq("user_id", userId)
    .eq("slug", slugify("Fatura"))
    .single();

  if (fallbackError || !fallback) {
    throw new Error("invoice_category_create_failed");
  }

  return fallback.id as string;
}

export async function createCreditCard(formData: FormData) {
  const parsed = creditCardSchema.safeParse({
    name: formData.get("name"),
    closing_day: formData.get("closing_day"),
    due_day: formData.get("due_day"),
    limit: formData.get("limit"),
  });

  if (!parsed.success) {
    cardsRedirect(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      formData,
    );
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

export async function updateCreditCard(formData: FormData) {
  const parsed = updateCreditCardSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    closing_day: formData.get("closing_day"),
    due_day: formData.get("due_day"),
    limit: formData.get("limit"),
  });

  if (!parsed.success) {
    cardsRedirect(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      formData,
    );
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

  const { error } = await supabase
    .from("credit_cards")
    .update({
      closing_day: parsed.data.closing_day,
      due_day: parsed.data.due_day,
      limit_cents: limitCents,
      name: parsed.data.name,
    })
    .eq("id", parsed.data.id)
    .eq("user_id", user.id);

  if (error) {
    cardsRedirect({ error: "Não foi possível editar o cartão." });
  }

  revalidatePath("/cards");
  revalidatePath("/dashboard");
  revalidatePath("/resumo");
  cardsRedirect({ success: "Cartão atualizado." });
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
    cardsRedirect(
      { error: "Informe um valor de compra maior que zero." },
      formData,
    );
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
      p_skip_transaction_on_payment: false,
      p_total_amount_cents: totalAmountCents,
    },
  );

  if (error) {
    cardsRedirect(
      { error: "Não foi possível registrar a compra." },
      formData,
    );
  }

  revalidatePath("/cards");
  revalidatePath("/resumo");
  cardsRedirect({ success: "Compra parcelada registrada." }, formData);
}

export async function deleteCreditCardPurchase(formData: FormData) {
  const id = String(formData.get("id") ?? "");

  if (!id) {
    cardsRedirect({ error: "Compra inválida." }, formData);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: paidInstallments, error: paidLookupError } = await supabase
    .from("installments")
    .select("id")
    .eq("purchase_id", id)
    .eq("user_id", user.id)
    .eq("status", "paid")
    .limit(1);

  if (paidLookupError) {
    cardsRedirect(
      { error: "Não foi possível verificar a compra." },
      formData,
    );
  }

  if ((paidInstallments ?? []).length > 0) {
    cardsRedirect(
      {
        error:
          "Não é possível excluir uma compra com parcela paga. Revogue o pagamento antes.",
      },
      formData,
    );
  }

  const { error } = await supabase
    .from("credit_card_purchases")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    cardsRedirect({ error: "Não foi possível excluir a compra." }, formData);
  }

  revalidatePath("/cards");
  revalidatePath("/dashboard");
  revalidatePath("/resumo");
  cardsRedirect({ success: "Compra excluída." }, formData);
}

export async function adjustCreditCardPurchaseInstallments(formData: FormData) {
  const parsed = adjustCreditCardPurchaseInstallmentsSchema.safeParse({
    id: formData.get("id"),
    installments_count: formData.get("installments_count"),
  });

  if (!parsed.success) {
    cardsRedirect(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      formData,
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase.rpc("adjust_credit_card_purchase_installments", {
    p_installments_count: parsed.data.installments_count,
    p_purchase_id: parsed.data.id,
  });

  if (error) {
    const message = error.message.includes("purchase_not_found")
      ? "Compra não encontrada."
      : error.message.includes("source_invoice_purchase")
        ? "Parcelamentos gerados por pagamento de fatura devem ser ajustados revogando o pagamento original."
        : error.message.includes("new_count_must_be_lower")
          ? "Por enquanto, este ajuste só reduz a quantidade de parcelas da compra."
          : error.message.includes("paid_removed_installment")
            ? "Não é possível remover parcelas já pagas. Revogue o pagamento antes de ajustar."
            : "Não foi possível ajustar as parcelas da compra.";

    cardsRedirect({ error: message }, formData);
  }

  revalidatePath("/cards");
  revalidatePath("/dashboard");
  revalidatePath("/resumo");
  cardsRedirect(
    {
      success: `Compra ajustada para ${parsed.data.installments_count} parcelas.`,
    },
    formData,
  );
}

export async function revokeInvoicePayment(formData: FormData) {
  const transactionId = String(formData.get("transaction_id") ?? "");

  if (!transactionId) {
    cardsRedirect({ error: "Pagamento inválido." }, formData);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase.rpc("revoke_invoice_payment", {
    p_transaction_id: transactionId,
  });

  if (error) {
    cardsRedirect(
      {
        error: "Não foi possível revogar o pagamento da fatura.",
      },
      formData,
    );
  }

  revalidatePath("/cards");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/resumo");
  cardsRedirect(
    { success: "Pagamento revogado. A fatura voltou para em aberto." },
    formData,
  );
}

export async function moveInstallmentInvoice(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const direction = String(formData.get("direction") ?? "");

  if (!id || (direction !== "previous" && direction !== "next")) {
    cardsRedirect({ error: "Movimentação de parcela inválida." }, formData);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase.rpc("move_installment_to_adjacent_invoice", {
    p_direction: direction,
    p_installment_id: id,
  });

  if (error) {
    const message = error.message.includes("target_invoice_already_paid")
      ? "A fatura de destino já está paga. Revogue o pagamento antes de mover uma parcela para ela."
      : error.message.includes("installment_not_open")
        ? "Só é possível mover parcelas em aberto ou atrasadas."
        : "Não foi possível mover a parcela para outra fatura.";

    cardsRedirect({ error: message }, formData);
  }

  revalidatePath("/cards");
  revalidatePath("/dashboard");
  revalidatePath("/resumo");
  cardsRedirect(
    {
      success:
        direction === "previous"
          ? "Parcela adiantada para a fatura anterior."
          : "Parcela atrasada para a próxima fatura.",
    },
    formData,
  );
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
        skip_transaction_on_payment: boolean;
        credit_cards: { name: string } | { name: string }[] | null;
      }
    | {
        description: string;
        category_id: string | null;
        installments_count: number;
        skip_transaction_on_payment: boolean;
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
    cardsRedirect({ error: "Parcela inválida." }, formData);
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
        skip_transaction_on_payment,
        credit_cards(name)
      )
      `,
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  const installment = data as unknown as InstallmentPaymentRow | null;

  if (error || !installment) {
    cardsRedirect({ error: "Parcela não encontrada." }, formData);
  }

  if (installment.status === "paid" || installment.paid_transaction_id) {
    cardsRedirect({ success: "Parcela já estava paga." }, formData);
  }

  if (installment.status === "cancelled") {
    cardsRedirect(
      { error: "Parcela cancelada não pode ser paga." },
      formData,
    );
  }

  const purchase = firstRelation(installment.credit_card_purchases);
  const card = firstRelation(purchase?.credit_cards ?? null);

  if (purchase?.skip_transaction_on_payment) {
    const { error: updateError } = await supabase
      .from("installments")
      .update({ status: "paid" })
      .eq("id", installment.id)
      .eq("user_id", user.id);

    if (updateError) {
      cardsRedirect(
        { error: "Não foi possível marcar a parcela como paga." },
        formData,
      );
    }

    revalidatePath("/cards");
    revalidatePath("/dashboard");
    revalidatePath("/resumo");
    cardsRedirect(
      {
        success: `Parcela paga${card?.name ? ` no ${card.name}` : ""}.`,
      },
      formData,
    );
  }

  let invoiceCategoryId: string;

  try {
    invoiceCategoryId = await ensureInvoiceCategory(supabase, user.id);
  } catch {
    cardsRedirect(
      { error: "Não foi possível preparar a categoria Fatura." },
      formData,
    );
  }

  const { data: transaction, error: transactionError } = await supabase
    .from("transactions")
    .insert({
      user_id: user.id,
      type: "expense",
      amount_cents: installment.amount_cents,
      description: `Pagamento parcela: ${purchase?.description ?? "Cartão"}`,
      category_id: invoiceCategoryId,
      payment_method: "bank_transfer",
      transaction_date: todayInSaoPaulo(),
      source: "web",
    })
    .select("id")
    .single();

  if (transactionError || !transaction) {
    cardsRedirect(
      { error: "Não foi possível criar a transação de pagamento." },
      formData,
    );
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
    cardsRedirect(
      { error: "Não foi possível marcar a parcela como paga." },
      formData,
    );
  }

  revalidatePath("/cards");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/resumo");
  cardsRedirect(
    {
      success: `Parcela paga${card?.name ? ` no ${card.name}` : ""}.`,
    },
    formData,
  );
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
  purchase_id: string;
  installment_number: number;
  amount_cents: number;
  due_date: string;
  status: "pending" | "paid" | "overdue" | "cancelled";
  credit_card_purchases:
    | {
        credit_card_id: string;
        category_id: string | null;
        description: string;
        purchase_date: string;
        credit_cards:
          | { name: string; due_day: number }
          | { name: string; due_day: number }[]
          | null;
      }
    | {
        credit_card_id: string;
        category_id: string | null;
        description: string;
        purchase_date: string;
        credit_cards:
          | { name: string; due_day: number }
          | { name: string; due_day: number }[]
          | null;
      }[]
    | null;
};

export async function markInvoiceAsPaid(formData: FormData) {
  const parsed = invoicePaymentSchema.safeParse({
    card_id: formData.get("card_id"),
    invoice_month: formData.get("invoice_month"),
    payment_date: formData.get("payment_date"),
    payment_method: formData.get("payment_method"),
    paid_amount: formData.get("paid_amount"),
    payment_credit_card_id: formData.get("payment_credit_card_id"),
    credit_is_installment: formData.get("credit_is_installment"),
    credit_installments_count: formData.get("credit_installments_count"),
    credit_installment_amount: formData.get("credit_installment_amount"),
    carry_remaining_to_next_invoice: formData.get(
      "carry_remaining_to_next_invoice",
    ),
    invoice_is_installment: formData.get("invoice_is_installment"),
    invoice_down_payment_amount: formData.get("invoice_down_payment_amount"),
    invoice_installments_count: formData.get("invoice_installments_count"),
    invoice_installment_amount: formData.get("invoice_installment_amount"),
  });

  if (!parsed.success) {
    cardsRedirect(
      {
        error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
      },
      formData,
    );
  }

  const cardId = parsed.data.card_id;
  const month = parsed.data.invoice_month;
  const paymentDate = parsed.data.payment_date;
  const range = monthRange(month);

  if (!range) {
    cardsRedirect({ error: "Fatura inválida." }, formData);
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
      purchase_id,
      installment_number,
      amount_cents,
      due_date,
      status,
      credit_card_purchases!inner(
        credit_card_id,
        category_id,
        description,
        purchase_date,
        credit_cards(name, due_day)
      )
      `,
    )
    .eq("user_id", user.id)
    .eq("credit_card_purchases.credit_card_id", cardId)
    .gte("due_date", range.start)
    .lt("due_date", range.end)
    .in("status", ["pending", "overdue"])
    .order("due_date", { ascending: true })
    .order("created_at", { ascending: true });

  const installments = (data ?? []) as unknown as InvoicePaymentRow[];

  if (error) {
    cardsRedirect({ error: "Não foi possível carregar a fatura." }, formData);
  }

  if (installments.length === 0) {
    cardsRedirect({ success: "Fatura já estava paga." }, formData);
  }

  const openCents = installments.reduce(
    (total, installment) => total + installment.amount_cents,
    0,
  );
  const purchase = firstRelation(installments[0]?.credit_card_purchases ?? null);
  const card = firstRelation(purchase?.credit_cards ?? null);
  let invoiceCategoryId: string;

  try {
    invoiceCategoryId = await ensureInvoiceCategory(supabase, user.id);
  } catch {
    cardsRedirect(
      { error: "Não foi possível preparar a categoria Fatura." },
      formData,
    );
  }

  const isCreditPayment = parsed.data.payment_method === "credit_card";
  const isInvoiceInstallmentPayment =
    parsed.data.invoice_is_installment === "yes";
  let paidCents = parseCurrencyToCents(parsed.data.paid_amount ?? "") ?? 0;

  if (isInvoiceInstallmentPayment) {
    paidCents =
      parseCurrencyToCents(parsed.data.invoice_down_payment_amount ?? "") ?? 0;
  } else if (isCreditPayment && parsed.data.credit_is_installment === "yes") {
    paidCents =
      (parsed.data.credit_installments_count ?? 1) *
      (parseCurrencyToCents(parsed.data.credit_installment_amount ?? "") ?? 0);
  }

  if (paidCents <= 0) {
    cardsRedirect({ error: "Informe um valor pago maior que zero." }, formData);
  }

  const remainingCents = openCents - paidCents;
  const isPartialPayment =
    !isInvoiceInstallmentPayment && remainingCents > 0;
  const shouldCarryRemaining =
    parsed.data.carry_remaining_to_next_invoice === "yes";
  const invoiceInstallmentsCount =
    parsed.data.invoice_installments_count ?? 0;
  const invoiceInstallmentCents =
    parseCurrencyToCents(parsed.data.invoice_installment_amount ?? "") ?? 0;
  const invoiceInstallmentTotalCents =
    invoiceInstallmentsCount * invoiceInstallmentCents;

  if (isInvoiceInstallmentPayment) {
    if (paidCents >= openCents) {
      cardsRedirect(
        {
          error:
            "A entrada deve ser menor que a fatura. Para quitar tudo, use o pagamento normal.",
        },
        formData,
      );
    }

    if (invoiceInstallmentsCount < 1 || invoiceInstallmentCents <= 0) {
      cardsRedirect(
        {
          error:
            "Informe a quantidade de parcelas e um valor de parcela maior que zero.",
        },
        formData,
      );
    }
  }

  const interestCents = Math.max(0, paidCents - openCents);
  const paymentDescription =
    isInvoiceInstallmentPayment
      ? `Entrada parcelamento fatura ${card?.name ?? "cartão"} ${month}`
      : isPartialPayment
      ? `Pagamento parcial fatura ${card?.name ?? "cartão"} ${month}`
      : interestCents > 0
      ? `Pagamento fatura ${card?.name ?? "cartão"} ${month} com juros`
      : `Pagamento fatura ${card?.name ?? "cartão"} ${month}`;
  const { data: transaction, error: transactionError } = await supabase
    .from("transactions")
    .insert({
      user_id: user.id,
      type: "expense",
      amount_cents: paidCents,
      description: paymentDescription,
      category_id: invoiceCategoryId,
      payment_method: parsed.data.payment_method,
      transaction_date: paymentDate,
      source: "web",
      notes:
        isInvoiceInstallmentPayment
          ? `Fatura em aberto: ${openCents} centavos. Entrada: ${paidCents} centavos. Parcelamento futuro: ${invoiceInstallmentTotalCents} centavos em ${invoiceInstallmentsCount} parcelas.`
          : isPartialPayment
          ? shouldCarryRemaining
            ? `Fatura em aberto: ${openCents} centavos. Restante transferido: ${remainingCents} centavos.`
            : `Fatura em aberto: ${openCents} centavos. Restante mantido na mesma fatura: ${remainingCents} centavos.`
          : interestCents > 0
          ? `Fatura em aberto: ${openCents} centavos. Juros/taxas: ${interestCents} centavos.`
          : null,
    })
    .select("id")
    .single();

  if (transactionError || !transaction) {
    cardsRedirect(
      { error: "Não foi possível criar o pagamento da fatura." },
      formData,
    );
  }

  let transferredPurchaseId: string | null = null;
  let carriedPurchaseId: string | null = null;
  let invoiceInstallmentPurchaseId: string | null = null;

  if (isCreditPayment) {
    const paymentCardId = parsed.data.payment_credit_card_id;

    if (!paymentCardId || paymentCardId === cardId) {
      await supabase
        .from("transactions")
        .delete()
        .eq("id", transaction.id)
        .eq("user_id", user.id);
      cardsRedirect(
        {
          error: "Selecione outro cartão para pagar esta fatura no crédito.",
        },
        formData,
      );
    }

    const installmentsCount =
      parsed.data.credit_is_installment === "yes"
        ? (parsed.data.credit_installments_count ?? 1)
        : 1;

    const { data: transferredId, error: transferredError } = await supabase.rpc(
      "create_credit_card_purchase_with_installments",
      {
        p_category_id: invoiceCategoryId,
        p_credit_card_id: paymentCardId,
        p_description: paymentDescription,
        p_installments_count: installmentsCount,
        p_purchase_date: paymentDate,
        p_skip_transaction_on_payment: true,
        p_total_amount_cents: paidCents,
      },
    );

    if (transferredError || !transferredId) {
      await supabase
        .from("transactions")
        .delete()
        .eq("id", transaction.id)
        .eq("user_id", user.id);
      cardsRedirect(
        {
          error: "Não foi possível criar as parcelas no cartão de pagamento.",
        },
        formData,
      );
    }

    transferredPurchaseId = transferredId as string;

    const { error: linkError } = await supabase
      .from("credit_card_purchases")
      .update({ source_invoice_transaction_id: transaction.id })
      .eq("id", transferredPurchaseId)
      .eq("user_id", user.id);

    if (linkError) {
      await supabase
        .from("credit_card_purchases")
        .delete()
        .eq("id", transferredPurchaseId)
        .eq("user_id", user.id);
      await supabase
        .from("transactions")
        .delete()
        .eq("id", transaction.id)
        .eq("user_id", user.id);
      cardsRedirect(
        {
          error: "Não foi possível vincular o detalhamento da fatura paga.",
        },
        formData,
      );
    }
  }

  if (isInvoiceInstallmentPayment) {
    const cardDueDay = card?.due_day;

    if (!cardDueDay) {
      await supabase
        .from("transactions")
        .delete()
        .eq("id", transaction.id)
        .eq("user_id", user.id);
      cardsRedirect(
        {
          error: "Não foi possível identificar o vencimento do cartão.",
        },
        formData,
      );
    }

    const { data: installmentPurchase, error: installmentPurchaseError } =
      await supabase
        .from("credit_card_purchases")
        .insert({
          user_id: user.id,
          credit_card_id: cardId,
          category_id: invoiceCategoryId,
          description: `Parcelamento fatura ${card?.name ?? "cartão"} ${month}`,
          total_amount_cents: invoiceInstallmentTotalCents,
          purchase_date: paymentDate,
          installments_count: invoiceInstallmentsCount,
          source: "web",
          skip_transaction_on_payment: false,
          source_invoice_transaction_id: transaction.id,
        })
        .select("id")
        .single();

    if (installmentPurchaseError || !installmentPurchase) {
      await supabase
        .from("transactions")
        .delete()
        .eq("id", transaction.id)
        .eq("user_id", user.id);
      cardsRedirect(
        {
          error: "Não foi possível criar o parcelamento da fatura.",
        },
        formData,
      );
    }

    invoiceInstallmentPurchaseId = installmentPurchase.id as string;

    let previousInvoiceMonth = month;

    for (
      let installmentNumber = 1;
      installmentNumber <= invoiceInstallmentsCount;
      installmentNumber += 1
    ) {
      let installmentDueDate: string;

      try {
        installmentDueDate = await findNextOpenInvoiceDueDate({
          cardId,
          dueDay: cardDueDay,
          invoiceMonth: previousInvoiceMonth,
          supabase,
          userId: user.id,
        });
      } catch {
        await supabase
          .from("credit_card_purchases")
          .delete()
          .eq("id", invoiceInstallmentPurchaseId)
          .eq("user_id", user.id);
        await supabase
          .from("transactions")
          .delete()
          .eq("id", transaction.id)
          .eq("user_id", user.id);
        cardsRedirect(
          {
            error:
              "Não foi possível encontrar uma fatura futura para o parcelamento.",
          },
          formData,
        );
      }

      const { error: installmentError } = await supabase
        .from("installments")
        .insert({
          user_id: user.id,
          purchase_id: invoiceInstallmentPurchaseId,
          installment_number: installmentNumber,
          amount_cents: invoiceInstallmentCents,
          due_date: installmentDueDate,
          status:
            installmentDueDate < todayInSaoPaulo() ? "overdue" : "pending",
        });

      if (installmentError) {
        await supabase
          .from("credit_card_purchases")
          .delete()
          .eq("id", invoiceInstallmentPurchaseId)
          .eq("user_id", user.id);
        await supabase
          .from("transactions")
          .delete()
          .eq("id", transaction.id)
          .eq("user_id", user.id);
        cardsRedirect(
          {
            error: "Não foi possível criar as parcelas do parcelamento.",
          },
          formData,
        );
      }

      previousInvoiceMonth = installmentDueDate.slice(0, 7);
    }
  }

  if (isPartialPayment && shouldCarryRemaining) {
    const cardDueDay = card?.due_day;

    if (!cardDueDay) {
      if (transferredPurchaseId) {
        await supabase
          .from("credit_card_purchases")
          .delete()
          .eq("id", transferredPurchaseId)
          .eq("user_id", user.id);
      }

      await supabase
        .from("transactions")
        .delete()
        .eq("id", transaction.id)
        .eq("user_id", user.id);
      cardsRedirect(
        {
          error: "Não foi possível identificar o vencimento do cartão.",
        },
        formData,
      );
    }

    let carriedDueDate: string;

    try {
      carriedDueDate = await findNextOpenInvoiceDueDate({
        cardId,
        dueDay: cardDueDay,
        invoiceMonth: month,
        supabase,
        userId: user.id,
      });
    } catch {
      if (transferredPurchaseId) {
        await supabase
          .from("credit_card_purchases")
          .delete()
          .eq("id", transferredPurchaseId)
          .eq("user_id", user.id);
      }

      await supabase
        .from("transactions")
        .delete()
        .eq("id", transaction.id)
        .eq("user_id", user.id);
      cardsRedirect(
        {
          error: "Não foi possível encontrar a próxima fatura em aberto.",
        },
        formData,
      );
    }

    const { data: carriedPurchase, error: carriedPurchaseError } =
      await supabase
        .from("credit_card_purchases")
        .insert({
          user_id: user.id,
          credit_card_id: cardId,
          category_id: invoiceCategoryId,
          description: "Restante do mês passado",
          total_amount_cents: remainingCents,
          purchase_date: paymentDate,
          installments_count: 1,
          source: "web",
          skip_transaction_on_payment: false,
          source_invoice_transaction_id: transaction.id,
        })
        .select("id")
        .single();

    if (carriedPurchaseError || !carriedPurchase) {
      if (transferredPurchaseId) {
        await supabase
          .from("credit_card_purchases")
          .delete()
          .eq("id", transferredPurchaseId)
          .eq("user_id", user.id);
      }

      await supabase
        .from("transactions")
        .delete()
        .eq("id", transaction.id)
        .eq("user_id", user.id);
      cardsRedirect(
        {
          error: "Não foi possível transferir o restante para a próxima fatura.",
        },
        formData,
      );
    }

    carriedPurchaseId = carriedPurchase.id as string;

    const { error: carriedInstallmentError } = await supabase
      .from("installments")
      .insert({
        user_id: user.id,
        purchase_id: carriedPurchaseId,
        installment_number: 1,
        amount_cents: remainingCents,
        due_date: carriedDueDate,
        status: carriedDueDate < todayInSaoPaulo() ? "overdue" : "pending",
      });

    if (carriedInstallmentError) {
      await supabase
        .from("credit_card_purchases")
        .delete()
        .eq("id", carriedPurchaseId)
        .eq("user_id", user.id);

      if (transferredPurchaseId) {
        await supabase
          .from("credit_card_purchases")
          .delete()
          .eq("id", transferredPurchaseId)
          .eq("user_id", user.id);
      }

      await supabase
        .from("transactions")
        .delete()
        .eq("id", transaction.id)
        .eq("user_id", user.id);
      cardsRedirect(
        {
          error: "Não foi possível criar a parcela do restante.",
        },
        formData,
      );
    }
  }

  if (isPartialPayment && !shouldCarryRemaining) {
    let paymentLeftCents = paidCents;

    for (const installment of installments) {
      if (paymentLeftCents <= 0) {
        break;
      }

      const installmentPurchase = firstRelation(
        installment.credit_card_purchases,
      );

      if (!installmentPurchase) {
        await supabase.rpc("revoke_invoice_payment", {
          p_transaction_id: transaction.id,
        });
        cardsRedirect(
          {
            error: "Não foi possível identificar a compra da parcela.",
          },
          formData,
        );
      }

      if (paymentLeftCents >= installment.amount_cents) {
        const { error: paidInstallmentError } = await supabase
          .from("installments")
          .update({
            status: "paid",
            paid_transaction_id: transaction.id,
          })
          .eq("id", installment.id)
          .eq("user_id", user.id);

        if (paidInstallmentError) {
          await supabase.rpc("revoke_invoice_payment", {
            p_transaction_id: transaction.id,
          });
          cardsRedirect(
            {
              error: "Não foi possível abater o pagamento parcial.",
            },
            formData,
          );
        }

        paymentLeftCents -= installment.amount_cents;
        continue;
      }

      const paidPortionCents = paymentLeftCents;
      const remainingPortionCents =
        installment.amount_cents - paidPortionCents;
      const { error: splitPaidError } = await supabase
        .from("installments")
        .update({
          amount_cents: paidPortionCents,
          partial_payment_original_amount_cents: installment.amount_cents,
          status: "paid",
          paid_transaction_id: transaction.id,
        })
        .eq("id", installment.id)
        .eq("user_id", user.id);

      if (splitPaidError) {
        await supabase.rpc("revoke_invoice_payment", {
          p_transaction_id: transaction.id,
        });
        cardsRedirect(
          {
            error: "Não foi possível dividir a parcela parcialmente paga.",
          },
          formData,
        );
      }

      const { data: remainingPurchase, error: remainingPurchaseError } =
        await supabase
          .from("credit_card_purchases")
          .insert({
            user_id: user.id,
            credit_card_id: cardId,
            category_id: installmentPurchase.category_id,
            description: `Restante: ${installmentPurchase.description}`,
            total_amount_cents: remainingPortionCents,
            purchase_date: installmentPurchase.purchase_date,
            installments_count: 1,
            source: "web",
            skip_transaction_on_payment: false,
            source_invoice_transaction_id: transaction.id,
          })
          .select("id")
          .single();

      if (remainingPurchaseError || !remainingPurchase) {
        await supabase.rpc("revoke_invoice_payment", {
          p_transaction_id: transaction.id,
        });
        cardsRedirect(
          {
            error: "Não foi possível manter o restante na fatura atual.",
          },
          formData,
        );
      }

      const { error: remainingInstallmentError } = await supabase
        .from("installments")
        .insert({
          user_id: user.id,
          purchase_id: remainingPurchase.id,
          installment_number: 1,
          amount_cents: remainingPortionCents,
          due_date: installment.due_date,
          status:
            installment.due_date < todayInSaoPaulo() ? "overdue" : "pending",
        });

      if (remainingInstallmentError) {
        await supabase.rpc("revoke_invoice_payment", {
          p_transaction_id: transaction.id,
        });
        cardsRedirect(
          {
            error: "Não foi possível criar o restante na fatura atual.",
          },
          formData,
        );
      }

      paymentLeftCents = 0;
    }
  } else {
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
      if (invoiceInstallmentPurchaseId) {
        await supabase
          .from("credit_card_purchases")
          .delete()
          .eq("id", invoiceInstallmentPurchaseId)
          .eq("user_id", user.id);
      }

      if (carriedPurchaseId) {
        await supabase
          .from("credit_card_purchases")
          .delete()
          .eq("id", carriedPurchaseId)
          .eq("user_id", user.id);
      }

      if (transferredPurchaseId) {
        await supabase
          .from("credit_card_purchases")
          .delete()
          .eq("id", transferredPurchaseId)
          .eq("user_id", user.id);
      }

      await supabase
        .from("transactions")
        .delete()
        .eq("id", transaction.id)
        .eq("user_id", user.id);
      cardsRedirect(
        { error: "Não foi possível marcar a fatura como paga." },
        formData,
      );
    }
  }

  revalidatePath("/cards");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/resumo");
  cardsRedirect(
    {
      success: isInvoiceInstallmentPayment
        ? "Parcelamento de fatura registrado. A entrada foi lançada e as parcelas foram criadas nas próximas faturas."
        : isPartialPayment
        ? shouldCarryRemaining
          ? "Pagamento parcial registrado. O restante foi enviado para a próxima fatura."
          : "Pagamento parcial registrado. O restante continua nesta fatura."
        : "Fatura marcada como paga.",
    },
    formData,
  );
}
