import { Suspense } from "react";

import { AuthCallbackClient } from "@/features/auth/auth-callback-client";

export default function AuthRecoveryPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f4f6f5] px-4">
      <Suspense
        fallback={
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm font-semibold text-slate-900">
              Validando link de recuperação...
            </p>
          </div>
        }
      >
        <AuthCallbackClient recovery />
      </Suspense>
    </main>
  );
}
