"use client";

import { useActionState } from "react";

import {
  createTelegramLinkToken,
  type TelegramTokenState,
} from "@/features/telegram/actions";

const initialState: TelegramTokenState = {};

type TelegramLinkCardProps = {
  botUsername?: string;
};

export function TelegramLinkCard({ botUsername }: TelegramLinkCardProps) {
  const [state, action, isPending] = useActionState(
    createTelegramLinkToken,
    initialState,
  );
  const command = state.token ? `/start ${state.token}` : null;
  const deepLink =
    state.token && botUsername
      ? `https://t.me/${botUsername.replace(/^@/, "")}?start=${state.token}`
      : null;

  return (
    <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-700">
        Vínculo seguro
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-slate-950">
        Conectar Telegram
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        Gere um token temporário, envie para o bot no Telegram e ele vai
        completar o vínculo usando seu usuário do Telegram.
      </p>

      <form action={action} className="mt-5">
        <button
          className="h-11 rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={isPending}
        >
          {isPending ? "Gerando..." : "Gerar token de vínculo"}
        </button>
      </form>

      {state.error ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      ) : null}

      {command ? (
        <div className="mt-5 rounded-3xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-semibold text-emerald-900">
            Envie este comando para o bot:
          </p>
          <code className="mt-3 block overflow-x-auto rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950">
            {command}
          </code>
          <p className="mt-3 text-xs leading-5 text-emerald-800">
            O token expira em 15 minutos. Se expirar, gere outro.
          </p>
          {deepLink ? (
            <a
              className="mt-4 inline-flex h-10 items-center rounded-full bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
              href={deepLink}
              rel="noreferrer"
              target="_blank"
            >
              Abrir conversa no Telegram
            </a>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
