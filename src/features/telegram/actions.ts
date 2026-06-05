"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { hashTelegramLinkToken } from "@/features/telegram/crypto";
import { createClient } from "@/lib/supabase/server";

export type TelegramTokenState = {
  error?: string;
  token?: string;
};

function generateLinkToken() {
  return randomBytes(5).toString("hex").toUpperCase();
}

function expiresAt() {
  return new Date(Date.now() + 15 * 60 * 1000).toISOString();
}

export async function createTelegramLinkToken(): Promise<TelegramTokenState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const token = generateLinkToken();
  const tokenHash = hashTelegramLinkToken(token);

  const { error: revokePendingError } = await supabase
    .from("telegram_links")
    .update({ status: "revoked", revoked_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("status", "pending");

  if (revokePendingError) {
    return { error: "Não foi possível renovar o token anterior." };
  }

  const { error } = await supabase.from("telegram_links").insert({
    user_id: user.id,
    telegram_user_id: null,
    telegram_chat_id: null,
    telegram_username: null,
    status: "pending",
    link_token_hash: tokenHash,
    link_token_expires_at: expiresAt(),
  });

  if (error) {
    return { error: "Não foi possível gerar o token de vínculo." };
  }

  revalidatePath("/settings/telegram");
  return { token };
}

export async function revokeTelegramLink(formData: FormData) {
  const id = String(formData.get("id") ?? "");

  if (!id) {
    redirect("/settings/telegram?error=Vinculo invalido.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("telegram_links")
    .update({ status: "revoked", revoked_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    redirect("/settings/telegram?error=Nao foi possivel revogar o vinculo.");
  }

  revalidatePath("/settings/telegram");
  redirect("/settings/telegram?success=Vinculo revogado.");
}
