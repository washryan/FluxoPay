import { supabase } from "./supabase";
import { formatCurrencyFromCents, today } from "./utils";

type TransactionRow = {
  type: "income" | "expense";
  amount_cents: number;
};

function monthRange() {
  const current = today();
  const [year, month] = current.split("-").map(Number);
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = new Date(Date.UTC(year, month, 1));
  const end = endDate.toISOString().slice(0, 10);

  return { end, label: `${String(month).padStart(2, "0")}/${year}`, start };
}

export async function getMonthlySummary(userId: string) {
  const range = monthRange();
  const { data, error } = await supabase
    .from("transactions")
    .select("type, amount_cents")
    .eq("user_id", userId)
    .gte("transaction_date", range.start)
    .lt("transaction_date", range.end);

  if (error) {
    return "Não consegui carregar seu resumo agora.";
  }

  const transactions = (data ?? []) as TransactionRow[];
  const income = transactions
    .filter((transaction) => transaction.type === "income")
    .reduce((total, transaction) => total + transaction.amount_cents, 0);
  const expense = transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((total, transaction) => total + transaction.amount_cents, 0);
  const balance = income - expense;

  return [
    `Resumo de ${range.label}:`,
    `Entradas: ${formatCurrencyFromCents(income)}`,
    `Saídas: ${formatCurrencyFromCents(expense)}`,
    `Saldo: ${formatCurrencyFromCents(balance)}`,
  ].join("\n");
}
