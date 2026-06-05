const missingEnvMessage =
  "Supabase is not configured. Copy .env.example to .env.local and set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.";

export function getSupabaseConfig() {
  const config = getOptionalSupabaseConfig();

  if (!config) {
    throw new Error(missingEnvMessage);
  }

  return config;
}

export function getOptionalSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
}
