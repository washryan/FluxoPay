import { createClient } from "@/lib/supabase/server";

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

export async function syncOverdueStatuses() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const today = todayInSaoPaulo();
  const [billsResult, installmentsResult] = await Promise.all([
    supabase
      .from("bills")
      .update({ status: "overdue" })
      .eq("user_id", user.id)
      .eq("status", "pending")
      .lt("due_date", today),
    supabase
      .from("installments")
      .update({ status: "overdue" })
      .eq("user_id", user.id)
      .eq("status", "pending")
      .lt("due_date", today),
  ]);

  return billsResult.error ?? installmentsResult.error;
}
