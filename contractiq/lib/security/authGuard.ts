import { createRouteClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { SupabaseClient, User } from '@supabase/supabase-js'

type AuthSuccess = { user: User; supabase: SupabaseClient; response: null }
type AuthFailure = { user: null; supabase: null; response: NextResponse }
export type AuthResult = AuthSuccess | AuthFailure

// Uses getUser() which validates the JWT with the Supabase Auth server —
// unlike getSession() which only reads from cookies without server-side verification.
export async function requireAuth(): Promise<AuthResult> {
  const supabase = createRouteClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      user: null,
      supabase: null,
      response: NextResponse.json(
        { data: null, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } },
        { status: 401 },
      ),
    }
  }

  return { user, supabase, response: null }
}
