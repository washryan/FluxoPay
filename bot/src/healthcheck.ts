import { readFile } from "node:fs/promises";

const path = process.env.HEALTH_FILE ?? "/tmp/fluxopay-health.json";
const expectedRole = process.env.PROCESS_ROLE;
try {
  const state = JSON.parse(await readFile(path, "utf8")) as {
    role: string; status: string; lease_valid: boolean; polling_active?: boolean; updated_at: string;
  };
  const fresh = Date.now() - Date.parse(state.updated_at) < 45_000;
  const roleHealthy = state.role === "bot"
    ? state.status === "active" && state.lease_valid && state.polling_active === true
    : state.status === "disabled" || (state.status === "active" && state.lease_valid);
  if (!fresh || !roleHealthy || (expectedRole && state.role !== expectedRole)) process.exit(1);
} catch { process.exit(1); }
