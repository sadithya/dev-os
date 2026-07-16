import pdfParse from 'pdf-parse'
import { MAX_PAGES, MIN_WORD_COUNT, MAX_TOKEN_COUNT } from '@/lib/constants'

export interface PDFExtractResult {
  text: string
  pageCount: number
  wordCount: number
  tokenCount: number
}

export async function extractPDFText(buffer: Buffer): Promise<PDFExtractResult> {
  const pages: string[] = []

  const data = await pdfParse(buffer, {
    // Collect text per page via the page-render callback
    pagerender: async (pageData: { getTextContent: () => Promise<{ items: { str: string }[] }> }) => {
      const content = await pageData.getTextContent()
      const text = content.items.map((item) => item.str).join(' ')
      pages.push(text)
      return text
    },
  })

  const pageCount = data.numpages

  if (pageCount > MAX_PAGES) {
    const err = new Error('Contract exceeds the 20-page limit.') as Error & { code: string }
    err.code = 'TOO_MANY_PAGES'
    throw err
  }

  // Build text with 1-indexed [PAGE N] markers
  const markedText = pages
    .map((pageText, i) => `[PAGE ${i + 1}]\n${pageText}`)
    .join('\n\n')

  const wordCount = markedText.split(/\s+/).filter(Boolean).length
  const tokenCount = Math.ceil(markedText.length / 4)

  if (wordCount < MIN_WORD_COUNT) {
    const err = new Error(
      'Scanned PDFs are not supported yet. Please upload a text-layer PDF.',
    ) as Error & { code: string }
    err.code = 'SCANNED_PDF'
    throw err
  }

  if (tokenCount > MAX_TOKEN_COUNT) {
    const err = new Error('Contract exceeds the 15,000 token limit for MVP.') as Error & {
      code: string
    }
    err.code = 'CONTRACT_TOO_LONG'
    throw err
  }

  return { text: markedText, pageCount, wordCount, tokenCount }
}
