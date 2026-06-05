import { createClient } from "@supabase/supabase-js";

import { botConfig } from "./config";

export const supabase = createClient(
  botConfig.supabaseUrl,
  botConfig.supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);
