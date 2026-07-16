import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/server'
import { customTermSchema } from '@/lib/validation/key-term.schema'
import { MAX_CUSTOM_TERMS } from '@/lib/constants'

function err(status: number, code: string, message: string) {
  return NextResponse.json({ data: null, error: { code, message } }, { status })
}

export async function POST(req: NextRequest) {
  const supabase = createRouteClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return err(401, 'UNAUTHORIZED', 'Authentication required.')

  const body = await req.json().catch(() => null)
  const parsed = customTermSchema.safeParse(body)
  if (!parsed.success) {
    return err(400, 'INVALID_INPUT', parsed.error.issues[0].message)
  }

  const { contract_id, term_name } = parsed.data

  // Verify ownership
  const { data: contract } = await supabase
    .from('contracts')
    .select('id')
    .eq('id', contract_id)
    .eq('user_id', session.user.id)
    .single()

  if (!contract) return err(403, 'FORBIDDEN', 'Contract does not belong to this user.')

  // Enforce max 5 custom terms
  const { count } = await supabase
    .from('custom_key_terms')
    .select('id', { count: 'exact', head: true })
    .eq('contract_id', contract_id)
    .eq('user_id', session.user.id)

  if ((count ?? 0) >= MAX_CUSTOM_TERMS) {
    return err(400, 'TOO_MANY_CUSTOM_TERMS', `Maximum ${MAX_CUSTOM_TERMS} custom terms allowed.`)
  }

  const { data: term, error: dbError } = await supabase
    .from('custom_key_terms')
    .insert({ contract_id, user_id: session.user.id, term_name })
    .select('id, term_name')
    .single()

  if (dbError || !term) return err(500, 'INTERNAL_ERROR', 'Failed to add custom term.')

  return NextResponse.json({ data: { id: term.id, term_name: term.term_name }, error: null }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const supabase = createRouteClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return err(401, 'UNAUTHORIZED', 'Authentication required.')

  const { id } = await req.json().catch(() => ({ id: null }))
  if (!id) return err(400, 'INVALID_INPUT', 'id is required.')

  const { error: dbError } = await supabase
    .from('custom_key_terms')
    .delete()
    .eq('id', id)
    .eq('user_id', session.user.id)

  if (dbError) return err(500, 'INTERNAL_ERROR', 'Failed to delete custom term.')

  return NextResponse.json({ data: { id }, error: null })
}
