import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/server'

function err(status: number, code: string, message: string) {
  return NextResponse.json({ data: null, error: { code, message } }, { status })
}

export async function GET(req: NextRequest, { params }: { params: { sessionId: string } }) {
  const supabase = createRouteClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return err(401, 'UNAUTHORIZED', 'Authentication required.')

  const { sessionId } = params

  const { data: chatSession } = await supabase
    .from('chat_sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('user_id', session.user.id)
    .single()

  if (!chatSession) return err(403, 'FORBIDDEN', 'Session does not belong to this user.')

  const { data: messages } = await supabase
    .from('chat_messages')
    .select('id, role, content, created_at')
    .eq('session_id', sessionId)
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: true })

  return NextResponse.json({ data: { messages: messages ?? [] }, error: null })
}
