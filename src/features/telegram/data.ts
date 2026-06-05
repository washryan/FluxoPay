import { createClient } from "@/lib/supabase/server";

export type TelegramLink = {
  id: string;
  telegram_user_id: number | null;
  telegram_chat_id: number | null;
  telegram_username: string | null;
  status: "pending" | "active" | "revoked";
  link_token_expires_at: string | null;
  linked_at: string | null;
  revoked_at: string | null;
  last_seen_at: string | null;
  created_at: string;
};

export async function getTelegramLinks() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("telegram_links")
    .select(
      "id, telegram_user_id, telegram_chat_id, telegram_username, status, link_token_expires_at, linked_at, revoked_at, last_seen_at, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    return { error: error.message, links: [] as TelegramLink[] };
  }

  return { error: null, links: (data ?? []) as TelegramLink[] };
}
