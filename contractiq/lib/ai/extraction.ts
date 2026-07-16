import OpenAI from 'openai'
import { z } from 'zod'
import { getNDAPrompt, NDA_STANDARD_TERMS } from './prompts/nda-extraction'
import { getMSAPrompt, MSA_STANDARD_TERMS } from './prompts/msa-extraction'
import { OPENAI_EXTRACTION_TEMP, OPENAI_EXTRACTION_MAX_TOKENS } from '@/lib/constants'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const termSchema = z.object({
  term_name: z.string().min(1),
  value: z.string().min(1),
  page_number: z.number().int().min(0),
  confidence_score: z.number().min(0).max(100),
  source_sentence: z.string(),
})

const responseSchema = z.object({
  terms: z.array(termSchema),
})

export type ExtractedTerm = z.infer<typeof termSchema>

interface ExtractionInput {
  contractText: string
  contractType: 'nda' | 'msa'
  customTerms: string[]
}

export async function runExtraction(input: ExtractionInput): Promise<ExtractedTerm[]> {
  const systemPrompt = input.contractType === 'nda' ? getNDAPrompt() : getMSAPrompt()
  const userMessage = buildUserMessage(input.contractText, input.contractType, input.customTerms)

  const CORRECTIVE =
    'Your previous response was not valid JSON. Return only a JSON object with a "terms" array, no explanation, no markdown.'

  // Up to 3 attempts
  for (let attempt = 0; attempt < 3; attempt++) {
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ]
    if (attempt > 0) {
      messages.push({ role: 'user', content: CORRECTIVE })
    }

    const raw = await callOpenAI(messages)
    const parsed = tryParse(raw)
    if (!parsed) continue

    const validated = responseSchema.safeParse(parsed)
    if (validated.success) return validated.data.terms
  }

  const err = new Error('AI processing failed after 3 attempts.') as Error & { code: string }
  err.code = 'AI_ERROR'
  throw err
}

async function callOpenAI(messages: OpenAI.ChatCompletionMessageParam[]): Promise<string> {
  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    temperature: OPENAI_EXTRACTION_TEMP,
    max_tokens: OPENAI_EXTRACTION_MAX_TOKENS,
    response_format: { type: 'json_object' },
    messages,
  })
  return response.choices[0]?.message?.content ?? ''
}

function tryParse(raw: string): unknown | null {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function buildUserMessage(
  contractText: string,
  contractType: 'nda' | 'msa',
  customTerms: string[],
): string {
  const standardList = contractType === 'nda' ? NDA_STANDARD_TERMS : MSA_STANDARD_TERMS

  let msg = `CONTRACT TEXT:\n${contractText}\n\n`
  msg += `Extract the following standard terms:\n${standardList.join(', ')}\n\n`
  if (customTerms.length > 0) {
    msg += `Also extract these additional terms: ${customTerms.join(', ')}\n\n`
  }
  msg +=
    'Return a JSON object with a "terms" array. Each term must include: term_name, value, page_number, confidence_score (0–100), source_sentence.'
  return msg
}
