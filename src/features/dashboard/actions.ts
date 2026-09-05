"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parseSignedCurrencyToCents } from "@/features/dashboard/money";
import { createClient } from "@/lib/supabase/server";

export async function updateOpeningBalance(formData: FormData) {
  const openingBalance = parseSignedCurrencyToCents(
    String(formData.get("opening_balance") ?? ""),
  );

  if (openingBalance === null) {
    redirect("/dashboard?error=Informe um saldo inicial valido.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ opening_balance_cents: openingBalance })
    .eq("id", user.id);

  if (error) {
    redirect("/dashboard?error=Nao foi possivel atualizar o saldo inicial.");
  }

  revalidatePath("/dashboard");
  redirect("/dashboard?success=Saldo inicial atualizado.");
}
