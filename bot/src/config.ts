import { config } from "dotenv";

config({ path: ".env.bot" });

function requiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }

  return value;
}

function integerEnv(name: string, fallback: number, minimum: number, maximum: number) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(`Invalid ${name}: expected an integer between ${minimum} and ${maximum}`);
  }
  return value;
}

export const botConfig = {
  telegramBotToken: requiredEnv("TELEGRAM_BOT_TOKEN"),
  supabaseUrl: requiredEnv("SUPABASE_URL"),
  supabaseServiceRoleKey: requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
  timezone: process.env.BOT_TIMEZONE ?? "America/Sao_Paulo",
  reminderIntervalMinutes: integerEnv("REMINDER_INTERVAL_MINUTES", 1440, 15, 10080),
  maxAmountCents: integerEnv("BOT_MAX_AMOUNT_CENTS", 100_000_000_000, 1, Number.MAX_SAFE_INTEGER),
  rateLimitWindowSeconds: integerEnv("BOT_RATE_LIMIT_WINDOW_SECONDS", 60, 1, 3600),
  rateLimitMaxRequests: integerEnv("BOT_RATE_LIMIT_MAX_REQUESTS", 20, 1, 1000),
  leaseTtlSeconds: integerEnv("BOT_LEASE_TTL_SECONDS", 60, 15, 3600),
  leaseHeartbeatSeconds: integerEnv("BOT_LEASE_HEARTBEAT_SECONDS", 20, 5, 1200),
  notificationMaxAttempts: integerEnv("NOTIFICATION_MAX_ATTEMPTS", 3, 1, 20),
  notificationReservationSeconds: integerEnv("NOTIFICATION_RESERVATION_SECONDS", 120, 15, 3600),
};

if (botConfig.leaseHeartbeatSeconds * 2 >= botConfig.leaseTtlSeconds) {
  throw new Error("BOT_LEASE_HEARTBEAT_SECONDS must be less than half BOT_LEASE_TTL_SECONDS");
}
