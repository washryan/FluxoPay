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
    type: formData.get("type"),
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
    status: "pending",
    type: parsed.data.type,
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

  if (!id || !["pending", "overdue", "cancelled"].includes(status)) {
    billsRedirect({ error: "Conta inválida." });
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("bills")
    .update({ status })
    .eq("id", id)
    .in("status", ["pending", "overdue"]);

  if (error) {
    billsRedirect({ error: "Não foi possível atualizar a conta." });
  }

  revalidatePath("/bills");
  revalidatePath("/dashboard");
  billsRedirect({ success: "Conta atualizada." });
}

function todayInSaoPaulo() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
}

export async function payBill(formData: FormData) {
  const id = String(formData.get("id") ?? "");

  if (!id) {
    billsRedirect({ error: "Conta inválida." });
  }

  const paymentDate = todayInSaoPaulo();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase.rpc("pay_bill", {
    p_bill_id: id,
    p_payment_date: paymentDate,
  });

  if (error) {
    const message = error.message.includes("bill_type_required")
      ? "Classifique a conta como entrada ou saída antes de pagar."
      : error.message.includes("bill_not_found")
        ? "Conta não encontrada."
        : error.message.includes("bill_not_payable")
          ? "Esta conta não pode ser paga no status atual."
          : "Não foi possível registrar o pagamento.";
    billsRedirect({ error: message });
  }

  revalidatePath("/bills");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/resumo");
  billsRedirect({
    success: (data as { already_paid?: boolean } | null)?.already_paid
      ? "Esta conta já estava paga."
      : "Pagamento registrado no saldo realizado.",
  });
}

export async function classifyBill(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const type = String(formData.get("type") ?? "");

  if (!id || !["income", "expense"].includes(type)) {
    billsRedirect({ error: "Escolha se esta conta é uma entrada ou uma saída." });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("bills")
    .update({ type })
    .eq("id", id)
    .eq("user_id", user.id)
    .is("type", null)
    .select("id")
    .maybeSingle();

  if (error) {
    billsRedirect({ error: "Não foi possível classificar a conta." });
  }

  if (!data) {
    billsRedirect({ error: "Conta não encontrada ou já classificada." });
  }

  revalidatePath("/bills");
  billsRedirect({
    success: "Conta classificada. Agora você pode registrar o pagamento.",
  });
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
