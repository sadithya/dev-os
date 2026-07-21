import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/security/authGuard'
import { keyTermPatchSchema } from '@/lib/validation/key-term.schema'

function err(status: number, code: string, message: string) {
  return NextResponse.json({ data: null, error: { code, message } }, { status })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth()
  if (auth.response) return auth.response
  const { user, supabase } = auth

  const body = await req.json().catch(() => null)
  const parsed = keyTermPatchSchema.safeParse(body)
  if (!parsed.success) {
    return err(400, 'INVALID_VALUE', parsed.error.issues[0].message)
  }

  const { id } = params
  const { value: newValue } = parsed.data

  const { data: term } = await supabase
    .from('key_terms')
    .select('id, value, ai_value, is_edited, user_id')
    .eq('id', id)
    .single()

  if (!term) return err(404, 'NOT_FOUND', 'Key term not found.')
  if (term.user_id !== user.id) return err(403, 'FORBIDDEN', 'Key term does not belong to this user.')

  const updatePayload = term.is_edited
    ? { value: newValue }
    : { value: newValue, ai_value: term.value, is_edited: true }

  const { data: updated, error: dbError } = await supabase
    .from('key_terms')
    .update(updatePayload)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, value, ai_value, is_edited')
    .single()

  if (dbError || !updated) return err(500, 'INTERNAL_ERROR', 'Failed to update key term.')

  return NextResponse.json({ data: updated, error: null })
}
