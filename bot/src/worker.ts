import { Bot } from "grammy";
import { botConfig } from "./config";
import { ProcessLease } from "./leases";
import { logger } from "./logger";
import { runNotificationLoop } from "./notifications";
import { repository } from "./supabase";

const bot = new Bot(botConfig.telegramBotToken);
const lease = new ProcessLease(repository, "notification_worker", botConfig.leaseTtlSeconds, botConfig.leaseHeartbeatSeconds);
const controller = new AbortController(); let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return; shuttingDown = true; logger.info("worker_shutdown", { signal });
  // The lease stays held until the active sequential cycle finishes.
  controller.abort();
}
process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
if (!await lease.acquire({ process: "fluxopay-worker" })) {
  logger.warn("worker_lease_unavailable", { leaseKey: lease.key }); process.exitCode = 1;
} else {
  lease.startHeartbeat(async () => { logger.error("worker_lease_lost"); await shutdown("lease_lost"); });
  try { await runNotificationLoop(bot, lease.ownerId, controller.signal); }
  finally {
    try { await lease.release(); } catch (error) { logger.warn("worker_lease_release_failed", { error }); }
  }
}
