export function notificationBackoffMs(attempt: number) {
  return Math.min(300_000, 5_000 * 2 ** Math.max(0, attempt - 1));
}

export function classifyDeliveryFailure(error: unknown) {
  const value = error as { error_code?: number; name?: string };
  if (value?.error_code === 429 || (typeof value?.error_code === "number" && value.error_code >= 500)) return "retryable" as const;
  if (value?.name === "HttpError") return "ambiguous" as const;
  return "permanent" as const;
}
