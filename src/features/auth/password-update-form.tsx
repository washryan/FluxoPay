"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import {
  passwordUpdateSchema,
  type PasswordUpdateValues,
} from "@/features/auth/schemas";
import { createClient } from "@/lib/supabase/browser";

export function PasswordUpdateForm() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<PasswordUpdateValues>({
    resolver: zodResolver(passwordUpdateSchema),
    defaultValues: { password: "", passwordConfirmation: "" },
  });

  function onSubmit(values: PasswordUpdateValues) {
    setMessage(null);

    startTransition(async () => {
      const { error } = await createClient().auth.updateUser({
        password: values.password,
      });

      if (error) {
        setMessage("Não foi possível atualizar a senha. Solicite um novo link.");
        return;
      }

      router.replace("/dashboard");
      router.refresh();
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
          Definir nova senha
        </h1>
        <p className="text-sm leading-6 text-slate-600">
          Escolha uma senha nova para sua conta.
        </p>
      </div>

      <label className="grid gap-2 text-sm font-medium text-slate-800">
        Nova senha
        <input
          autoComplete="new-password"
          className="h-11 rounded-2xl border border-slate-200 bg-white px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          type="password"
          {...form.register("password")}
        />
        {form.formState.errors.password ? (
          <span className="text-xs text-red-600">
            {form.formState.errors.password.message}
          </span>
        ) : null}
      </label>

      <label className="grid gap-2 text-sm font-medium text-slate-800">
        Confirmar nova senha
        <input
          autoComplete="new-password"
          className="h-11 rounded-2xl border border-slate-200 bg-white px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          type="password"
          {...form.register("passwordConfirmation")}
        />
        {form.formState.errors.passwordConfirmation ? (
          <span className="text-xs text-red-600">
            {form.formState.errors.passwordConfirmation.message}
          </span>
        ) : null}
      </label>

      {message ? (
        <p aria-live="polite" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {message}
        </p>
      ) : null}

      <button
        className="h-12 rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Atualizando..." : "Atualizar senha"}
      </button>
    </form>
  );
}
