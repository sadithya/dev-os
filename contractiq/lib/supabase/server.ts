import { createRouteHandlerClient, createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// For API route handlers — respects RLS, session from cookie
export function createRouteClient() {
  return createRouteHandlerClient({ cookies })
}

// For server components — respects RLS, session from cookie
export function createPageClient() {
  return createServerComponentClient({ cookies })
}

// For server-only admin operations (Storage uploads, etc.) — bypasses RLS
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}
