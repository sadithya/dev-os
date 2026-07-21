import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/security/authGuard'
import { sanitizeForLLM } from '@/lib/security/promptInjectionGuard'
import { chatMessageSchema } from '@/lib/validation/chat.schema'
import { checkRateLimit } from '@/lib/security/rateLimiter'
import { classifyQuery } from '@/lib/ai/classifier'
import { buildChatMessages, callChat, ChatHistoryMessage } from '@/lib/ai/chat'
import { MAX_CHAT_HISTORY } from '@/lib/constants'

function err(status: number, code: string, message: string) {
  return NextResponse.json({ data: null, error: { code, message } }, { status })
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (auth.response) return auth.response
  const { user, supabase } = auth

  const body = await req.json().catch(() => null)
  const parsed = chatMessageSchema.safeParse(body)
  if (!parsed.success) {
    return err(400, 'INVALID_MESSAGE', parsed.error.issues[0].message)
  }

  const { contract_id, session_id, content } = parsed.data

  const rateLimit = await checkRateLimit(user.id, 'chat/message')
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { data: null, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many chat messages. Please wait a moment.' } },
      { status: 429, headers: { 'Retry-After': '3600' } },
    )
  }

  const { safe, sanitised } = sanitizeForLLM(content)
  if (!sanitised || !safe) return err(400, 'INJECTION_DETECTED', 'Invalid message content.')

  // Verify contract and session ownership in parallel.
  const [{ data: contract }, { data: chatSession }] = await Promise.all([
    supabase
      .from('contracts')
      .select('contract_text')
      .eq('id', contract_id)
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('chat_sessions')
      .select('id')
      .eq('id', session_id)
      .eq('contract_id', contract_id)
      .eq('user_id', user.id)
      .single(),
  ])

  if (!contract || !chatSession) {
    return err(403, 'FORBIDDEN', 'Session or contract does not belong to this user.')
  }

  // CRITICAL: load history BEFORE inserting the new user message so the classifier
  // sees only prior turns, not the current question.
  const { data: historyRows } = await supabase
    .from('chat_messages')
    .select('role, content')
    .eq('session_id', session_id)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(MAX_CHAT_HISTORY)

  const history: ChatHistoryMessage[] = (historyRows ?? []).map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  const queryType = classifyQuery(sanitised)

  const messages = buildChatMessages({
    contractText: contract.contract_text,
    history,
    newUserMessage: sanitised,
    queryType,
  })

  let responseContent: string
  try {
    responseContent = await callChat(messages)
  } catch (e: unknown) {
    const code = (e as { code?: string }).code
    if (code === 'AI_TIMEOUT') return err(504, 'CHAT_TIMEOUT', 'Response timed out. Please try again.')
    return err(500, 'AI_ERROR', 'Failed to generate a response. Please try again.')
  }

  await supabase.from('chat_messages').insert({
    session_id,
    user_id: user.id,
    role: 'user',
    content: sanitised,
  })

  const { data: assistantMsg, error: insertErr } = await supabase
    .from('chat_messages')
    .insert({
      session_id,
      user_id: user.id,
      role: 'assistant',
      content: responseContent,
    })
    .select('id, created_at')
    .single()

  if (insertErr || !assistantMsg) {
    return err(500, 'INTERNAL_ERROR', 'Failed to save response.')
  }

  return NextResponse.json({
    data: {
      message_id: assistantMsg.id,
      content: responseContent,
      created_at: assistantMsg.created_at,
      query_type: queryType,
    },
    error: null,
  })
}
