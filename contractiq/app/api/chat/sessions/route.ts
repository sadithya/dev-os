import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/security/authGuard'
import { chatSessionSchema } from '@/lib/validation/chat.schema'

function err(status: number, code: string, message: string) {
  return NextResponse.json({ data: null, error: { code, message } }, { status })
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (auth.response) return auth.response
  const { user, supabase } = auth

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
    .eq('user_id', user.id)
    .single()

  if (!contract) return err(403, 'FORBIDDEN', 'Contract does not belong to this user.')

  await supabase
    .from('chat_sessions')
    .upsert({ contract_id, user_id: user.id }, { onConflict: 'contract_id', ignoreDuplicates: true })

  const { data: chatSession } = await supabase
    .from('chat_sessions')
    .select('id')
    .eq('contract_id', contract_id)
    .eq('user_id', user.id)
    .single()

  if (!chatSession) return err(500, 'INTERNAL_ERROR', 'Failed to create chat session.')

  return NextResponse.json({ data: { session_id: chatSession.id }, error: null })
}
