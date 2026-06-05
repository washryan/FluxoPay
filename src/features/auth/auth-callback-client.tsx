"use client";

import type { EmailOtpType } from "@supabase/supabase-js";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/browser";

function getHashParams() {
  if (typeof window === "undefined") {
    return new URLSearchParams();
  }

  return new URLSearchParams(window.location.hash.replace(/^#/, ""));
}

export function AuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Confirmando sua conta...");

  useEffect(() => {
    let isMounted = true;

    async function confirmAuth() {
      const supabase = createClient();
      const next = searchParams.get("next") ?? "/dashboard";
      const code = searchParams.get("code");
      const tokenHash = searchParams.get("token_hash");
      const type = searchParams.get("type");
      const hashParams = getHashParams();
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            throw error;
          }
        } else if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as EmailOtpType,
          });

          if (error) {
            throw error;
          }
        } else if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            throw error;
          }
        } else {
          throw new Error("Link de confirmação inválido ou expirado.");
        }

        router.replace(next);
        router.refresh();
      } catch (error) {
        if (!isMounted) {
          return;
        }

        const errorMessage =
          error instanceof Error
            ? error.message
            : "Não foi possível confirmar sua conta.";

        setMessage(errorMessage);
        router.replace(
          `/login?error=${encodeURIComponent(
            "Não foi possível confirmar o e-mail. Solicite um novo link de confirmação.",
          )}`,
        );
      }
    }

    confirmAuth();

    return () => {
      isMounted = false;
    };
  }, [router, searchParams]);

  return (
    <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-2xl shadow-slate-900/10">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700">
        FluxoPay
      </p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
        Validando link
      </h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">{message}</p>
    </div>
  );
}
