import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdminConfig } from "@/lib/env";

let adminClient: ReturnType<typeof createClient> | null = null;
let cachedUrl = "";
let cachedKey = "";

export function createSupabaseAdminClient() {
  const config = getSupabaseAdminConfig();

  if (!config) {
    return null;
  }

  if (
    !adminClient ||
    cachedUrl !== config.url ||
    cachedKey !== config.serviceRoleKey
  ) {
    adminClient = createClient(config.url, config.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    cachedUrl = config.url;
    cachedKey = config.serviceRoleKey;
  }

  return adminClient;
}
