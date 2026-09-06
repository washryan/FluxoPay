import "server-only";

export function isReadOnlyStaging() {
  return process.env.FLUXOPAY_READ_ONLY === "true";
}
