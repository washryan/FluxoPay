import { z } from "zod";

export const categoryTypeOptions = ["income", "expense", "both"] as const;

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Informe um nome.").max(80),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Informe uma cor hexadecimal válida."),
  type: z.enum(categoryTypeOptions),
});

export type CategoryType = (typeof categoryTypeOptions)[number];
