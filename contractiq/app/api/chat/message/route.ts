export const runtime = 'nodejs'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/security/authGuard'
import { sanitizeForLLM } from '@/lib/security/promptInjectionGuard'
import { chatMessageSchema } from '@/lib/validation/chat.schema'
import { checkRateLimit } from '@/lib/security/rateLimiter'
import { classifyQuery } from '@/lib/ai/classifier'
import { callChat, ChatHistoryMessage } from '@/lib/ai/chat'
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

  let responseContent: string
  try {
    responseContent = await callChat({
      contractText: contract.contract_text,
      history,
      newUserMessage: sanitised,
      queryType,
    })
  } catch (e: unknown) {
    const azureError = (e as { message?: string; error?: { message?: string } })
    return err(500, 'AI_ERROR', azureError?.error?.message ?? azureError?.message ?? 'Failed to generate a response. Please try again.')
  }

  let userMessageId: string | null = null
  let assistantMessageId: string | null = null
  let createdAt: string | null = null

  try {
    await supabase.from('chat_messages').insert({
      session_id,
      user_id: user.id,
      role: 'user',
      content: sanitised,
    })

    const { data: assistantMsg } = await supabase
      .from('chat_messages')
      .insert({
        session_id,
        user_id: user.id,
        role: 'assistant',
        content: responseContent,
      })
      .select('id, created_at')
      .single()

    if (assistantMsg) {
      assistantMessageId = assistantMsg.id
      createdAt = assistantMsg.created_at
    }
  } catch {
    // DB unavailable — return the AI response with null IDs
  }

  return NextResponse.json({
    data: {
      message_id: assistantMessageId,
      content: responseContent,
      created_at: createdAt,
      query_type: queryType,
    },
    error: null,
  })
}
