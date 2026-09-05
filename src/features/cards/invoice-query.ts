export const DEFAULT_INVOICE_STATUS = "open";

export function resolveInvoiceStatus(value?: string) {
  return value === "paid" ||
    value === "open" ||
    value === "overdue" ||
    value === "all"
    ? value
    : DEFAULT_INVOICE_STATUS;
}

export function buildInvoiceQuery(status: string, search: string) {
  const query = new URLSearchParams();
  if (status !== DEFAULT_INVOICE_STATUS) query.set("invoiceStatus", status);
  if (search.trim()) query.set("q", search.trim());
  return query.toString();
}
