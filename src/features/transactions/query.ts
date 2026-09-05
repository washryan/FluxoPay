export type TransactionFilters = {
  category?: string;
  end?: string;
  start?: string;
  type?: "income" | "expense" | "all";
};

export const DEFAULT_TRANSACTION_LIMIT = 50;

function shiftCalendarDays(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
}

export function resolveTransactionQuery(
  filters: TransactionFilters,
  today: string,
) {
  const hasExplicitPeriod = Boolean(filters.start || filters.end);

  return {
    end: hasExplicitPeriod ? filters.end : today,
    limit: hasExplicitPeriod ? null : DEFAULT_TRANSACTION_LIMIT,
    start: hasExplicitPeriod ? filters.start : shiftCalendarDays(today, -29),
  };
}
