import { z } from "zod";

export const authSchema = z.object({
  fullName: z.string().trim().max(120).optional(),
  email: z.email("Informe um e-mail valido."),
  password: z
    .string()
    .min(8, "Use pelo menos 8 caracteres.")
    .max(72, "Use no maximo 72 caracteres."),
});

export type AuthFormValues = z.infer<typeof authSchema>;
