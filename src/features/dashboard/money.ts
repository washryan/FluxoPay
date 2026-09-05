export function parseSignedCurrencyToCents(value: string) {
  const trimmed = value.trim();
  const sign = trimmed.startsWith("-") ? -1 : 1;
  const unsigned = trimmed.replace(/^[+-]/, "");
  const normalized = unsigned.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  return sign * Math.round(Number(normalized) * 100);
}
