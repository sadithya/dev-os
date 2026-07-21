import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/security/authGuard'
import { createAdminClient } from '@/lib/supabase/server'
import { SIGNED_URL_EXPIRY_SECONDS } from '@/lib/constants'

function err(status: number, code: string, message: string) {
  return NextResponse.json({ data: null, error: { code, message } }, { status })
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth()
  if (auth.response) return auth.response
  const { user, supabase } = auth

  const { id } = params

  const { data: contract } = await supabase
    .from('contracts')
    .select('id, file_name, contract_type, status, page_count, created_at, file_path, contract_text')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!contract) return err(404, 'CONTRACT_NOT_FOUND', 'Contract not found.')

  supabase.from('contracts').update({ last_accessed_at: new Date().toISOString() }).eq('id', id).then(() => {})

  let signedUrl: string | null = null
  if (contract.file_path) {
    const admin = createAdminClient()
    const { data: urlData } = await admin.storage
      .from('contracts')
      .createSignedUrl(contract.file_path, SIGNED_URL_EXPIRY_SECONDS)
    signedUrl = urlData?.signedUrl ?? null
  }

  const { data: keyTerms } = await supabase
    .from('key_terms')
    .select('*')
    .eq('contract_id', id)
    .order('created_at', { ascending: true })

  const { data: chatSession } = await supabase
    .from('chat_sessions')
    .select('id')
    .eq('contract_id', id)
    .eq('user_id', user.id)
    .single()

  const { data: existingFeedback } = await supabase
    .from('user_feedback')
    .select('rating')
    .eq('contract_id', id)
    .eq('user_id', user.id)
    .single()

  return NextResponse.json({
    data: {
      contract: {
        id: contract.id,
        file_name: contract.file_name,
        contract_type: contract.contract_type,
        status: contract.status,
        page_count: contract.page_count,
        created_at: contract.created_at,
        contract_text: contract.contract_text,
        signed_url: signedUrl,
      },
      key_terms: keyTerms ?? [],
      chat_session_id: chatSession?.id ?? null,
      existing_feedback: existingFeedback ?? null,
    },
    error: null,
  })
}
