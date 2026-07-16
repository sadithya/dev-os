# Spec 02 — PDF Upload & Text Extraction

**Feature:** US-002  
**Routes:** `/upload`, `POST /api/contracts/upload`  
**Tables:** `contracts`, `custom_key_terms`  
**Depends on:** Auth (Spec 01), Supabase Storage bucket `contracts`, `pdf-parse` installed

---

## User Flow

```
1. /upload renders:
   - Contract type selector (NDA / MSA)
   - Drag-and-drop zone + "Browse files" fallback
   - [After upload] Pre-processing preview panel

2. User selects contract type → selects/drops PDF

3. Client-side validation:
   - File extension must be .pdf
   - File size must be ≤ 10 MB (10,485,760 bytes)
   - If fail → show inline error, do not upload

4. POST /api/contracts/upload (multipart/form-data)
   - Fields: file, contract_type

5. Server processing:
   a. Re-validate file size and extension
   b. pdf-parse extracts text + page count
   c. Word count check: < 100 words → reject (scanned PDF)
   d. Token count check: > 15,000 → reject (too long)
   e. INSERT INTO contracts (status = 'pending')
   f. Non-blocking: upload PDF to Storage → UPDATE file_path on success
   g. Return { contract_id, page_count, token_count }

6. Frontend receives contract_id → renders pre-processing preview:
   - Standard terms list for selected type (read-only)
   - "+ Add Key Term" input for custom terms (max 5)
   - Custom terms shown with "Custom" badge in the list
   - "Process Contract" button

7. Each custom term added:
   - POST /api/contracts/custom-terms { contract_id, term_name }
   - INSERT INTO custom_key_terms
   - Add to preview list immediately (optimistic)

8. "Process Contract" → triggers Spec 03 (AI extraction)
```

---

## Files to Create

| File | Purpose |
|---|---|
| `app/(protected)/upload/page.jsx` | Upload page (client component) |
| `components/upload/ContractTypeSelector.jsx` | NDA/MSA dropdown |
| `components/upload/DropZone.jsx` | Drag/drop + file picker |
| `components/upload/TermPreviewList.jsx` | Standard + custom term preview |
| `components/upload/CustomTermInput.jsx` | Add custom term input |
| `components/upload/ProcessingProgress.jsx` | 3-step processing stepper |
| `app/api/contracts/upload/route.ts` | POST /api/contracts/upload |
| `lib/pdf/extractor.ts` | pdf-parse wrapper |
| `lib/validation/upload.schema.ts` | Zod validation schema |

---

## API: `POST /api/contracts/upload`

**Content-Type:** `multipart/form-data`

**Request fields:**

| Field | Type | Validation |
|---|---|---|
| `file` | File (PDF) | Required; ≤ 10 MB; extension `.pdf` |
| `contract_type` | string | Required; enum: `nda` \| `msa` |

**Server processing steps:**

```typescript
1. Verify Supabase session → 401 if missing
2. Parse multipart form → extract file + contract_type
3. Validate contract_type: z.enum(['nda', 'msa'])
4. Validate file.size <= MAX_FILE_SIZE_BYTES (10,485,760)
5. Validate file.name ends with '.pdf' (case-insensitive)
6. Convert File → Buffer
7. const { text, pageCount, wordCount, tokenCount } = await extractPDFText(buffer)
   - If pageCount > MAX_PAGES (20) → throw TOO_MANY_PAGES
   - If wordCount < MIN_WORD_COUNT (100) → throw SCANNED_PDF
   - If tokenCount > MAX_TOKEN_COUNT (15,000) → throw CONTRACT_TOO_LONG
8. const { data: contract } = await supabase.from('contracts').insert({
     user_id: session.user.id,
     file_name: file.name,
     contract_type,
     contract_text: text,
     page_count: pageCount,
     token_count: tokenCount,
     status: 'pending',
   }).select().single()
9. Non-blocking (do not await, no error thrown to user):
   storageUpload(buffer, file.name, session.user.id, contract.id)
     .then(filePath => supabase.from('contracts').update({ file_path: filePath }).eq('id', contract.id))
     .catch(() => { /* silent fail — text viewer fallback handles this */ })
10. Return 201: { data: { contract_id: contract.id, status: 'pending', page_count, token_count }, error: null }
```

**Success response (201):**
```json
{
  "data": {
    "contract_id": "uuid",
    "status": "pending",
    "page_count": 12,
    "token_count": 8400
  },
  "error": null
}
```

**Error responses:**

| Status | Code | Message |
|---|---|---|
| 400 | `INVALID_FILE_TYPE` | "Only PDF files are accepted." |
| 400 | `FILE_TOO_LARGE` | "File exceeds the 10 MB limit." |
| 400 | `TOO_MANY_PAGES` | "Contract exceeds the 20-page limit." |
| 400 | `SCANNED_PDF` | "Scanned PDFs are not supported yet. Please upload a text-layer PDF." |
| 400 | `CONTRACT_TOO_LONG` | "Contract exceeds the 15,000 token limit for MVP." |
| 400 | `INVALID_CONTRACT_TYPE` | "contract_type must be 'nda' or 'msa'." |
| 401 | `UNAUTHORIZED` | "Authentication required." |
| 500 | `INTERNAL_ERROR` | "Upload failed. Please try again." |

---

## `lib/pdf/extractor.ts`

```typescript
import pdfParse from 'pdf-parse'
import { MAX_PAGES, MIN_WORD_COUNT, MAX_TOKEN_COUNT } from '@/lib/constants'

export interface PDFExtractResult {
  text: string        // Full text with [PAGE N] markers
  pageCount: number
  wordCount: number
  tokenCount: number  // Approximation: Math.ceil(text.length / 4)
}

export async function extractPDFText(buffer: Buffer): Promise<PDFExtractResult> {
  const pages: string[] = []

  const data = await pdfParse(buffer, {
    pagerender: (pageData) => {
      // Called per page; collect raw text per page
      return pageData.getTextContent().then((textContent: any) => {
        const strings = textContent.items.map((item: any) => item.str)
        pages.push(strings.join(' '))
        return strings.join(' ')
      })
    },
  })

  if (data.numpages > MAX_PAGES) {
    throw Object.assign(new Error('TOO_MANY_PAGES'), { code: 'TOO_MANY_PAGES' })
  }

  // Build text with [PAGE N] markers (1-indexed)
  const markedText = pages
    .map((pageText, i) => `[PAGE ${i + 1}]\n${pageText}`)
    .join('\n\n')

  const wordCount = markedText.split(/\s+/).filter(Boolean).length
  const tokenCount = Math.ceil(markedText.length / 4)

  if (wordCount < MIN_WORD_COUNT) {
    throw Object.assign(new Error('SCANNED_PDF'), { code: 'SCANNED_PDF' })
  }

  if (tokenCount > MAX_TOKEN_COUNT) {
    throw Object.assign(new Error('CONTRACT_TOO_LONG'), { code: 'CONTRACT_TOO_LONG' })
  }

  return { text: markedText, pageCount: data.numpages, wordCount, tokenCount }
}
```

**Notes:**
- `[PAGE N]` markers are `\n[PAGE N]\n` so they are parseable by the text viewer fallback.
- If `pdf-parse` throws (corrupt/unreadable PDF) → let it bubble up → caught in API route → 500 INTERNAL_ERROR.
- Page text from `getTextContent` preserves order but may drop whitespace — acceptable for MVP.

---

## `lib/validation/upload.schema.ts`

```typescript
import { z } from 'zod'
import { MAX_FILE_SIZE_BYTES } from '@/lib/constants'

export const uploadSchema = z.object({
  contract_type: z.enum(['nda', 'msa'], {
    errorMap: () => ({ message: "contract_type must be 'nda' or 'msa'." }),
  }),
})

// Client-side file validation (cannot use Zod for File objects easily)
export function validateFile(file: File): string | null {
  if (!file.name.toLowerCase().endsWith('.pdf')) return 'Only PDF files are accepted.'
  if (file.size > MAX_FILE_SIZE_BYTES) return 'File exceeds the 10 MB limit.'
  return null
}
```

---

## Storage Upload Helper

Location: `app/api/contracts/upload/route.ts` (inline helper, not a shared lib)

```typescript
async function storageUpload(
  buffer: Buffer,
  fileName: string,
  userId: string,
  contractId: string,
): Promise<string> {
  const supabase = createServerClient()
  const filePath = `contracts/${userId}/${contractId}/${fileName}`
  const { error } = await supabase.storage
    .from('contracts')
    .upload(filePath, buffer, { contentType: 'application/pdf', upsert: false })
  if (error) throw error
  return filePath
}
```

---

## Component Specs

### `app/(protected)/upload/page.jsx`

```
'use client'

State:
  step: 'select-type' | 'drop-file' | 'preview' | 'processing' | 'error'
  contractType: 'nda' | 'msa' | null
  contractId: string | null
  uploadError: string | null
  customTerms: string[]

Step transitions:
  select-type → (type chosen) → drop-file
  drop-file → (file validated + uploaded) → preview
  preview → (Process Contract clicked) → processing
  processing → (extraction done) → router.push(`/contracts/${contractId}`)
  any step → (error) → error state with retry CTA

Layout: centered card, max-width 640px, white bg, border, 8px radius, 40px padding
```

### `components/upload/DropZone.jsx`

```
Props:
  onFile: (file: File) => void
  error: string | null
  disabled: boolean

State:
  isDragging: boolean

Events:
  onDragEnter, onDragOver → setIsDragging(true)
  onDragLeave, onDrop → setIsDragging(false)
  onDrop → e.preventDefault(); validate file; call onFile()
  onClick → open hidden <input type="file" accept=".pdf" />

Visual states:
  Default: dashed border grey-200, grey-25 bg, "Drag your PDF here or Browse files"
  Dragging: border-blue-500 bg-blue-50
  Error: border-red-500 bg-red-50, error message below
  Disabled: opacity-50, pointer-events-none

File size hint: "Max 10 MB · Up to 20 pages · Text-layer PDFs only"
```

### `components/upload/TermPreviewList.jsx`

```
Props:
  contractType: 'nda' | 'msa'
  customTerms: string[]
  onRemoveCustomTerm: (term: string) => void

Renders two sections:
  "Standard Terms" — fixed list for NDA (10) or MSA (12), read-only, grey text
  "Custom Terms" — each with "Custom" badge + remove (×) button

Standard NDA terms: Parties, Effective Date, Confidentiality Obligations,
  Permitted Disclosures, Term & Duration, Governing Law, Jurisdiction,
  IP Ownership, Non-Solicitation, Breach & Remedy

Standard MSA terms: Parties, Service Scope, Payment Terms, Invoice Schedule,
  Late Payment Penalty, Liability Cap, Indemnification, IP Ownership,
  Termination Clause, Governing Law, Dispute Resolution, Notice Period
```

### `components/upload/CustomTermInput.jsx`

```
Props:
  contractId: string
  currentCount: number
  maxTerms: number (5)
  onAdd: (term: string) => void

State:
  inputValue: string
  loading: boolean
  error: string | null

On submit:
  If currentCount >= maxTerms → setError('Maximum 5 custom terms allowed.')
  If inputValue.trim() empty → setError('Enter a term name.')
  POST /api/contracts/custom-terms { contract_id, term_name }
  On success → onAdd(term_name); setInputValue('')

Visual:
  Input + "Add" button side by side
  Placeholder: "e.g. Non-compete radius"
  Counter: "3 / 5 custom terms added"
  Disabled if currentCount >= maxTerms
```

### `components/upload/ProcessingProgress.jsx`

```
Props:
  currentStep: 1 | 2 | 3

Steps:
  1. "Extracting text from PDF"
  2. "Analysing with AI"
  3. "Compiling results"

Each step: circle indicator (pending/active/done) + label
Active step shows animated Spinner
Completed step shows green checkmark
```

---

## Custom Terms API

### `POST /api/contracts/custom-terms`

```json
Request: { "contract_id": "uuid", "term_name": "Non-compete radius" }

Validation:
  - contract_id: must exist and belong to auth.uid()
  - term_name: non-empty string, ≤ 100 chars
  - Count check: SELECT COUNT(*) FROM custom_key_terms WHERE contract_id = ? AND user_id = ?
    If >= 5 → 400 TOO_MANY_CUSTOM_TERMS

Processing:
  INSERT INTO custom_key_terms (contract_id, user_id, term_name)

Response 201: { "data": { "id": "uuid", "term_name": "Non-compete radius" }, "error": null }
```

### `DELETE /api/contracts/custom-terms/[id]`

```
Verify ownership (custom_key_terms.user_id = auth.uid())
DELETE FROM custom_key_terms WHERE id = ? AND user_id = ?
Response 200: { "data": { "id": "uuid" }, "error": null }
```

---

## Edge Cases

| Scenario | Handling |
|---|---|
| User drops multiple files | Accept first file only; ignore rest |
| PDF with text but no readable content (empty pages) | wordCount < 100 → SCANNED_PDF error |
| Storage upload fails | file_path stays null; text viewer fallback renders instead; extraction still works |
| User refreshes during processing | Contract row exists with status='pending'; upload page shows empty state; user must re-upload |
| File with `.PDF` (uppercase) extension | `file.name.toLowerCase().endsWith('.pdf')` handles it |
| 0-byte file uploaded | pdf-parse throws → caught as INTERNAL_ERROR |
| Network timeout during upload | Show retry banner: "Upload failed. Try again." |
| Concurrent uploads from same user | Each gets its own contract_id; no conflict |

---

## Acceptance Criteria

- [ ] Upload page shows contract type selector before file picker
- [ ] Drag-and-drop zone accepts `.pdf` files; rejects non-PDF with inline error
- [ ] Files > 10 MB are rejected client-side before any network request
- [ ] Scanned PDFs (< 100 words) show "Scanned PDFs are not supported yet" error
- [ ] Contracts > 15,000 tokens are rejected with a clear message
- [ ] Successful upload renders pre-processing preview with the correct standard term list
- [ ] Up to 5 custom terms can be added; 6th shows "Maximum 5 custom terms allowed"
- [ ] Custom terms appear with "Custom" badge in the preview list
- [ ] "Process Contract" button triggers the AI pipeline (Spec 03)
- [ ] If Storage upload fails silently, the rest of the flow is unaffected
- [ ] Extraction completes within 30 seconds (P95)
