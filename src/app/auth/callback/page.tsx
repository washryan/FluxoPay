import { Suspense } from "react";

import { AuthCallbackClient } from "@/features/auth/auth-callback-client";

export default function AuthCallbackPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top_left,#bbf7d0,transparent_32%),linear-gradient(135deg,#f8fafc_0%,#ecfeff_48%,#f7fee7_100%)] px-4">
      <Suspense
        fallback={
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm font-semibold text-slate-900">
              Confirmando acesso...
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Aguarde enquanto validamos seu link.
            </p>
          </div>
        }
      >
        <AuthCallbackClient />
      </Suspense>
    </main>
  );
}
