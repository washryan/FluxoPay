import { z } from "zod";

export const creditCardSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do cartão.").max(80),
  closing_day: z.coerce.number().int().min(1).max(31),
  due_day: z.coerce.number().int().min(1).max(31),
  limit: z.string().trim().optional(),
});
