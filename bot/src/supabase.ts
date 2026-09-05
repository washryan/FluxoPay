import { createClient } from "@supabase/supabase-js";

import { botConfig } from "./config";
import { BotRepository } from "./repository";

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

export const repository = new BotRepository(supabase);
