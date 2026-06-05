"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { creditCardSchema } from "@/features/cards/schemas";
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
