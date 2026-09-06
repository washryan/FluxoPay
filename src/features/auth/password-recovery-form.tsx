"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import {
  passwordRecoverySchema,
  type PasswordRecoveryValues,
} from "@/features/auth/schemas";
import { createClient } from "@/lib/supabase/browser";

export function PasswordRecoveryForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<PasswordRecoveryValues>({
    resolver: zodResolver(passwordRecoverySchema),
    defaultValues: { email: "" },
  });

  function onSubmit(values: PasswordRecoveryValues) {
    setMessage(null);

    startTransition(async () => {
      const { error } = await createClient().auth.resetPasswordForEmail(
        values.email,
        { redirectTo: `${window.location.origin}/auth/recovery` },
      );

      if (error) {
        setMessage("Não foi possível enviar o link agora. Tente novamente.");
        return;
      }

      setMessage(
        "Se este e-mail estiver cadastrado, enviaremos um link para redefinir a senha.",
      );
    });
  }

  return (
    <form
      className="grid gap-5 rounded-[1.25rem] border border-slate-200 bg-white p-6 shadow-[var(--shadow-panel)] md:p-8"
      method="post"
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <div className="space-y-2">
        <p className="text-sm font-bold text-emerald-700">FluxoPay</p>
        <h1 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950">
          Recuperar senha
        </h1>
        <p className="text-sm leading-6 text-slate-600">
          Informe seu e-mail para receber um link seguro de redefinição.
        </p>
      </div>

      <label className="grid gap-2 text-sm font-medium text-slate-800">
        E-mail
        <input
          autoComplete="email"
          className="h-11 rounded-2xl border border-slate-200 bg-white px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          placeholder="voce@email.com"
          type="email"
          {...form.register("email")}
        />
        {form.formState.errors.email ? (
          <span className="text-xs text-red-600">
            {form.formState.errors.email.message}
          </span>
        ) : null}
      </label>

      {message ? (
        <p aria-live="polite" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </p>
      ) : null}

      <button
        className="h-12 rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Enviando..." : "Enviar link"}
      </button>

      <Link className="text-center text-sm font-semibold text-emerald-700 hover:text-emerald-800" href="/login">
        Voltar para o login
      </Link>
    </form>
  );
}
