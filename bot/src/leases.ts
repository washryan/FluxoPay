import { randomUUID } from "node:crypto";

export type LeaseRepository = {
  acquireLease(key: string, ownerId: string, ttlSeconds: number, metadata?: object): Promise<boolean>;
  heartbeatLease(key: string, ownerId: string, ttlSeconds: number): Promise<boolean>;
  releaseLease(key: string, ownerId: string): Promise<boolean>;
};

export class ProcessLease {
  readonly ownerId = randomUUID();
  private heartbeat?: NodeJS.Timeout;
  private heartbeating = false;
  private held = false;
  private lastSuccessfulHeartbeat = 0;

  constructor(private readonly repository: LeaseRepository, readonly key: string,
    private readonly ttlSeconds: number, private readonly heartbeatSeconds: number) {}

  async acquire(metadata: object = {}) {
    this.held = await this.repository.acquireLease(this.key, this.ownerId, this.ttlSeconds, metadata);
    if (this.held) this.lastSuccessfulHeartbeat = Date.now();
    return this.held;
  }

  startHeartbeat(onLost: () => void | Promise<void>) {
    if (!this.held || this.heartbeat) return;
    this.heartbeat = setInterval(async () => {
      if (this.heartbeating || !this.held) return;
      this.heartbeating = true;
      try {
        if (!await this.repository.heartbeatLease(this.key, this.ownerId, this.ttlSeconds)) {
          this.held = false; this.stopHeartbeat(); await onLost();
        } else this.lastSuccessfulHeartbeat = Date.now();
      } catch {
        // Fail closed before another instance can take over an expired lease.
        if (Date.now() - this.lastSuccessfulHeartbeat >= (this.ttlSeconds - this.heartbeatSeconds) * 1000) {
          this.held = false; this.stopHeartbeat(); await onLost();
        }
      } finally { this.heartbeating = false; }
    }, this.heartbeatSeconds * 1000);
    this.heartbeat.unref();
  }

  stopHeartbeat() { if (this.heartbeat) clearInterval(this.heartbeat); this.heartbeat = undefined; }
  async release() {
    this.stopHeartbeat();
    if (!this.held) return false;
    const released = await this.repository.releaseLease(this.key, this.ownerId);
    this.held = false; return released;
  }
}
