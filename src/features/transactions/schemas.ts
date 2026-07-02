import { z } from "zod";

export const transactionTypeOptions = ["income", "expense"] as const;
export const paymentMethodOptions = [
  "cash",
  "pix",
  "debit_card",
  "credit_card",
  "bank_transfer",
  "boleto",
  "other",
] as const;

export const transactionFormSchema = z.object({
  type: z.enum(transactionTypeOptions),
  amount: z.string().trim().min(1, "Informe um valor."),
  description: z.string().trim().min(1, "Informe uma descricao.").max(180),
  category_id: z.string().uuid().optional().or(z.literal("")),
  payment_method: z.enum(paymentMethodOptions),
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type TransactionType = (typeof transactionTypeOptions)[number];
export type PaymentMethod = (typeof paymentMethodOptions)[number];
