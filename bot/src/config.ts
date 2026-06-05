import { config } from "dotenv";

config({ path: ".env.bot" });

function requiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }

  return value;
}

export const botConfig = {
  telegramBotToken: requiredEnv("TELEGRAM_BOT_TOKEN"),
  supabaseUrl: requiredEnv("SUPABASE_URL"),
  supabaseServiceRoleKey: requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
  timezone: process.env.BOT_TIMEZONE ?? "America/Sao_Paulo",
};
