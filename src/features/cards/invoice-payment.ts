export type InvoicePaymentMode = "full" | "partial" | "reconciliation";

export function parseInvoiceAmountToCents(value: string) {
  const normalized = value
    .trim()
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  return Math.round(Number(normalized) * 100);
}

export function invoiceDifference(calculatedCents: number, actualCents: number) {
  return actualCents - calculatedCents;
}
