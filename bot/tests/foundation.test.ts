import assert from "node:assert/strict";
import test from "node:test";
import { resolveEntity } from "../src/entity-resolution";
import { ProcessLease, type LeaseRepository } from "../src/leases";
import { InMemoryRateLimiter } from "../src/rate-limit";
import { classifyDeliveryFailure, notificationBackoffMs } from "../src/retry";
import { runSequentialCycles } from "../src/scheduler";

test("entity resolution refuses ambiguous partial matches", () => {
  const items = [{ id: "1", name: "Nubank" }, { id: "2", name: "Nubank PJ" }, { id: "3", name: "Inter" }];
  assert.equal(resolveEntity("Nubank", items).status, "matched");
  assert.equal(resolveEntity("Nu", items).status, "ambiguous");
});
test("rate limiter blocks excess requests", () => {
  const limiter = new InMemoryRateLimiter(2, 1000);
  assert.equal(limiter.allow("1", 100), true); assert.equal(limiter.allow("1", 200), true);
  assert.equal(limiter.allow("1", 300), false); assert.equal(limiter.allow("1", 1200), true);
});
test("lease release uses the same owner identity", async () => {
  const calls: string[] = [];
  const repo: LeaseRepository = { acquireLease: async (_k, owner) => { calls.push(`a:${owner}`); return true; },
    heartbeatLease: async () => true, releaseLease: async (_k, owner) => { calls.push(`r:${owner}`); return true; } };
  const lease = new ProcessLease(repo, "telegram_polling", 60, 20);
  assert.equal(await lease.acquire(), true); assert.equal(await lease.release(), true);
  assert.equal(calls.length, 2); assert.equal(calls[0].slice(2), calls[1].slice(2));
});
test("worker cycles never overlap and stop cleanly", async () => {
  const controller = new AbortController(); let active = 0; let maximum = 0; let cycles = 0;
  await runSequentialCycles(async () => {
    active += 1; maximum = Math.max(maximum, active); await Promise.resolve(); active -= 1;
    cycles += 1; if (cycles === 3) controller.abort();
  }, async () => undefined, controller.signal);
  assert.equal(cycles, 3); assert.equal(maximum, 1);
});
test("notification retry is bounded and ambiguous network outcomes are not retried", () => {
  assert.equal(notificationBackoffMs(1), 5_000); assert.equal(notificationBackoffMs(99), 300_000);
  assert.equal(classifyDeliveryFailure({ error_code: 429 }), "retryable");
  assert.equal(classifyDeliveryFailure({ name: "HttpError" }), "ambiguous");
  assert.equal(classifyDeliveryFailure({ error_code: 400 }), "permanent");
});
