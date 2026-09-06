"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createClient } from "@/lib/supabase/browser";

type RecoveryConfirmationProps = {
  tokenHash: string;
};

export function RecoveryConfirmation({ tokenHash }: RecoveryConfirmationProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function confirmRecovery() {
    setMessage(null);

    startTransition(async () => {
      const { error } = await createClient().auth.verifyOtp({
        token_hash: tokenHash,
        type: "recovery",
      });

      if (error) {
        setMessage("Este link é inválido ou expirou. Solicite um novo e-mail.");
        return;
      }

      router.replace("/reset-password");
      router.refresh();
    });
  }

  return (
    <section className="grid gap-5 rounded-[1.25rem] border border-slate-200 bg-white p-6 shadow-[var(--shadow-panel)] md:p-8">
      <div className="space-y-2">
        <p className="text-sm font-bold text-emerald-700">FluxoPay</p>
        <h1 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950">
          Confirmar recuperação
        </h1>
        <p className="text-sm leading-6 text-slate-600">
          Continue para validar este link e escolher uma nova senha.
        </p>
      </div>

      {message ? (
        <p
          aria-live="polite"
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {message}
        </p>
      ) : null}

      <button
        className="h-12 rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isPending}
        onClick={confirmRecovery}
        type="button"
      >
        {isPending ? "Validando..." : "Continuar"}
      </button>

      <Link
        className="text-center text-sm font-semibold text-emerald-700 hover:text-emerald-800"
        href="/login"
      >
        Voltar para o login
      </Link>
    </section>
  );
}
