"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { billFormSchema } from "@/features/bills/schemas";
import { parseCurrencyToCents } from "@/features/transactions/money";
import { createClient } from "@/lib/supabase/server";

function billsRedirect(params: Record<string, string>): never {
  const query = new URLSearchParams(params);
  redirect(`/bills?${query.toString()}`);
}

export async function createBill(formData: FormData) {
  const parsed = billFormSchema.safeParse({
    name: formData.get("name"),
    amount: formData.get("amount"),
    due_date: formData.get("due_date"),
    status: formData.get("status"),
    recurrence: formData.get("recurrence"),
    category_id: formData.get("category_id"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    billsRedirect({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." });
  }

  const amountCents = parseCurrencyToCents(parsed.data.amount);

  if (!amountCents || amountCents <= 0) {
    billsRedirect({ error: "Informe um valor maior que zero." });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase.from("bills").insert({
    user_id: user.id,
    name: parsed.data.name,
    amount_cents: amountCents,
    due_date: parsed.data.due_date,
    status: parsed.data.status,
    recurrence: parsed.data.recurrence,
    category_id: parsed.data.category_id || null,
    notes: parsed.data.notes || null,
    source: "web",
  });

  if (error) {
    billsRedirect({ error: "Não foi possível criar a conta." });
  }

  revalidatePath("/bills");
  revalidatePath("/dashboard");
  billsRedirect({ success: "Conta criada." });
}

export async function updateBillStatus(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!id || !["pending", "paid", "overdue", "cancelled"].includes(status)) {
    billsRedirect({ error: "Conta inválida." });
  }

  const supabase = await createClient();
  const { error } = await supabase.from("bills").update({ status }).eq("id", id);

  if (error) {
    billsRedirect({ error: "Não foi possível atualizar a conta." });
  }

  revalidatePath("/bills");
  revalidatePath("/dashboard");
  billsRedirect({ success: "Conta atualizada." });
}

export async function deleteBill(formData: FormData) {
  const id = String(formData.get("id") ?? "");

  if (!id) {
    billsRedirect({ error: "Conta inválida." });
  }

  const supabase = await createClient();
  const { error } = await supabase.from("bills").delete().eq("id", id);

  if (error) {
    billsRedirect({ error: "Não foi possível excluir a conta." });
  }

  revalidatePath("/bills");
  revalidatePath("/dashboard");
  billsRedirect({ success: "Conta excluída." });
}
