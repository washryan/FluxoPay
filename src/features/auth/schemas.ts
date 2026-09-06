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

export const passwordRecoverySchema = z.object({
  email: z.email("Informe um e-mail valido."),
});

export type PasswordRecoveryValues = z.infer<typeof passwordRecoverySchema>;

export const passwordUpdateSchema = z
  .object({
    password: z
      .string()
      .min(8, "Use pelo menos 8 caracteres.")
      .max(72, "Use no maximo 72 caracteres."),
    passwordConfirmation: z.string(),
  })
  .refine((values) => values.password === values.passwordConfirmation, {
    message: "As senhas precisam ser iguais.",
    path: ["passwordConfirmation"],
  });

export type PasswordUpdateValues = z.infer<typeof passwordUpdateSchema>;
