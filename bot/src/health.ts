import { rename, writeFile } from "node:fs/promises";

export type RuntimeHealthState = {
  role: "bot" | "worker";
  status: "starting" | "active" | "disabled" | "stopping" | "error";
  lease_valid: boolean;
  polling_active?: boolean;
  cycle_running?: boolean;
  last_successful_cycle?: string | null;
  last_error?: string | null;
  updated_at: string;
};

export class RuntimeHealth {
  private state: RuntimeHealthState;
  private timer?: NodeJS.Timeout;
  constructor(role: RuntimeHealthState["role"], private readonly path = process.env.HEALTH_FILE ?? "/tmp/fluxopay-health.json") {
    this.state = { role, status: "starting", lease_valid: false, updated_at: new Date().toISOString() };
  }
  async update(changes: Partial<Omit<RuntimeHealthState, "role" | "updated_at">>) {
    this.state = { ...this.state, ...changes, updated_at: new Date().toISOString() };
    const temporary = `${this.path}.tmp`;
    await writeFile(temporary, `${JSON.stringify(this.state)}\n`, { mode: 0o600 });
    await rename(temporary, this.path);
  }
  start() {
    if (this.timer) return;
    this.timer = setInterval(() => void this.update({}), 10_000); this.timer.unref();
  }
  stop() { if (this.timer) clearInterval(this.timer); this.timer = undefined; }
}
