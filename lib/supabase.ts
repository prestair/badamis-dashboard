import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// Public client used for reads and the existing quotation data flow.
export function getSupabaseClient() {
  if (!url || !anonKey) return null;
  return createClient(url, anonKey);
}

// Server-only client used for admin mutations protected by database RLS.
// Never expose SUPABASE_SERVICE_ROLE_KEY through a NEXT_PUBLIC_ variable.
export function getSupabaseAdminClient() {
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
