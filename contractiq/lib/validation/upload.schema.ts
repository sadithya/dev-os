import { z } from 'zod'
import { MAX_FILE_SIZE_BYTES } from '@/lib/constants'

export const uploadBodySchema = z.object({
  contract_type: z.enum(['nda', 'msa'], {
    errorMap: () => ({ message: "contract_type must be 'nda' or 'msa'." }),
  }),
})

export function validateFile(file: File): string | null {
  if (!file.name.toLowerCase().endsWith('.pdf')) return 'Only PDF files are accepted.'
  if (file.type && file.type !== 'application/pdf') return 'Only PDF files are accepted.'
  if (file.size === 0) return 'File is empty.'
  if (file.size > MAX_FILE_SIZE_BYTES) return 'File exceeds the 10 MB limit.'
  return null
}
