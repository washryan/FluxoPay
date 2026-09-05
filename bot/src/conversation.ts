import type { Category } from "./parser";
import { parseBotIntent } from "./parser";

export type ConversationUpdate = { telegramUserId: number; chatId: number; text: string };
export type ConversationResponse = { text: string; intent: ReturnType<typeof parseBotIntent>; shouldPersist: false };

export function handleFakeTelegramUpdate(update: ConversationUpdate, context: { categories?: Category[]; maxAmountCents?: number; now?: Date; timezone?: string } = {}): ConversationResponse {
  const intent = parseBotIntent(update.text, context);
  if (intent.type !== "CREATE_TRANSACTION") return { text: "Preciso de mais informações para continuar.", intent, shouldPersist: false };
  const label = intent.payload.type === "income" ? "Entrada" : "Saída";
  return { text: `${label}: ${intent.payload.amount_cents} centavos. Confirme antes de salvar.`, intent, shouldPersist: false };
}
