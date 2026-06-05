"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { authSchema, type AuthFormValues } from "@/features/auth/schemas";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

type AuthFormProps = {
  mode: "login" | "signup";
  initialMessage?: string;
};

export function AuthForm({ mode, initialMessage }: AuthFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(initialMessage ?? null);
  const [canResendConfirmation, setCanResendConfirmation] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isSignup = mode === "signup";

  const form = useForm<AuthFormValues>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: AuthFormValues) {
    setMessage(null);
    setCanResendConfirmation(false);
    const supabase = createClient();

    startTransition(async () => {
      const response = isSignup
        ? await supabase.auth.signUp({
            email: values.email,
            password: values.password,
            options: {
              data: {
                full_name: values.fullName?.trim() || null,
              },
              emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
          })
        : await supabase.auth.signInWithPassword({
            email: values.email,
            password: values.password,
          });

      if (response.error) {
        const isEmailNotConfirmed =
          response.error.message.toLowerCase().includes("email not confirmed");

        setMessage(
          isEmailNotConfirmed
            ? "E-mail ainda não confirmado. Reenvie o link de confirmação e tente novamente."
            : response.error.message,
        );
        setCanResendConfirmation(isEmailNotConfirmed);
        return;
      }

      if (isSignup && !response.data.session) {
        setMessage("Cadastro criado. Confira seu e-mail para confirmar a conta.");
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    });
  }

  async function resendConfirmation() {
    const email = form.getValues("email");

    if (!email) {
      setMessage("Informe seu e-mail para reenviar a confirmação.");
      return;
    }

    const supabase = createClient();

    startTransition(async () => {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      setCanResendConfirmation(false);
      setMessage("Enviamos um novo link de confirmação para seu e-mail.");
    });
  }

  return (
    <form
      method="post"
      onSubmit={form.handleSubmit(onSubmit)}
      className="grid gap-5 rounded-[2rem] border border-slate-200/80 bg-white/90 p-6 shadow-2xl shadow-slate-900/10 backdrop-blur md:p-8"
    >
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700">
          FluxoPay
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
          {isSignup ? "Criar conta" : "Entrar na conta"}
        </h1>
        <p className="text-sm leading-6 text-slate-600">
          {isSignup
            ? "Comece com um workspace financeiro privado e isolado por usuário."
            : "Acesse seu painel para acompanhar entradas, saídas e próximos vencimentos."}
        </p>
      </div>

      {isSignup ? (
        <label className="grid gap-2 text-sm font-medium text-slate-800">
          Nome
          <input
            className="h-11 rounded-2xl border border-slate-200 bg-white px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            placeholder="Seu nome"
            type="text"
            {...form.register("fullName")}
          />
        </label>
      ) : null}

      <label className="grid gap-2 text-sm font-medium text-slate-800">
        E-mail
        <input
          className="h-11 rounded-2xl border border-slate-200 bg-white px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          placeholder="voce@email.com"
          type="email"
          autoComplete="email"
          {...form.register("email")}
        />
        {form.formState.errors.email ? (
          <span className="text-xs text-red-600">
            {form.formState.errors.email.message}
          </span>
        ) : null}
      </label>

      <label className="grid gap-2 text-sm font-medium text-slate-800">
        Senha
        <input
          className="h-11 rounded-2xl border border-slate-200 bg-white px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          placeholder="Mínimo de 8 caracteres"
          type="password"
          autoComplete={isSignup ? "new-password" : "current-password"}
          {...form.register("password")}
        />
        {form.formState.errors.password ? (
          <span className="text-xs text-red-600">
            {form.formState.errors.password.message}
          </span>
        ) : null}
      </label>

      {message ? (
        <div
          className={cn(
            "rounded-2xl border px-4 py-3 text-sm",
            message.includes("Cadastro criado")
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700",
          )}
        >
          {message}
          {canResendConfirmation ? (
            <button
              className="mt-3 block font-semibold underline underline-offset-4"
              type="button"
              onClick={resendConfirmation}
              disabled={isPending}
            >
              Reenviar e-mail de confirmação
            </button>
          ) : null}
        </div>
      ) : null}

      <button
        className="h-12 rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={isPending}
      >
        {isPending
          ? "Processando..."
          : isSignup
            ? "Criar acesso"
            : "Entrar"}
      </button>

      <p className="text-center text-sm text-slate-600">
        {isSignup ? "Já tem conta?" : "Ainda não tem conta?"}{" "}
        <Link
          className="font-semibold text-emerald-700 hover:text-emerald-800"
          href={isSignup ? "/login" : "/signup"}
        >
          {isSignup ? "Entrar" : "Criar conta"}
        </Link>
      </p>
    </form>
  );
}
