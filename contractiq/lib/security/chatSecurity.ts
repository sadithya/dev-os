import { NextResponse } from 'next/server'
import type { SupabaseClient, User } from '@supabase/supabase-js'

export interface ContractOwnershipResult {
  contract: { contract_text: string; status: string } | null
  response: NextResponse | null
}

export interface SessionOwnershipResult {
  valid: boolean
  response: NextResponse | null
}

function forbidden(message: string): NextResponse {
  return NextResponse.json(
    { data: null, error: { code: 'FORBIDDEN', message } },
    { status: 403 },
  )
}

function notFound(message: string): NextResponse {
  return NextResponse.json(
    { data: null, error: { code: 'NOT_FOUND', message } },
    { status: 404 },
  )
}

// Verifies the contract exists and belongs to the authenticated user.
// Also fetches contract_text and status for downstream use.
export async function verifyContractOwnership(
  supabase: SupabaseClient,
  contractId: string,
  user: User,
): Promise<ContractOwnershipResult> {
  const { data: contract } = await supabase
    .from('contracts')
    .select('contract_text, status, user_id')
    .eq('id', contractId)
    .single()

  if (!contract) {
    return { contract: null, response: notFound('Contract not found.') }
  }

  if (contract.user_id !== user.id) {
    return { contract: null, response: forbidden('Contract does not belong to this user.') }
  }

  return { contract: { contract_text: contract.contract_text, status: contract.status }, response: null }
}

// Verifies the chat session exists, belongs to the given contract, and is owned by the user.
export async function verifySessionOwnership(
  supabase: SupabaseClient,
  sessionId: string,
  contractId: string,
  user: User,
): Promise<SessionOwnershipResult> {
  const { data: chatSession } = await supabase
    .from('chat_sessions')
    .select('id, user_id')
    .eq('id', sessionId)
    .eq('contract_id', contractId)
    .single()

  if (!chatSession) {
    return { valid: false, response: notFound('Chat session not found.') }
  }

  if (chatSession.user_id !== user.id) {
    return { valid: false, response: forbidden('Chat session does not belong to this user.') }
  }

  return { valid: true, response: null }
}
