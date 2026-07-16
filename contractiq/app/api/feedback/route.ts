import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/server'
import { feedbackSchema } from '@/lib/validation/feedback.schema'

function err(status: number, code: string, message: string) {
  return NextResponse.json({ data: null, error: { code, message } }, { status })
}

export async function POST(req: NextRequest) {
  const supabase = createRouteClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return err(401, 'UNAUTHORIZED', 'Authentication required.')

  const body = await req.json().catch(() => null)
  const parsed = feedbackSchema.safeParse(body)
  if (!parsed.success) {
    return err(400, 'INVALID_RATING', parsed.error.issues[0].message)
  }

  const { contract_id, rating, comment } = parsed.data

  const { data: contract } = await supabase
    .from('contracts')
    .select('id')
    .eq('id', contract_id)
    .eq('user_id', session.user.id)
    .single()

  if (!contract) return err(403, 'FORBIDDEN', 'Contract does not belong to this user.')

  const { data: existing } = await supabase
    .from('user_feedback')
    .select('id')
    .eq('contract_id', contract_id)
    .eq('user_id', session.user.id)
    .single()

  if (existing) return err(409, 'ALREADY_SUBMITTED', 'Feedback already submitted for this contract.')

  const { data: feedback, error: dbError } = await supabase
    .from('user_feedback')
    .insert({ contract_id, user_id: session.user.id, rating, comment: comment ?? null })
    .select('id')
    .single()

  if (dbError || !feedback) return err(500, 'INTERNAL_ERROR', 'Failed to submit feedback.')

  return NextResponse.json({ data: { feedback_id: feedback.id }, error: null }, { status: 201 })
}
