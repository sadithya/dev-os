# Spec 03 — AI Key Term Extraction

**Features:** US-003, US-004, US-005  
**Route:** `POST /api/contracts/process`  
**Tables:** `contracts` (status update), `key_terms` (insert), `custom_key_terms` (read)  
**Depends on:** Spec 02 (upload complete, contract_id exists), `OPENAI_API_KEY`

---

## User Flow

```
1. User clicks "Process Contract" on /upload preview
2. UI transitions to ProcessingProgress stepper (3 steps)
3. POST /api/contracts/process { contract_id, custom_terms?: [] }
4. Server:
   a. Fetch contracts.contract_text + contract_type (verify ownership)
   b. Fetch custom_key_terms for this contract
   c. Merge custom terms (request + DB, deduplicate)
   d. UPDATE contracts SET status = 'processing'
   e. Build few-shot prompt for NDA or MSA
   f. Call OpenAI GPT-4o (JSON mode, temp 0.1, max 2000 tokens)
   g. Parse + Zod-validate JSON response
   h. INSERT INTO key_terms (one row per term)
   i. UPDATE contracts SET status = 'completed'
   j. Return { key_terms: [...] }
5. Frontend receives key_terms → router.push(/contracts/${contractId})
```

---

## Files to Create

| File | Purpose |
|---|---|
| `app/api/contracts/process/route.ts` | POST /api/contracts/process |
| `lib/ai/extraction.ts` | Orchestration: build prompt, call OpenAI, retry, parse |
| `lib/ai/prompts/nda-extraction.ts` | NDA system prompt with few-shot examples |
| `lib/ai/prompts/msa-extraction.ts` | MSA system prompt with few-shot examples |
| `lib/validation/process.schema.ts` | Zod: request body validation |

---

## API: `POST /api/contracts/process`

**Request body:**
```json
{
  "contract_id": "uuid",
  "custom_terms": ["Non-compete radius", "Arbitration clause"]
}
```

**Server steps:**
```typescript
1. Verify session → 401 if missing

2. Validate body with processSchema:
   - contract_id: z.string().uuid()
   - custom_terms: z.array(z.string().max(100)).max(5).optional().default([])

3. Fetch contract:
   const { data: contract } = await supabase
     .from('contracts')
     .select('contract_text, contract_type, status, user_id')
     .eq('id', contract_id)
     .eq('user_id', session.user.id)
     .single()
   If null → 404 CONTRACT_NOT_FOUND
   If contract.user_id !== session.user.id → 403 FORBIDDEN

4. Check rate limit:
   const { allowed } = await checkRateLimit(supabase, session.user.id, 'contracts/process', 20)
   If !allowed → 429 RATE_LIMIT_EXCEEDED

5. Fetch custom terms from DB:
   const { data: dbCustomTerms } = await supabase
     .from('custom_key_terms')
     .select('term_name')
     .eq('contract_id', contract_id)
   const allCustomTerms = [...new Set([
     ...dbCustomTerms.map(t => t.term_name),
     ...custom_terms,
   ])]

6. UPDATE contracts SET status = 'processing' WHERE id = contract_id

7. const keyTerms = await runExtraction({
     contractText: contract.contract_text,
     contractType: contract.contract_type,
     customTerms: allCustomTerms,
   })
   — see lib/ai/extraction.ts below

8. INSERT INTO key_terms (batch):
   const rows = keyTerms.map(term => ({
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
   await supabase.from('key_terms').insert(rows)

9. UPDATE contracts SET status = 'completed' WHERE id = contract_id

10. Return 200: { data: { key_terms: rows }, error: null }
```

**Error responses:**

| Status | Code | Message |
|---|---|---|
| 400 | `TOO_MANY_CUSTOM_TERMS` | "Maximum 5 custom terms allowed." |
| 401 | `UNAUTHORIZED` | "Authentication required." |
| 403 | `FORBIDDEN` | "Contract does not belong to this user." |
| 404 | `CONTRACT_NOT_FOUND` | "Contract not found." |
| 429 | `RATE_LIMIT_EXCEEDED` | "Too many requests. Please wait before processing another contract." |
| 504 | `AI_TIMEOUT` | "AI processing timed out. Your contract has been saved — please try again." |
| 500 | `AI_ERROR` | "AI processing failed. Please try again." |

On 504 or 500: `UPDATE contracts SET status = 'error'`

---

## `lib/ai/extraction.ts`

```typescript
import OpenAI from 'openai'
import { z } from 'zod'
import { getNDAPrompt } from './prompts/nda-extraction'
import { getMSAPrompt } from './prompts/msa-extraction'
import {
  OPENAI_EXTRACTION_TEMP,
  OPENAI_EXTRACTION_MAX_TOKENS,
} from '@/lib/constants'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const termSchema = z.object({
  term_name:        z.string().min(1),
  value:            z.string().min(1),
  page_number:      z.number().int().positive(),
  confidence_score: z.number().min(0).max(100),
  source_sentence:  z.string().min(1),
})

const responseSchema = z.object({
  terms: z.array(termSchema),
})

export type ExtractedTerm = z.infer<typeof termSchema>

interface ExtractionInput {
  contractText: string
  contractType: 'nda' | 'msa'
  customTerms:  string[]
}

export async function runExtraction(input: ExtractionInput): Promise<ExtractedTerm[]> {
  const systemPrompt = input.contractType === 'nda'
    ? getNDAPrompt()
    : getMSAPrompt()

  const userMessage = buildUserMessage(input.contractText, input.contractType, input.customTerms)

  // Attempt 1
  let raw = await callOpenAI(systemPrompt, userMessage)
  let parsed = tryParse(raw)

  // Attempt 2: corrective prompt if JSON fails
  if (!parsed) {
    const corrective = 'Your previous response was not valid JSON. Return only a JSON object with a "terms" array, no explanation.'
    raw = await callOpenAI(systemPrompt, userMessage, corrective)
    parsed = tryParse(raw)
  }

  // Attempt 3
  if (!parsed) {
    const corrective = 'Your previous response was not valid JSON. Return only a JSON object with a "terms" array, no explanation.'
    raw = await callOpenAI(systemPrompt, userMessage, corrective)
    parsed = tryParse(raw)
  }

  if (!parsed) {
    throw Object.assign(new Error('AI_ERROR'), { code: 'AI_ERROR' })
  }

  // Validate schema
  const validated = responseSchema.safeParse(parsed)
  if (!validated.success) {
    throw Object.assign(new Error('AI_ERROR'), { code: 'AI_ERROR' })
  }

  return validated.data.terms
}

async function callOpenAI(
  systemPrompt: string,
  userMessage: string,
  correctiveMessage?: string,
): Promise<string> {
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user',   content: userMessage },
  ]
  if (correctiveMessage) {
    messages.push({ role: 'user', content: correctiveMessage })
  }

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
  try { return JSON.parse(raw) } catch { return null }
}

function buildUserMessage(
  contractText: string,
  contractType: 'nda' | 'msa',
  customTerms: string[],
): string {
  const standardList = contractType === 'nda'
    ? NDA_STANDARD_TERMS
    : MSA_STANDARD_TERMS

  let msg = `CONTRACT TEXT:\n${contractText}\n\n`
  msg += `Extract the following standard terms:\n${standardList.join(', ')}\n\n`
  if (customTerms.length > 0) {
    msg += `Also extract the following additional terms: ${customTerms.join(', ')}\n\n`
  }
  msg += 'Return a JSON object with a "terms" array. Each term must include: term_name, value, page_number, confidence_score (0–100), source_sentence.'
  return msg
}

const NDA_STANDARD_TERMS = [
  'Parties', 'Effective Date', 'Confidentiality Obligations', 'Permitted Disclosures',
  'Term & Duration', 'Governing Law', 'Jurisdiction', 'IP Ownership',
  'Non-Solicitation', 'Breach & Remedy',
]

const MSA_STANDARD_TERMS = [
  'Parties', 'Service Scope', 'Payment Terms', 'Invoice Schedule',
  'Late Payment Penalty', 'Liability Cap', 'Indemnification', 'IP Ownership',
  'Termination Clause', 'Governing Law', 'Dispute Resolution', 'Notice Period',
]
```

---

## `lib/ai/prompts/nda-extraction.ts`

```typescript
export function getNDAPrompt(): string {
  return `You are a legal contract analysis assistant specialising in Non-Disclosure Agreements (NDAs).

Your task: extract specific key terms from the NDA text provided. Return ONLY a valid JSON object with a "terms" array. No preamble, no explanation.

Each term object must have exactly these fields:
- term_name: string (exact name from the requested list)
- value: string (the actual value or clause found in the document)
- page_number: integer (the [PAGE N] marker number where the term was found)
- confidence_score: number between 0 and 100 (how confident you are in the extraction)
- source_sentence: string (the verbatim sentence from the document that contains this term)

If a term is not found in the document, still include it with:
- value: "Not found"
- confidence_score: 0
- source_sentence: ""
- page_number: 0

EXAMPLE 1:
Contract excerpt (page 2):
"[PAGE 2]
This Agreement is entered into as of January 15, 2024 (the 'Effective Date') between Acme Corp, a Delaware corporation ('Disclosing Party') and Beta Inc, a California LLC ('Receiving Party').
The Receiving Party agrees to keep all Confidential Information strictly confidential for a period of two (2) years from the Effective Date."

Request: Extract "Parties", "Effective Date", "Term & Duration"

Response:
{
  "terms": [
    {
      "term_name": "Parties",
      "value": "Acme Corp (Disclosing Party) and Beta Inc (Receiving Party)",
      "page_number": 2,
      "confidence_score": 97,
      "source_sentence": "This Agreement is entered into as of January 15, 2024 (the 'Effective Date') between Acme Corp, a Delaware corporation ('Disclosing Party') and Beta Inc, a California LLC ('Receiving Party')."
    },
    {
      "term_name": "Effective Date",
      "value": "January 15, 2024",
      "page_number": 2,
      "confidence_score": 99,
      "source_sentence": "This Agreement is entered into as of January 15, 2024 (the 'Effective Date')..."
    },
    {
      "term_name": "Term & Duration",
      "value": "2 years from the Effective Date",
      "page_number": 2,
      "confidence_score": 95,
      "source_sentence": "The Receiving Party agrees to keep all Confidential Information strictly confidential for a period of two (2) years from the Effective Date."
    }
  ]
}

EXAMPLE 2:
Contract excerpt (page 4):
"[PAGE 4]
This Agreement shall be governed by and construed in accordance with the laws of the State of New York, without regard to its conflict of law provisions. Any disputes shall be resolved exclusively in the courts of New York County."

Request: Extract "Governing Law", "Jurisdiction"

Response:
{
  "terms": [
    {
      "term_name": "Governing Law",
      "value": "Laws of the State of New York",
      "page_number": 4,
      "confidence_score": 98,
      "source_sentence": "This Agreement shall be governed by and construed in accordance with the laws of the State of New York, without regard to its conflict of law provisions."
    },
    {
      "term_name": "Jurisdiction",
      "value": "Courts of New York County",
      "page_number": 4,
      "confidence_score": 96,
      "source_sentence": "Any disputes shall be resolved exclusively in the courts of New York County."
    }
  ]
}

EXAMPLE 3:
Contract with no IP clause found.

Request: Extract "IP Ownership"

Response:
{
  "terms": [
    {
      "term_name": "IP Ownership",
      "value": "Not found",
      "page_number": 0,
      "confidence_score": 0,
      "source_sentence": ""
    }
  ]
}

Now extract the terms from the contract text provided by the user. Return ONLY the JSON object.`
}
```

---

## `lib/ai/prompts/msa-extraction.ts`

```typescript
export function getMSAPrompt(): string {
  return `You are a legal contract analysis assistant specialising in Master Service Agreements (MSAs).

Your task: extract specific key terms from the MSA text provided. Return ONLY a valid JSON object with a "terms" array. No preamble, no explanation.

Each term object must have exactly these fields:
- term_name: string (exact name from the requested list)
- value: string (the actual value or clause found in the document)
- page_number: integer (the [PAGE N] marker number where the term was found)
- confidence_score: number between 0 and 100
- source_sentence: string (verbatim sentence from the document)

If a term is not found: value="Not found", confidence_score=0, source_sentence="", page_number=0.

EXAMPLE 1:
"[PAGE 3]
Client shall pay all invoices within thirty (30) days of the invoice date. Invoices will be issued on the first day of each month for services rendered in the prior month. Late payments shall accrue interest at the rate of 1.5% per month."

Request: Extract "Payment Terms", "Invoice Schedule", "Late Payment Penalty"

Response:
{
  "terms": [
    {
      "term_name": "Payment Terms",
      "value": "Net 30 days from invoice date",
      "page_number": 3,
      "confidence_score": 97,
      "source_sentence": "Client shall pay all invoices within thirty (30) days of the invoice date."
    },
    {
      "term_name": "Invoice Schedule",
      "value": "First day of each month for prior month's services",
      "page_number": 3,
      "confidence_score": 95,
      "source_sentence": "Invoices will be issued on the first day of each month for services rendered in the prior month."
    },
    {
      "term_name": "Late Payment Penalty",
      "value": "1.5% per month interest on late payments",
      "page_number": 3,
      "confidence_score": 96,
      "source_sentence": "Late payments shall accrue interest at the rate of 1.5% per month."
    }
  ]
}

EXAMPLE 2:
"[PAGE 5]
Provider's total aggregate liability to Client under this Agreement shall not exceed the total fees paid by Client to Provider in the three (3) month period immediately preceding the event giving rise to the claim. Each party shall indemnify, defend, and hold harmless the other party from any third-party claims arising from its own negligence or willful misconduct."

Request: Extract "Liability Cap", "Indemnification"

Response:
{
  "terms": [
    {
      "term_name": "Liability Cap",
      "value": "Total fees paid in the 3 months preceding the claim",
      "page_number": 5,
      "confidence_score": 94,
      "source_sentence": "Provider's total aggregate liability to Client under this Agreement shall not exceed the total fees paid by Client to Provider in the three (3) month period immediately preceding the event giving rise to the claim."
    },
    {
      "term_name": "Indemnification",
      "value": "Mutual indemnification for third-party claims arising from negligence or willful misconduct",
      "page_number": 5,
      "confidence_score": 92,
      "source_sentence": "Each party shall indemnify, defend, and hold harmless the other party from any third-party claims arising from its own negligence or willful misconduct."
    }
  ]
}

EXAMPLE 3:
"[PAGE 7]
Either party may terminate this Agreement with thirty (30) days' written notice. Either party may terminate immediately upon written notice if the other party materially breaches this Agreement and fails to cure such breach within fifteen (15) days of notice."

Request: Extract "Termination Clause", "Notice Period"

Response:
{
  "terms": [
    {
      "term_name": "Termination Clause",
      "value": "30 days written notice; immediate termination for uncured material breach after 15 days cure period",
      "page_number": 7,
      "confidence_score": 96,
      "source_sentence": "Either party may terminate this Agreement with thirty (30) days' written notice."
    },
    {
      "term_name": "Notice Period",
      "value": "30 days for termination without cause; 15 days cure period for material breach",
      "page_number": 7,
      "confidence_score": 93,
      "source_sentence": "Either party may terminate immediately upon written notice if the other party materially breaches this Agreement and fails to cure such breach within fifteen (15) days of notice."
    }
  ]
}

Now extract the terms from the contract text provided by the user. Return ONLY the JSON object.`
}
```

---

## `lib/validation/process.schema.ts`

```typescript
import { z } from 'zod'
import { MAX_CUSTOM_TERMS } from '@/lib/constants'

export const processSchema = z.object({
  contract_id: z.string().uuid({ message: 'contract_id must be a valid UUID.' }),
  custom_terms: z
    .array(z.string().min(1).max(100))
    .max(MAX_CUSTOM_TERMS, { message: `Maximum ${MAX_CUSTOM_TERMS} custom terms allowed.` })
    .optional()
    .default([]),
})
```

---

## Confidence Score Colour Mapping

Defined in `lib/constants.ts` and used by `ConfidenceBar.jsx`:

| Score | Colour | Tailwind class | Hex |
|---|---|---|---|
| ≥ 80% | Green | `text-green-500` / `bg-green-500` | `#13A10E` |
| 50–79% | Yellow/Amber | `text-yellow-500` / `bg-yellow-500` | `#FFAA33` |
| < 50% | Red | `text-red-500` / `bg-red-500` | `#D13438` |

Terms with `confidence_score < 50`:
- Show ⚠️ icon (Lucide `AlertTriangle`)
- Attach `Tooltip` component: "Low confidence — we recommend verifying this in the document directly."
- Tooltip must NOT be dismissible (stays visible on hover/focus)

---

## Edge Cases

| Scenario | Handling |
|---|---|
| OpenAI returns valid JSON but missing some terms | Include whatever is returned; missing terms won't appear in results |
| term.value = "Not found" | Display as-is with confidence 0 and ⚠️ flag |
| confidence_score not a number in response | Zod validation fails → retry corrective prompt |
| page_number references a page beyond page_count | Still stored; PDF viewer silently ignores out-of-range scroll |
| Custom term same name as standard term | Deduplicated; only one row inserted, is_manual = false (standard wins) |
| Contract already has status = 'completed' | Allow re-processing (user can retry); old key_terms NOT deleted — new rows appended; frontend shows latest |
| OpenAI rate limit (429 from OpenAI) | Caught as AI_ERROR, status = 'error', 500 returned to client |
| Response > 2000 tokens truncated by OpenAI | Partial JSON → retry corrective prompt |
| Network timeout to OpenAI (> 30s) | Caught → AI_TIMEOUT, status = 'error', 504 returned |

---

## Acceptance Criteria

- [ ] Standard NDA/MSA terms are extracted with ≥ 88%/85% F1 on test set
- [ ] Each extracted term has: term_name, value, page_number, confidence_score, source_sentence
- [ ] Custom terms appear in results with `is_manual = true`
- [ ] `confidence_score` is stored as `numeric(5,2)` (e.g. 87.50)
- [ ] Terms with confidence < 50% show ⚠️ icon in the UI
- [ ] JSON parse failure triggers retry up to 3 attempts before returning 504
- [ ] On AI failure, `contracts.status` is set to `'error'`
- [ ] Rate limit of 20 extractions/user/hour is enforced
- [ ] Extraction completes in ≤ 30 seconds P95
- [ ] Estimated cost per 15,000-token contract ≤ $0.25
