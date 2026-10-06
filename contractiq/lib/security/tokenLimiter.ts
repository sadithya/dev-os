import { MAX_FILE_SIZE_BYTES, MAX_PAGES, MAX_CHAT_HISTORY } from '@/lib/constants'

export const MAX_MESSAGE_LENGTH = 4000

export interface TokenLimitResult {
  valid: boolean
  error: string | null
}

export function validateMessageLength(content: string): TokenLimitResult {
  if (content.length > MAX_MESSAGE_LENGTH) {
    return {
      valid: false,
      error: `Message exceeds the ${MAX_MESSAGE_LENGTH.toLocaleString()}-character limit.`,
    }
  }
  return { valid: true, error: null }
}

export function validateFileSize(sizeBytes: number): TokenLimitResult {
  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: 'File exceeds the 10 MB limit.' }
  }
  return { valid: true, error: null }
}

export function validatePageCount(pageCount: number): TokenLimitResult {
  if (pageCount > MAX_PAGES) {
    return { valid: false, error: `Document exceeds the ${MAX_PAGES}-page limit.` }
  }
  return { valid: true, error: null }
}

export { MAX_FILE_SIZE_BYTES, MAX_PAGES, MAX_CHAT_HISTORY }
