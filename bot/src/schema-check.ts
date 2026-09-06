import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
const client = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
const sentinel = "00000000-0000-0000-0000-000000000000";

async function check(name: string, operation: PromiseLike<{ error: { message: string } | null }>) {
  const { error } = await operation;
  if (error) throw new Error(`Required F2.1 schema object is unavailable: ${name}`);
}

await check("bot_pending_confirmations.confirmed_transaction_id",
  client.from("bot_pending_confirmations").select("confirmed_transaction_id").limit(1));
await check("process_leases", client.from("process_leases").select("lease_key").limit(1));
await check("notification_delivery_claims", client.from("notification_delivery_claims").select("id,status").limit(1));
await check("confirm_bot_transaction", client.rpc("confirm_bot_transaction", { p_confirmation_id: sentinel, p_telegram_user_id: 0 }));
await check("activate_telegram_link", client.rpc("activate_telegram_link", { p_token_hash: "invalid", p_telegram_user_id: 0, p_telegram_chat_id: 0, p_telegram_username: null }));
await check("get_bot_current_balance", client.rpc("get_bot_current_balance", { p_telegram_user_id: 0 }));
await check("heartbeat_process_lease", client.rpc("heartbeat_process_lease", { p_lease_key: "schema_check", p_owner_id: sentinel, p_ttl_seconds: 60 }));
await check("release_process_lease", client.rpc("release_process_lease", { p_lease_key: "schema_check", p_owner_id: sentinel }));
await check("reserve_notification_delivery", client.rpc("reserve_notification_delivery", {
  p_user_id: sentinel, p_telegram_link_id: sentinel, p_notification_type: "schema_check", p_dedupe_key: "schema_check",
  p_owner_id: sentinel, p_reservation_seconds: 60, p_max_attempts: 1, p_reference_table: null, p_reference_id: null,
}));
await check("complete_notification_delivery", client.rpc("complete_notification_delivery", {
  p_claim_id: sentinel, p_owner_id: sentinel, p_outcome: "failed", p_error: null, p_next_retry_at: null,
}));
console.log("F2.1 schema compatibility: PASS");
