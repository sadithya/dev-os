import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/security/authGuard'
import { createAdminClient } from '@/lib/supabase/server'
import { extractPDFText } from '@/lib/pdf/extractor'
import { uploadBodySchema, validateFile } from '@/lib/validation/upload.schema'

function err(status: number, code: string, message: string) {
  return NextResponse.json({ data: null, error: { code, message } }, { status })
}

async function uploadToStorage(
  buffer: Buffer,
  fileName: string,
  userId: string,
  contractId: string,
): Promise<string> {
  const admin = createAdminClient()
  const filePath = `${userId}/${contractId}/${fileName}`
  const { error } = await admin.storage
    .from('contracts')
    .upload(filePath, buffer, { contentType: 'application/pdf', upsert: false })
  if (error) throw error
  return filePath
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (auth.response) return auth.response
  const { user, supabase } = auth

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return err(400, 'INVALID_REQUEST', 'Could not parse form data.')
  }

  const file = formData.get('file') as File | null
  const contractType = formData.get('contract_type') as string | null

  if (!file) return err(400, 'INVALID_REQUEST', 'File is required.')

  const fileError = validateFile(file)
  if (fileError) {
    const code = fileError.includes('10 MB') ? 'FILE_TOO_LARGE' : 'INVALID_FILE_TYPE'
    return err(400, code, fileError)
  }

  const bodyParse = uploadBodySchema.safeParse({ contract_type: contractType })
  if (!bodyParse.success) {
    return err(400, 'INVALID_CONTRACT_TYPE', bodyParse.error.issues[0].message)
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  let extracted
  try {
    extracted = await extractPDFText(buffer)
  } catch (e: unknown) {
    const code = (e as { code?: string }).code
    const message = (e as Error).message
    if (code === 'TOO_MANY_PAGES') return err(400, 'TOO_MANY_PAGES', message)
    if (code === 'SCANNED_PDF') return err(400, 'SCANNED_PDF', message)
    if (code === 'CONTRACT_TOO_LONG') return err(400, 'CONTRACT_TOO_LONG', message)
    console.error('[upload] PDF extraction error:', message)
    return err(500, 'INTERNAL_ERROR', 'Upload failed. Please try again.')
  }

  const { data: contract, error: dbError } = await supabase
    .from('contracts')
    .insert({
      user_id: user.id,
      file_name: file.name,
      contract_type: bodyParse.data.contract_type,
      contract_text: extracted.text,
      page_count: extracted.pageCount,
      token_count: extracted.tokenCount,
      status: 'pending',
    })
    .select('id')
    .single()

  if (dbError || !contract) {
    console.error('[upload] DB insert error:', dbError?.message)
    return err(500, 'INTERNAL_ERROR', 'Upload failed. Please try again.')
  }

  // Non-blocking storage upload — failures leave file_path null (text viewer fallback handles this)
  uploadToStorage(buffer, file.name, user.id, contract.id)
    .then((filePath) =>
      supabase.from('contracts').update({ file_path: filePath }).eq('id', contract.id),
    )
    .catch((storageErr) => console.warn('[upload] Storage upload failed (non-fatal):', storageErr))

  return NextResponse.json(
    {
      data: {
        contract_id: contract.id,
        status: 'pending',
        page_count: extracted.pageCount,
        token_count: extracted.tokenCount,
      },
      error: null,
    },
    { status: 201 },
  )
}
