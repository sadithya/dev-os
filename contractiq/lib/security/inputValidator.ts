import { MAX_FILE_SIZE_BYTES } from '@/lib/constants'

const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.js', '.mjs', '.cjs', '.php', '.zip',
  '.sh', '.bat', '.cmd', '.py', '.rb', '.ps1',
])

const ALLOWED_EXTENSIONS = new Set(['.pdf'])
const ALLOWED_MIME_TYPES = new Set(['application/pdf'])

export interface FileValidationResult {
  valid: boolean
  error: string | null
}

// Validates extension → MIME type → size in that order.
// Blocklist checked before allowlist to prevent disguised uploads.
export function validateFileUpload(file: {
  name: string
  type: string
  size: number
}): FileValidationResult {
  const ext = ('.' + (file.name.split('.').pop() ?? '')).toLowerCase()

  if (BLOCKED_EXTENSIONS.has(ext)) {
    return { valid: false, error: 'File type not allowed.' }
  }

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return { valid: false, error: 'Only PDF files are accepted.' }
  }

  if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
    return { valid: false, error: 'Only PDF files are accepted.' }
  }

  if (file.size === 0) {
    return { valid: false, error: 'File is empty.' }
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: 'File exceeds the 10 MB limit.' }
  }

  return { valid: true, error: null }
}

// Central re-exports so API routes can import all schemas from one place.
export { uploadBodySchema } from '@/lib/validation/upload.schema'
export { chatSessionSchema, chatMessageSchema } from '@/lib/validation/chat.schema'
export { feedbackSchema } from '@/lib/validation/feedback.schema'
export { keyTermPatchSchema, customTermSchema } from '@/lib/validation/key-term.schema'
export { processSchema } from '@/lib/validation/process.schema'
