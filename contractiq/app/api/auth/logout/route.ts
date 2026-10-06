import { NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = createRouteClient()
  await supabase.auth.signOut()
  return NextResponse.json({ data: null, error: null })
}
