import { createHash } from "crypto";

export function hashTelegramLinkToken(token: string) {
  return createHash("sha256").update(token.trim().toUpperCase()).digest("hex");
}

export function parseCurrencyToCents(value: string, maxAmountCents = 100_000_000_000) {
  const normalized = value
    .trim()
    .replace(/^r\$\s*/i, "")
    .replace(/\s*reais?$/i, "")
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const [whole, fraction = ""] = normalized.split(".");
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  if (cents <= 0n || cents > BigInt(maxAmountCents) || cents > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  return Number(cents);
}

export function formatCurrencyFromCents(valueInCents: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(valueInCents / 100);
}

export function today(date = new Date(), timezone = process.env.BOT_TIMEZONE ?? "America/Sao_Paulo") {
  return formatDateInTimezone(date, timezone);
}

export function formatDateInTimezone(date: Date, timezone = process.env.BOT_TIMEZONE ?? "America/Sao_Paulo") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: timezone,
    year: "numeric",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

export function addDays(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  const cursor = new Date(Date.UTC(year, month - 1, day));
  cursor.setUTCDate(cursor.getUTCDate() + days);
  return cursor.toISOString().slice(0, 10);
}

export function formatDateLabel(date: string) {
  const [year, month, day] = date.split("-").map(Number);

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function slugify(value: string) {
  const slug = normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "categoria";
}
