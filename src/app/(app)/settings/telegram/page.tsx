import { MessageCircle, ShieldCheck } from "lucide-react";

import { EmptyState, PageFrame, PageHero, Surface } from "@/components/app-ui";
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
    <PageFrame>
        <PageHero
          description="Use o Telegram para registrar movimentações, consultar saldo e receber avisos importantes sem abrir o painel."
          eyebrow="Telegram"
          title="Conecte sua conta ao bot."
          variant="dark"
        />

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

          <Surface
            action={<ShieldCheck className="size-5 text-emerald-700" />}
            description="Gerencie os dispositivos autorizados a conversar com o bot."
            title="Vínculos recentes"
          >
            <div className="grid gap-3">
              {linksResult.links.length > 0 ? (
                linksResult.links.map((link) => (
                  <div
                    className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_auto]"
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
                <EmptyState
                  description="Crie um vínculo para registrar movimentações pelo chat."
                  icon={MessageCircle}
                  title="Nenhum vínculo criado"
                />
              )}
            </div>
          </Surface>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <article className="interactive-card rounded-[1.25rem] border border-slate-200 bg-white p-5 shadow-[var(--shadow-panel)]">
            <MessageCircle className="size-5 text-emerald-600" />
            <h2 className="mt-4 font-semibold text-slate-950">
              Registre pelo chat
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Envie mensagens como <strong>gastei 25 no mercado</strong> e
              confirme antes de salvar no FluxoPay.
            </p>
          </article>
          <article className="interactive-card rounded-[1.25rem] border border-slate-200 bg-white p-5 shadow-[var(--shadow-panel)]">
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
    </PageFrame>
  );
}
