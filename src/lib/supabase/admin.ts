import { createClient } from '@supabase/supabase-js'

// Client com service_role — SOMENTE server-side (API Routes, Server Actions)
// Bypassa RLS — NUNCA expor ao browser
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
