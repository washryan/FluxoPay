import { createFluxoPayBot } from "./bot";
import { botConfig } from "./config";
import { ProcessLease } from "./leases";
import { logger } from "./logger";
import { repository } from "./supabase";

const bot = createFluxoPayBot();
const lease = new ProcessLease(repository, "telegram_polling", botConfig.leaseTtlSeconds, botConfig.leaseHeartbeatSeconds);
let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return; shuttingDown = true;
  logger.info("bot_shutdown", { signal }); bot.stop();
  try { await lease.release(); } catch (error) { logger.warn("bot_lease_release_failed", { error }); }
}
process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

if (!await lease.acquire({ process: "fluxopay-bot" })) {
  logger.warn("bot_lease_unavailable", { leaseKey: lease.key }); process.exitCode = 1;
} else {
  lease.startHeartbeat(async () => { logger.error("bot_lease_lost"); await shutdown("lease_lost"); });
  logger.info("bot_polling_start");
  try { await bot.start(); } finally { await lease.release().catch(() => false); }
}
