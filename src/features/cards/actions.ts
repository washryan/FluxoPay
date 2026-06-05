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

function parseIsoDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return { day, monthIndex: month - 1, year };
}

function daysInMonth(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function formatInstallmentDueDate(
  baseYear: number,
  baseMonthIndex: number,
  offset: number,
  dueDay: number,
) {
  const monthCursor = baseMonthIndex + offset;
  const year = baseYear + Math.floor(monthCursor / 12);
  const monthIndex = ((monthCursor % 12) + 12) % 12;
  const day = Math.min(dueDay, daysInMonth(year, monthIndex));

  return new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10);
}

function buildInstallments({
  closingDay,
  dueDay,
  installmentsCount,
  purchaseDate,
  purchaseId,
  totalAmountCents,
  userId,
}: {
  closingDay: number;
  dueDay: number;
  installmentsCount: number;
  purchaseDate: string;
  purchaseId: string;
  totalAmountCents: number;
  userId: string;
}) {
  const purchase = parseIsoDate(purchaseDate);
  const firstDueMonthIndex =
    purchase.day > closingDay ? purchase.monthIndex + 1 : purchase.monthIndex;
  const baseAmount = Math.floor(totalAmountCents / installmentsCount);
  const remainder = totalAmountCents % installmentsCount;

  return Array.from({ length: installmentsCount }, (_, index) => ({
    user_id: userId,
    purchase_id: purchaseId,
    installment_number: index + 1,
    amount_cents: baseAmount + (index < remainder ? 1 : 0),
    due_date: formatInstallmentDueDate(
      purchase.year,
      firstDueMonthIndex,
      index,
      dueDay,
    ),
    status: "pending",
  }));
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

  const { data: card, error: cardError } = await supabase
    .from("credit_cards")
    .select("id, closing_day, due_day")
    .eq("id", parsed.data.credit_card_id)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (cardError || !card) {
    cardsRedirect({ error: "Cartão não encontrado ou inativo." });
  }

  const { data: purchase, error: purchaseError } = await supabase
    .from("credit_card_purchases")
    .insert({
      user_id: user.id,
      credit_card_id: parsed.data.credit_card_id,
      category_id: parsed.data.category_id || null,
      description: parsed.data.description,
      total_amount_cents: totalAmountCents,
      purchase_date: parsed.data.purchase_date,
      installments_count: parsed.data.installments_count,
      source: "web",
    })
    .select("id")
    .single();

  if (purchaseError || !purchase) {
    cardsRedirect({ error: "Não foi possível registrar a compra." });
  }

  const installments = buildInstallments({
    closingDay: card.closing_day,
    dueDay: card.due_day,
    installmentsCount: parsed.data.installments_count,
    purchaseDate: parsed.data.purchase_date,
    purchaseId: purchase.id,
    totalAmountCents,
    userId: user.id,
  });

  const { error: installmentsError } = await supabase
    .from("installments")
    .insert(installments);

  if (installmentsError) {
    await supabase
      .from("credit_card_purchases")
      .delete()
      .eq("id", purchase.id)
      .eq("user_id", user.id);
    cardsRedirect({ error: "Não foi possível gerar as parcelas." });
  }

  revalidatePath("/cards");
  revalidatePath("/dashboard");
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
