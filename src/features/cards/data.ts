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
