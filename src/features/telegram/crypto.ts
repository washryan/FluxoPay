import { createHash } from "crypto";

export function hashTelegramLinkToken(token: string) {
  return createHash("sha256").update(token.trim().toUpperCase()).digest("hex");
}
