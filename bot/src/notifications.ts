import type { Bot } from "grammy";

import { botConfig } from "./config";
import { supabase } from "./supabase";
import {
  addDays,
  formatCurrencyFromCents,
  formatDateLabel,
  today,
} from "./utils";

type NotificationLink = {
  id: string;
  user_id: string;
  telegram_chat_id: number | null;
};

type NotificationPreferences = {
  telegram_enabled: boolean;
  bill_due_tomorrow: boolean;
  bill_due_today: boolean;
  bill_overdue: boolean;
  card_due_soon: boolean;
  weekly_report: boolean;
  monthly_report: boolean;
};

type BillRow = {
  id: string;
  name: string;
  amount_cents: number;
  due_date: string;
};

type InstallmentRow = {
  id: string;
  amount_cents: number;
  due_date: string;
  credit_card_purchases:
    | {
        credit_card_id: string;
        description: string;
        credit_cards: { name: string } | { name: string }[] | null;
      }
    | {
        credit_card_id: string;
        description: string;
        credit_cards: { name: string } | { name: string }[] | null;
      }[]
    | null;
};

type TransactionRow = {
  type: "income" | "expense";
  amount_cents: number;
};

const defaultPreferences: NotificationPreferences = {
  telegram_enabled: true,
  bill_due_tomorrow: true,
  bill_due_today: true,
  bill_overdue: true,
  card_due_soon: true,
  weekly_report: true,
  monthly_report: true,
};

function firstRelation<T>(relation: T | T[] | null) {
  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation;
}

function previousMonthRange() {
  const current = today();
  const [year, month] = current.split("-").map(Number);
  const startDate = new Date(Date.UTC(year, month - 2, 1));
  const endDate = new Date(Date.UTC(year, month - 1, 1));
  const start = startDate.toISOString().slice(0, 10);
  const end = endDate.toISOString().slice(0, 10);

  return {
    end,
    label: `${String(startDate.getUTCMonth() + 1).padStart(2, "0")}/${startDate.getUTCFullYear()}`,
    start,
  };
}

function localDayOfWeek(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

async function syncOverdueStatuses(currentDate: string) {
  await Promise.all([
    supabase
      .from("bills")
      .update({ status: "overdue" })
      .eq("status", "pending")
      .lt("due_date", currentDate),
    supabase
      .from("installments")
      .update({ status: "overdue" })
      .eq("status", "pending")
      .lt("due_date", currentDate),
  ]);
}

async function getActiveNotificationLinks() {
  const { data, error } = await supabase
    .from("telegram_links")
    .select("id, user_id, telegram_chat_id")
    .eq("status", "active")
    .not("telegram_chat_id", "is", null);

  if (error) {
    console.error("Notification worker could not load telegram links", {
      error: error.message,
    });
    return [] as NotificationLink[];
  }

  return (data ?? []) as NotificationLink[];
}

async function getPreferences(userId: string) {
  const { data, error } = await supabase
    .from("notification_preferences")
    .select(
      "telegram_enabled, bill_due_tomorrow, bill_due_today, bill_overdue, card_due_soon, weekly_report, monthly_report",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return defaultPreferences;
  }

  return { ...defaultPreferences, ...data } as NotificationPreferences;
}

async function alreadySent(userId: string, notificationType: string, dedupeKey: string) {
  const { data } = await supabase
    .from("notification_logs")
    .select("id")
    .eq("user_id", userId)
    .eq("notification_type", notificationType)
    .eq("dedupe_key", dedupeKey)
    .eq("status", "sent")
    .maybeSingle();

  return Boolean(data);
}

async function logNotification({
  errorMessage,
  link,
  notificationType,
  dedupeKey,
  referenceId,
  referenceTable,
  status,
}: {
  errorMessage?: string;
  link: NotificationLink;
  notificationType: string;
  dedupeKey: string;
  referenceId?: string;
  referenceTable?: string;
  status: "sent" | "failed";
}) {
  await supabase.from("notification_logs").insert({
    user_id: link.user_id,
    telegram_link_id: link.id,
    notification_type: notificationType,
    dedupe_key: dedupeKey,
    channel: "telegram",
    status,
    reference_table: referenceTable ?? null,
    reference_id: referenceId ?? null,
    error_message: errorMessage?.slice(0, 500) ?? null,
  });
}

async function sendOnce({
  bot,
  dedupeKey,
  link,
  message,
  notificationType,
  referenceId,
  referenceTable,
}: {
  bot: Bot;
  dedupeKey: string;
  link: NotificationLink;
  message: string;
  notificationType: string;
  referenceId?: string;
  referenceTable?: string;
}) {
  if (!link.telegram_chat_id) {
    return;
  }

  if (await alreadySent(link.user_id, notificationType, dedupeKey)) {
    return;
  }

  try {
    await bot.api.sendMessage(link.telegram_chat_id, message);
    await logNotification({
      dedupeKey,
      link,
      notificationType,
      referenceId,
      referenceTable,
      status: "sent",
    });
  } catch (error) {
    await logNotification({
      dedupeKey,
      errorMessage: error instanceof Error ? error.message : String(error),
      link,
      notificationType,
      referenceId,
      referenceTable,
      status: "failed",
    });
  }
}

async function sendBillReminders(
  bot: Bot,
  link: NotificationLink,
  preferences: NotificationPreferences,
  currentDate: string,
) {
  if (preferences.bill_due_tomorrow) {
    const tomorrow = addDays(currentDate, 1);
    const { data } = await supabase
      .from("bills")
      .select("id, name, amount_cents, due_date")
      .eq("user_id", link.user_id)
      .eq("status", "pending")
      .eq("due_date", tomorrow);

    for (const bill of (data ?? []) as BillRow[]) {
      await sendOnce({
        bot,
        dedupeKey: `${bill.id}:${tomorrow}`,
        link,
        message: `Lembrete: a conta ${bill.name} vence amanhã (${formatDateLabel(bill.due_date)}), valor ${formatCurrencyFromCents(bill.amount_cents)}.`,
        notificationType: "bill_due_tomorrow",
        referenceId: bill.id,
        referenceTable: "bills",
      });
    }
  }

  if (preferences.bill_due_today) {
    const { data } = await supabase
      .from("bills")
      .select("id, name, amount_cents, due_date")
      .eq("user_id", link.user_id)
      .eq("status", "pending")
      .eq("due_date", currentDate);

    for (const bill of (data ?? []) as BillRow[]) {
      await sendOnce({
        bot,
        dedupeKey: `${bill.id}:${currentDate}`,
        link,
        message: `Atenção: a conta ${bill.name} vence hoje, valor ${formatCurrencyFromCents(bill.amount_cents)}.`,
        notificationType: "bill_due_today",
        referenceId: bill.id,
        referenceTable: "bills",
      });
    }
  }

  if (preferences.bill_overdue) {
    const { data } = await supabase
      .from("bills")
      .select("id, name, amount_cents, due_date")
      .eq("user_id", link.user_id)
      .eq("status", "overdue")
      .lt("due_date", currentDate)
      .limit(20);

    for (const bill of (data ?? []) as BillRow[]) {
      await sendOnce({
        bot,
        dedupeKey: `${bill.id}:${bill.due_date}`,
        link,
        message: `Conta atrasada: ${bill.name} venceu em ${formatDateLabel(bill.due_date)} e está em aberto no valor de ${formatCurrencyFromCents(bill.amount_cents)}.`,
        notificationType: "bill_overdue",
        referenceId: bill.id,
        referenceTable: "bills",
      });
    }
  }
}

async function sendCardReminders(
  bot: Bot,
  link: NotificationLink,
  preferences: NotificationPreferences,
  currentDate: string,
) {
  if (!preferences.card_due_soon) {
    return;
  }

  const dueSoon = addDays(currentDate, 3);
  const { data } = await supabase
    .from("installments")
    .select(
      `
      id,
      amount_cents,
      due_date,
      credit_card_purchases(
        credit_card_id,
        description,
        credit_cards(name)
      )
      `,
    )
    .eq("user_id", link.user_id)
    .in("status", ["pending", "overdue"])
    .gte("due_date", currentDate)
    .lte("due_date", dueSoon);

  const grouped = new Map<
    string,
    { cardId: string; cardName: string; dueDate: string; count: number; total: number }
  >();

  for (const installment of (data ?? []) as unknown as InstallmentRow[]) {
    const purchase = firstRelation(installment.credit_card_purchases);
    const card = firstRelation(purchase?.credit_cards ?? null);

    if (!purchase) {
      continue;
    }

    const key = `${purchase.credit_card_id}:${installment.due_date}`;
    const current = grouped.get(key) ?? {
      cardId: purchase.credit_card_id,
      cardName: card?.name ?? "Cartão",
      count: 0,
      dueDate: installment.due_date,
      total: 0,
    };

    current.count += 1;
    current.total += installment.amount_cents;
    grouped.set(key, current);
  }

  for (const invoice of grouped.values()) {
    await sendOnce({
      bot,
      dedupeKey: `${invoice.cardId}:${invoice.dueDate}`,
      link,
      message: `Fatura próxima: ${invoice.cardName} vence em ${formatDateLabel(invoice.dueDate)} com ${formatCurrencyFromCents(invoice.total)} em aberto (${invoice.count} parcela${invoice.count === 1 ? "" : "s"}).`,
      notificationType: "card_due_soon",
    });
  }
}

async function getPeriodSummary(userId: string, start: string, end: string) {
  const { data, error } = await supabase
    .from("transactions")
    .select("type, amount_cents")
    .eq("user_id", userId)
    .gte("transaction_date", start)
    .lt("transaction_date", end);

  if (error) {
    return null;
  }

  const transactions = (data ?? []) as TransactionRow[];
  const income = transactions
    .filter((transaction) => transaction.type === "income")
    .reduce((total, transaction) => total + transaction.amount_cents, 0);
  const expense = transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((total, transaction) => total + transaction.amount_cents, 0);

  return {
    balance: income - expense,
    count: transactions.length,
    expense,
    income,
  };
}

async function sendReports(
  bot: Bot,
  link: NotificationLink,
  preferences: NotificationPreferences,
  currentDate: string,
) {
  if (preferences.weekly_report && localDayOfWeek(currentDate) === 1) {
    const start = addDays(currentDate, -7);
    const summary = await getPeriodSummary(link.user_id, start, currentDate);

    if (summary) {
      await sendOnce({
        bot,
        dedupeKey: currentDate,
        link,
        message: [
          "Relatório semanal do FluxoPay:",
          `Movimentações: ${summary.count}`,
          `Entradas: ${formatCurrencyFromCents(summary.income)}`,
          `Saídas: ${formatCurrencyFromCents(summary.expense)}`,
          `Saldo: ${formatCurrencyFromCents(summary.balance)}`,
        ].join("\n"),
        notificationType: "weekly_report",
      });
    }
  }

  if (preferences.monthly_report && currentDate.endsWith("-01")) {
    const range = previousMonthRange();
    const summary = await getPeriodSummary(link.user_id, range.start, range.end);

    if (summary) {
      await sendOnce({
        bot,
        dedupeKey: range.start,
        link,
        message: [
          `Relatório mensal de ${range.label}:`,
          `Movimentações: ${summary.count}`,
          `Entradas: ${formatCurrencyFromCents(summary.income)}`,
          `Saídas: ${formatCurrencyFromCents(summary.expense)}`,
          `Saldo: ${formatCurrencyFromCents(summary.balance)}`,
        ].join("\n"),
        notificationType: "monthly_report",
      });
    }
  }
}

export async function runNotificationWorker(bot: Bot) {
  const currentDate = today();
  await syncOverdueStatuses(currentDate);

  const links = await getActiveNotificationLinks();

  for (const link of links) {
    const preferences = await getPreferences(link.user_id);

    if (!preferences.telegram_enabled) {
      continue;
    }

    await sendBillReminders(bot, link, preferences, currentDate);
    await sendCardReminders(bot, link, preferences, currentDate);
    await sendReports(bot, link, preferences, currentDate);
  }
}

export function startNotificationWorker(bot: Bot) {
  const intervalMinutes = Number.isFinite(botConfig.reminderIntervalMinutes)
    ? botConfig.reminderIntervalMinutes
    : 1440;
  const intervalMs = Math.max(intervalMinutes, 15) * 60 * 1000;

  void runNotificationWorker(bot);

  const timer = setInterval(() => {
    void runNotificationWorker(bot);
  }, intervalMs);

  timer.unref();
}
