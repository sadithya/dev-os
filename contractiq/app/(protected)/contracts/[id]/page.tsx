import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createPageClient } from '@/lib/supabase/server'
import { ResultsClient } from '@/components/contracts/ResultsClient'
import { createAdminClient } from '@/lib/supabase/server'
import { SIGNED_URL_EXPIRY_SECONDS } from '@/lib/constants'

export const dynamic = 'force-dynamic'

export default async function ResultsPage({ params }: { params: { id: string } }) {
  const supabase = createPageClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) redirect('/auth/login')

  const { id } = params

  const { data: contract } = await supabase
    .from('contracts')
    .select('id, file_name, contract_type, status, page_count, created_at, file_path, contract_text')
    .eq('id', id)
    .eq('user_id', session.user.id)
    .single()

  if (!contract) notFound()

  // Update last_accessed_at (non-blocking)
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
    .eq('user_id', session.user.id)
    .single()

  const { data: existingFeedback } = await supabase
    .from('user_feedback')
    .select('rating')
    .eq('contract_id', id)
    .eq('user_id', session.user.id)
    .single()

  const contractData = {
    id: contract.id,
    file_name: contract.file_name,
    contract_type: contract.contract_type as 'nda' | 'msa',
    status: contract.status,
    page_count: contract.page_count,
    created_at: contract.created_at,
    contract_text: contract.contract_text,
    signed_url: signedUrl,
  }

  return (
    <ResultsClient
      contract={contractData}
      keyTerms={keyTerms ?? []}
      chatSessionId={chatSession?.id ?? null}
      existingFeedback={existingFeedback ?? null}
    />
  )
}
