import Link from "next/link";

import { RecoveryConfirmation } from "@/features/auth/recovery-confirmation";

type RecoveryConfirmationPageProps = {
  searchParams: Promise<{ token_hash?: string }>;
};

export default async function RecoveryConfirmationPage({
  searchParams,
}: RecoveryConfirmationPageProps) {
  const { token_hash: tokenHash } = await searchParams;

  if (!tokenHash) {
    return (
      <section className="grid gap-5 rounded-[1.25rem] border border-slate-200 bg-white p-6 shadow-[var(--shadow-panel)] md:p-8">
        <h1 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950">
          Link de recuperação inválido
        </h1>
        <p className="text-sm leading-6 text-slate-600">
          Solicite um novo e-mail para redefinir sua senha.
        </p>
        <Link
          className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
          href="/forgot-password"
        >
          Solicitar novo link
        </Link>
      </section>
    );
  }

  return <RecoveryConfirmation tokenHash={tokenHash} />;
}
