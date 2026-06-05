"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parseCurrencyToCents } from "@/features/transactions/money";
import { transactionFormSchema } from "@/features/transactions/schemas";
import { createClient } from "@/lib/supabase/server";

function transactionRedirect(
  path: string,
  params: Record<string, string>,
): never {
  const query = new URLSearchParams(params);
  redirect(`${path}?${query.toString()}`);
}

function parseFormData(formData: FormData) {
  const parsed = transactionFormSchema.safeParse({
    type: formData.get("type"),
    amount: formData.get("amount"),
    description: formData.get("description"),
    category_id: formData.get("category_id"),
    payment_method: formData.get("payment_method"),
    transaction_date: formData.get("transaction_date"),
  });

  if (!parsed.success) {
    return {
      data: null,
      error: parsed.error.issues[0]?.message ?? "Dados invalidos.",
    };
  }

  const amountCents = parseCurrencyToCents(parsed.data.amount);

  if (!amountCents || amountCents <= 0) {
    return {
      data: null,
      error: "Informe um valor maior que zero.",
    };
  }

  return {
    data: {
      ...parsed.data,
      amount_cents: amountCents,
      category_id: parsed.data.category_id || null,
    },
    error: null,
  };
}

export async function createTransaction(formData: FormData) {
  const parsed = parseFormData(formData);

  if (parsed.error || !parsed.data) {
    transactionRedirect("/transactions", { error: parsed.error ?? "Dados invalidos." });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    type: parsed.data.type,
    amount_cents: parsed.data.amount_cents,
    description: parsed.data.description,
    category_id: parsed.data.category_id,
    payment_method: parsed.data.payment_method,
    transaction_date: parsed.data.transaction_date,
    source: "web",
  });

  if (error) {
    transactionRedirect("/transactions", {
      error: "Não foi possível criar a transação.",
    });
  }

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  transactionRedirect("/transactions", { success: "Transacao criada." });
}

export async function updateTransaction(id: string, formData: FormData) {
  const parsed = parseFormData(formData);

  if (parsed.error || !parsed.data) {
    transactionRedirect(`/transactions/${id}/edit`, {
      error: parsed.error ?? "Dados invalidos.",
    });
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("transactions")
    .update({
      type: parsed.data.type,
      amount_cents: parsed.data.amount_cents,
      description: parsed.data.description,
      category_id: parsed.data.category_id,
      payment_method: parsed.data.payment_method,
      transaction_date: parsed.data.transaction_date,
    })
    .eq("id", id);

  if (error) {
    transactionRedirect(`/transactions/${id}/edit`, {
      error: "Não foi possível atualizar a transação.",
    });
  }

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  transactionRedirect("/transactions", { success: "Transacao atualizada." });
}

export async function deleteTransaction(formData: FormData) {
  const id = String(formData.get("id") ?? "");

  if (!id) {
    transactionRedirect("/transactions", { error: "Transacao invalida." });
  }

  const supabase = await createClient();
  const { error } = await supabase.from("transactions").delete().eq("id", id);

  if (error) {
    transactionRedirect("/transactions", {
      error: "Não foi possível excluir a transação.",
    });
  }

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  transactionRedirect("/transactions", { success: "Transacao excluida." });
}
