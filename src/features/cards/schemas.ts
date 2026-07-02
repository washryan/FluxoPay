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

export const invoicePaymentSchema = z
  .object({
    card_id: z.uuid("Fatura inválida."),
    invoice_month: z
      .string()
      .regex(/^\d{4}-\d{2}$/, "Informe um mês de fatura válido."),
    payment_method: z.enum(["pix", "debit_card", "boleto", "credit_card"]),
    paid_amount: z.string().trim().optional(),
    payment_credit_card_id: z.string().trim().optional(),
    credit_is_installment: z.enum(["yes", "no"]).optional(),
    credit_installments_count: z.coerce.number().int().min(1).max(72).optional(),
    credit_installment_amount: z.string().trim().optional(),
  })
  .superRefine((data, context) => {
    if (data.payment_method !== "credit_card") {
      if (!data.paid_amount) {
        context.addIssue({
          code: "custom",
          message: "Informe o valor pago.",
          path: ["paid_amount"],
        });
      }

      return;
    }

    if (!data.payment_credit_card_id) {
      context.addIssue({
        code: "custom",
        message: "Selecione o cartão usado no pagamento.",
        path: ["payment_credit_card_id"],
      });
    }

    if (data.credit_is_installment === "yes") {
      if (!data.credit_installments_count) {
        context.addIssue({
          code: "custom",
          message: "Informe a quantidade de parcelas.",
          path: ["credit_installments_count"],
        });
      }

      if (!data.credit_installment_amount) {
        context.addIssue({
          code: "custom",
          message: "Informe o valor de cada parcela.",
          path: ["credit_installment_amount"],
        });
      }
    } else if (!data.paid_amount) {
      context.addIssue({
        code: "custom",
        message: "Informe o valor pago.",
        path: ["paid_amount"],
      });
    }
  });
