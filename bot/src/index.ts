import { createFluxoPayBot } from "./bot";
import { botConfig } from "./config";
import { ProcessLease } from "./leases";
import { RuntimeHealth } from "./health";
import { logger } from "./logger";
import { repository } from "./supabase";

const bot = createFluxoPayBot();
const lease = new ProcessLease(repository, "telegram_polling", botConfig.leaseTtlSeconds, botConfig.leaseHeartbeatSeconds);
const health = new RuntimeHealth("bot");
await health.update({ status: "starting", lease_valid: false, polling_active: false });
health.start();
let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return; shuttingDown = true;
  logger.info("bot_shutdown", { signal }); await health.update({ status: "stopping", polling_active: false }); bot.stop();
  try { await lease.release(); } catch (error) { logger.warn("bot_lease_release_failed", { error }); }
}
process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

if (!await lease.acquire({ process: "fluxopay-bot" })) {
  logger.warn("bot_lease_unavailable", { leaseKey: lease.key }); await health.update({ status: "error", lease_valid: false }); process.exitCode = 1;
} else {
  logger.info("bot_lease_acquired", { leaseKey: lease.key });
  lease.startHeartbeat(async () => { logger.error("bot_lease_lost"); await health.update({ status: "error", lease_valid: false, polling_active: false }); await shutdown("lease_lost"); });
  try {
    await bot.start({ onStart: async () => { logger.info("bot_polling_start"); await health.update({ status: "active", lease_valid: true, polling_active: true }); } });
  } finally { health.stop(); await lease.release().catch(() => false); }
}
