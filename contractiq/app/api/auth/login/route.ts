import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/server'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email('A valid email is required.'),
  password: z.string().min(1, 'Password is required.'),
})

function err(status: number, code: string, message: string) {
  return NextResponse.json({ data: null, error: { code, message } }, { status })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return err(400, 'INVALID_INPUT', parsed.error.issues[0].message)
  }

  const supabase = createRouteClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    // Map Supabase error messages to safe client-facing messages
    if (error.message.includes('Invalid login credentials')) {
      return err(401, 'INVALID_CREDENTIALS', 'Invalid email or password.')
    }
    if (error.message.includes('Email not confirmed')) {
      return err(401, 'EMAIL_NOT_CONFIRMED', 'Please verify your email before signing in.')
    }
    return err(401, 'AUTH_ERROR', 'Something went wrong. Please try again.')
  }

  return NextResponse.json({ data: { user_id: data.user.id }, error: null })
}
