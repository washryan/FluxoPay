export type PaymentMethod = "cash" | "pix" | "debit_card" | "bank_transfer" | "other";

export type TransactionDraft = {
  kind: "transaction";
  type: "income" | "expense";
  amount_cents: number;
  description: string;
  category_id: string | null;
  category_name: string | null;
  category_candidate_name: string | null;
  category_status: "matched" | "missing" | "ambiguous";
  payment_method: PaymentMethod;
  transaction_date: string;
};

export type BotIntent =
  | { type: "CREATE_TRANSACTION"; payload: TransactionDraft }
  | { type: "CREATE_CARD_PURCHASE"; payload: { amount_cents: number; installments: number; card_query: string | null; description: string; purchase_date: string } }
  | { type: "CREATE_BILL"; payload: { direction: "income" | "expense"; amount_cents: number; description: string; due_date: string } }
  | { type: "QUERY_BALANCE"; payload: Record<string, never> }
  | { type: "QUERY_SUMMARY"; payload: { period: "month" | "week" } }
  | { type: "QUERY_CARDS"; payload: Record<string, never> }
  | { type: "QUERY_DUE_ITEMS"; payload: { period: "week" | "month" } }
  | { type: "HELP"; payload: Record<string, never> }
  | { type: "UNKNOWN"; payload: { reason: "ambiguous_type" | "unsupported" | "invalid_amount" } };

export type PendingActionPayload = TransactionDraft;
