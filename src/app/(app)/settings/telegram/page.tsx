import { MessageCircle, ShieldCheck } from "lucide-react";

import { ConfirmButton } from "@/components/confirm-button";
import { revokeTelegramLink } from "@/features/telegram/actions";
import { getTelegramLinks } from "@/features/telegram/data";
import { TelegramLinkCard } from "@/features/telegram/telegram-link-card";
import { formatDate } from "@/lib/formatters";

type TelegramSettingsPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

const statusLabels = {
  active: "Ativo",
  pending: "Pendente",
  revoked: "Revogado",
};

const statusStyles = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  revoked: "border-slate-200 bg-slate-100 text-slate-600",
};

export default async function TelegramSettingsPage({
  searchParams,
}: TelegramSettingsPageProps) {
  const [params, linksResult] = await Promise.all([
    searchParams,
    getTelegramLinks(),
  ]);
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

  return (
    <div className="min-h-screen px-4 py-6 md:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="animate-rise rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700">
            Telegram
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
            Conecte sua conta ao bot.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
            Use o Telegram para registrar movimentações, consultar saldo e
            receber avisos importantes sem abrir o painel.
          </p>
        </header>

        {params.success ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {params.success}
          </div>
        ) : null}

        {params.error ?? linksResult.error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {params.error ?? "Não foi possível carregar vínculos."}
          </div>
        ) : null}

        <section className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
          <TelegramLinkCard botUsername={botUsername} />

          <article className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Vínculos recentes</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Gerencie os dispositivos autorizados a conversar com o bot.
                </p>
              </div>
              <ShieldCheck className="size-5 text-emerald-600" />
            </div>

            <div className="mt-5 grid gap-3">
              {linksResult.links.length > 0 ? (
                linksResult.links.map((link) => (
                  <div
                    className="grid gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_auto]"
                    key={link.id}
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-slate-950">
                          {link.telegram_username
                            ? `@${link.telegram_username}`
                            : link.telegram_user_id
                              ? `Telegram ${link.telegram_user_id}`
                              : "Aguardando Telegram"}
                        </h3>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                            statusStyles[link.status]
                          }`}
                        >
                          {statusLabels[link.status]}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        Criado em {formatDate(link.created_at)}
                        {link.linked_at ? ` · vinculado em ${formatDate(link.linked_at)}` : ""}
                      </p>
                      {link.status === "pending" &&
                      link.link_token_expires_at ? (
                        <p className="mt-1 text-xs text-amber-700">
                          Token expira em {formatDate(link.link_token_expires_at)}.
                        </p>
                      ) : null}
                    </div>

                    {link.status !== "revoked" ? (
                      <form action={revokeTelegramLink}>
                        <input name="id" type="hidden" value={link.id} />
                        <ConfirmButton
                          message="Revogar este vínculo do Telegram?"
                          variant="danger"
                        >
                          Revogar
                        </ConfirmButton>
                      </form>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="grid min-h-52 place-items-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  Nenhum vínculo criado ainda.
                </div>
              )}
            </div>
          </article>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <article className="interactive-card rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <MessageCircle className="size-5 text-emerald-600" />
            <h2 className="mt-4 font-semibold text-slate-950">
              Registre pelo chat
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Envie mensagens como <strong>gastei 25 no mercado</strong> e
              confirme antes de salvar no FluxoPay.
            </p>
          </article>
          <article className="interactive-card rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <ShieldCheck className="size-5 text-emerald-600" />
            <h2 className="mt-4 font-semibold text-slate-950">
              Você mantém o controle
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              O bot só salva movimentações após confirmação e você pode revogar
              o vínculo a qualquer momento.
            </p>
          </article>
        </section>
      </div>
    </div>
  );
}
