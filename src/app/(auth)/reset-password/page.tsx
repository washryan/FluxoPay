import { redirect } from "next/navigation";

import { PasswordUpdateForm } from "@/features/auth/password-update-form";
import { createClient } from "@/lib/supabase/server";

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?error=Solicite%20um%20novo%20link%20de%20recuperacao.");
  }

  return <PasswordUpdateForm />;
}
