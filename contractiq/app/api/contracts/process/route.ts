import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/server'
import { processSchema } from '@/lib/validation/process.schema'
import { runExtraction } from '@/lib/ai/extraction'
import { checkRateLimit } from '@/lib/security/rateLimiter'

function err(status: number, code: string, message: string) {
  return NextResponse.json({ data: null, error: { code, message } }, { status })
}

export async function POST(req: NextRequest) {
  const supabase = createRouteClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return err(401, 'UNAUTHORIZED', 'Authentication required.')

  const body = await req.json().catch(() => null)
  const parsed = processSchema.safeParse(body)
  if (!parsed.success) {
    return err(400, 'INVALID_INPUT', parsed.error.issues[0].message)
  }

  const { contract_id, custom_terms } = parsed.data

  // Rate limit: 20 extractions/hour
  const rateLimit = await checkRateLimit(supabase, session.user.id, 'contracts/process')
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { data: null, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests. Please wait before processing another contract.' } },
      { status: 429, headers: { 'X-RateLimit-Limit': String(rateLimit.limit), 'X-RateLimit-Remaining': '0', 'Retry-After': '3600' } },
    )
  }

  // Verify contract ownership
  const { data: contract } = await supabase
    .from('contracts')
    .select('id, contract_text, contract_type, user_id')
    .eq('id', contract_id)
    .eq('user_id', session.user.id)
    .single()

  if (!contract) return err(404, 'CONTRACT_NOT_FOUND', 'Contract not found.')

  // Fetch saved custom terms from DB
  const { data: dbCustomTerms } = await supabase
    .from('custom_key_terms')
    .select('term_name')
    .eq('contract_id', contract_id)

  const seen = new Set<string>()
  const allCustomTerms: string[] = []
  for (const t of [...(dbCustomTerms ?? []).map((t) => t.term_name), ...custom_terms]) {
    if (!seen.has(t)) { seen.add(t); allCustomTerms.push(t) }
  }

  // Mark processing
  await supabase.from('contracts').update({ status: 'processing' }).eq('id', contract_id)

  let extractedTerms
  try {
    extractedTerms = await runExtraction({
      contractText: contract.contract_text,
      contractType: contract.contract_type as 'nda' | 'msa',
      customTerms: allCustomTerms,
    })
  } catch (e: unknown) {
    const code = (e as { code?: string }).code ?? 'AI_ERROR'
    await supabase.from('contracts').update({ status: 'error' }).eq('id', contract_id)
    const status = code === 'AI_ERROR' ? 500 : 504
    return err(status, code, (e as Error).message)
  }

  // Insert key_terms rows
  const rows = extractedTerms.map((term) => ({
    contract_id,
    user_id: session.user.id,
    term_name: term.term_name,
    value: term.value,
    page_number: term.page_number,
    confidence_score: term.confidence_score,
    source_sentence: term.source_sentence,
    is_manual: allCustomTerms.includes(term.term_name),
    is_edited: false,
  }))

  const { data: insertedTerms, error: insertError } = await supabase
    .from('key_terms')
    .insert(rows)
    .select()

  if (insertError) {
    await supabase.from('contracts').update({ status: 'error' }).eq('id', contract_id)
    return err(500, 'INTERNAL_ERROR', 'Failed to save key terms.')
  }

  await supabase.from('contracts').update({ status: 'completed' }).eq('id', contract_id)

  return NextResponse.json(
    { data: { key_terms: insertedTerms }, error: null },
    { headers: { 'X-RateLimit-Limit': String(rateLimit.limit), 'X-RateLimit-Remaining': String(rateLimit.remaining) } },
  )
}
