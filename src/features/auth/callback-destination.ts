export function getSafeNextPath(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//")
    ? value
    : "/dashboard";
}

export function getCallbackDestination(
  type: string | null,
  next: string | null,
  recovery = false,
) {
  return recovery || type === "recovery"
    ? "/reset-password"
    : getSafeNextPath(next);
}
