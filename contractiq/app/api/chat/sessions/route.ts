import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/server'
import { chatSessionSchema } from '@/lib/validation/chat.schema'

function err(status: number, code: string, message: string) {
  return NextResponse.json({ data: null, error: { code, message } }, { status })
}

export async function POST(req: NextRequest) {
  const supabase = createRouteClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return err(401, 'UNAUTHORIZED', 'Authentication required.')

  const body = await req.json().catch(() => null)
  const parsed = chatSessionSchema.safeParse(body)
  if (!parsed.success) {
    return err(400, 'INVALID_INPUT', parsed.error.issues[0].message)
  }

  const { contract_id } = parsed.data

  const { data: contract } = await supabase
    .from('contracts')
    .select('id')
    .eq('id', contract_id)
    .eq('user_id', session.user.id)
    .single()

  if (!contract) return err(403, 'FORBIDDEN', 'Contract does not belong to this user.')

  // Insert if not exists — ignore conflict on unique contract_id
  await supabase
    .from('chat_sessions')
    .upsert({ contract_id, user_id: session.user.id }, { onConflict: 'contract_id', ignoreDuplicates: true })

  const { data: chatSession } = await supabase
    .from('chat_sessions')
    .select('id')
    .eq('contract_id', contract_id)
    .eq('user_id', session.user.id)
    .single()

  if (!chatSession) return err(500, 'INTERNAL_ERROR', 'Failed to create chat session.')

  return NextResponse.json({ data: { session_id: chatSession.id }, error: null })
}
