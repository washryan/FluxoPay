import { z } from "zod";

export const creditCardSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do cartão.").max(80),
  closing_day: z.coerce.number().int().min(1).max(31),
  due_day: z.coerce.number().int().min(1).max(31),
  limit: z.string().trim().optional(),
});

export const creditCardPurchaseSchema = z.object({
  credit_card_id: z.uuid("Selecione um cartão."),
  description: z
    .string()
    .trim()
    .min(1, "Informe a descrição da compra.")
    .max(180, "A descrição deve ter até 180 caracteres."),
  total_amount: z.string().trim().min(1, "Informe o valor da compra."),
  purchase_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida."),
  installments_count: z.coerce
    .number()
    .int()
    .min(1, "Informe pelo menos 1 parcela.")
    .max(72, "Use no máximo 72 parcelas."),
  category_id: z.string().trim().optional(),
});
