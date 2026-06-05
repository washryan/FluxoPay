import { z } from "zod";

export const billStatusOptions = [
  "pending",
  "paid",
  "overdue",
  "cancelled",
] as const;

export const recurrenceOptions = ["none", "weekly", "monthly", "yearly"] as const;

export const billFormSchema = z.object({
  name: z.string().trim().min(1, "Informe um nome.").max(120),
  amount: z.string().trim().min(1, "Informe um valor."),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(billStatusOptions),
  recurrence: z.enum(recurrenceOptions),
  category_id: z.string().uuid().optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional(),
});
