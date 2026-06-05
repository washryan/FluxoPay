"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseConfig } from "./config";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  const { url, anonKey } = getSupabaseConfig();

  if (!browserClient) {
    browserClient = createBrowserClient(url, anonKey);
  }

  return browserClient;
}
