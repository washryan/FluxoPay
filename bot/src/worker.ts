import { Bot } from "grammy";
import { botConfig } from "./config";
import { ProcessLease } from "./leases";
import { RuntimeHealth } from "./health";
import { logger } from "./logger";
import { runNotificationLoop } from "./notifications";
import { repository } from "./supabase";

const bot = new Bot(botConfig.telegramBotToken);
const lease = new ProcessLease(repository, "notification_worker", botConfig.leaseTtlSeconds, botConfig.leaseHeartbeatSeconds);
const controller = new AbortController(); let shuttingDown = false;
const health = new RuntimeHealth("worker");
await health.update({ status: "starting", lease_valid: false, cycle_running: false, last_successful_cycle: null, last_error: null });
health.start();
async function shutdown(signal: string) {
  if (shuttingDown) return; shuttingDown = true; logger.info("worker_shutdown", { signal });
  // The lease stays held until the active sequential cycle finishes.
  controller.abort();
  await health.update({ status: "stopping", cycle_running: false });
}
process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
if (!botConfig.workerEnabled) {
  logger.info("worker_disabled");
  await health.update({ status: "disabled", lease_valid: false, cycle_running: false });
  await new Promise<void>((resolve) => {
    const idleTimer = setInterval(() => undefined, 60_000);
    controller.signal.addEventListener("abort", () => { clearInterval(idleTimer); resolve(); }, { once: true });
  });
  health.stop();
} else if (!await lease.acquire({ process: "fluxopay-worker" })) {
  logger.warn("worker_lease_unavailable", { leaseKey: lease.key }); process.exitCode = 1;
  await health.update({ status: "error", lease_valid: false }); health.stop();
} else {
  logger.info("worker_lease_acquired", { leaseKey: lease.key });
  await health.update({ status: "active", lease_valid: true });
  lease.startHeartbeat(async () => { logger.error("worker_lease_lost"); await health.update({ status: "error", lease_valid: false }); await shutdown("lease_lost"); });
  try { await runNotificationLoop(bot, lease.ownerId, controller.signal, {
    onCycleStart: () => health.update({ cycle_running: true }),
    onCycleSuccess: () => health.update({ cycle_running: false, last_successful_cycle: new Date().toISOString(), last_error: null }),
    onCycleError: () => health.update({ cycle_running: false, last_error: "notification_cycle_failed" }),
  }); }
  finally {
    health.stop();
    try { await lease.release(); } catch (error) { logger.warn("worker_lease_release_failed", { error }); }
  }
}
