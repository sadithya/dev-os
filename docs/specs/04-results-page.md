# Spec 04 — Results Page (PDF Viewer + Key Terms Panel)

**Features:** US-003, US-004, US-006, US-011-partial  
**Route:** `/contracts/[id]`  
**API:** `GET /api/contracts/[id]`  
**Tables:** `contracts` (read + update `last_accessed_at`), `key_terms` (read)  
**Depends on:** Spec 02 (upload), Spec 03 (extraction complete)

---

## User Flow

```
1. Redirect to /contracts/[id] after extraction completes (from upload page)
   OR user clicks a row in the dashboard

2. Page load:
   a. GET /api/contracts/[id]
      → Returns: contract metadata, signed_url (or null), key_terms[], chat_session_id
   b. UPDATE contracts SET last_accessed_at = now()

3. Render two-column layout:
   Left (60%):  PDF viewer (if signed_url) OR text viewer fallback (if signed_url null)
   Right (40%): Key terms panel

4. User interactions:
   - Clicks page number on a key term → both viewers scroll to that page
   - Expands "Why?" section → sees source_sentence
   - Clicks ⚠️ icon on low-confidence term → tooltip appears
   - Clicks "Chat" tab → ChatInterface renders (Spec 05)
   - Clicks term value → inline edit activates (Spec 07)
   - Thumbs up/down → feedback submitted (Spec 07)

5. "Not legal advice" disclaimer visible at all times on results page
```

---

## Files to Create

| File | Purpose |
|---|---|
| `app/(protected)/contracts/[id]/page.jsx` | Results page (server component fetches data) |
| `components/viewer/PDFViewer.jsx` | PDF.js-based viewer |
| `components/viewer/TextViewerFallback.jsx` | Text-based fallback using [PAGE N] markers |
| `components/contracts/KeyTermsPanel.jsx` | Right panel: list of KeyTermCard |
| `components/contracts/KeyTermCard.jsx` | Individual term card with edit, confidence, why |
| `components/contracts/ConfidenceBar.jsx` | Colour-coded confidence indicator |
| `components/contracts/SourceSentence.jsx` | Expandable "Why?" section |
| `components/contracts/FeedbackWidget.jsx` | Thumbs up/down (see Spec 07) |
| `app/api/contracts/[id]/route.ts` | GET /api/contracts/[id] |

---

## API: `GET /api/contracts/[id]`

```typescript
1. Verify session → 401 if missing
2. Fetch contract:
   SELECT id, file_name, contract_type, status, page_count, created_at, file_path, contract_text
   FROM contracts
   WHERE id = :id AND user_id = auth.uid()
   → If null → 404 CONTRACT_NOT_FOUND

3. UPDATE contracts SET last_accessed_at = now() WHERE id = :id

4. Generate signed URL (server-side):
   If contract.file_path is not null:
     const { data } = await supabase.storage
       .from('contracts')
       .createSignedUrl(contract.file_path, SIGNED_URL_EXPIRY_SECONDS)
     signed_url = data.signedUrl
   Else:
     signed_url = null

5. Fetch key terms:
   SELECT * FROM key_terms WHERE contract_id = :id ORDER BY created_at ASC

6. Fetch or create chat session:
   const { data: session } = await supabase
     .from('chat_sessions')
     .select('id')
     .eq('contract_id', id)
     .single()
   chat_session_id = session?.id ?? null

7. Return 200:
{
  "data": {
    "contract": {
      "id": "uuid",
      "file_name": "acme-nda.pdf",
      "contract_type": "nda",
      "status": "completed",
      "page_count": 8,
      "created_at": "2026-07-14T10:00:00Z",
      "signed_url": "https://...supabase.co/...?token=...&expires=...",
      "contract_text": "..."   ← included for text viewer fallback
    },
    "key_terms": [...],
    "chat_session_id": "uuid | null"
  },
  "error": null
}
```

**Error responses:**

| Status | Code | Message |
|---|---|---|
| 401 | `UNAUTHORIZED` | "Authentication required." |
| 403 | `FORBIDDEN` | "Contract does not belong to this user." |
| 404 | `CONTRACT_NOT_FOUND` | "Contract not found." |

---

## Page Layout: `app/(protected)/contracts/[id]/page.jsx`

```
Layout (server component — fetches data via GET /api/contracts/[id]):

┌─────────────────────────────────────────────────────────────────┐
│  Nav                                                            │
├────────────────────────────┬────────────────────────────────────┤
│  PDF Viewer (60%)          │  Key Terms Panel (40%)             │
│                            │                                     │
│  PDFViewer                 │  Contract name + type badge        │
│  OR                        │  ─────────────────────────────     │
│  TextViewerFallback        │  KeyTermCard × N                   │
│                            │  ─────────────────────────────     │
│                            │  FeedbackWidget                    │
│                            │  ─────────────────────────────     │
│                            │  "Not legal advice" disclaimer     │
├────────────────────────────┴────────────────────────────────────┤
│  Chat tab (floating bottom-right, renders ChatInterface)        │
└─────────────────────────────────────────────────────────────────┘

State (client):
  targetPage: number        ← set when user clicks page number in KeyTermCard
  isChatOpen: boolean       ← toggle Chat tab

Key terms panel scrolls independently from PDF viewer.
targetPage is lifted state shared between KeyTermsPanel and viewer.
```

Since this page needs both server data fetching AND client interactivity (targetPage state):
- Outer page.jsx = Server Component: fetches data, passes as props
- Inner `ResultsClient.jsx` = `'use client'`: owns targetPage state, renders viewers + panel

```jsx
// app/(protected)/contracts/[id]/page.jsx  (Server Component)
export default async function ResultsPage({ params }) {
  const res = await fetch(`/api/contracts/${params.id}`, { cache: 'no-store', headers: ... })
  const { data } = await res.json()
  return <ResultsClient contract={data.contract} keyTerms={data.key_terms} chatSessionId={data.chat_session_id} />
}

// components/contracts/ResultsClient.jsx  ('use client')
export default function ResultsClient({ contract, keyTerms, chatSessionId }) {
  const [targetPage, setTargetPage] = useState(1)
  const [isChatOpen, setIsChatOpen] = useState(false)
  ...
}
```

---

## Component: `components/viewer/PDFViewer.jsx`

```
'use client'

Props:
  signedUrl: string
  targetPage: number

Library: pdfjs-dist v4

Setup:
  import * as pdfjsLib from 'pdfjs-dist'
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'
  (Copy worker from node_modules/pdfjs-dist/build/pdf.worker.min.js to public/)

State:
  pdfDoc: PDFDocumentProxy | null
  numPages: number
  renderError: boolean

On mount:
  pdfjsLib.getDocument(signedUrl).promise.then(doc => setPdfDoc(doc))
  .catch(() => setRenderError(true))

On targetPage change:
  containerRef.current.querySelector(`[data-page="${targetPage}"]`)
    ?.scrollIntoView({ behavior: 'smooth' })

Rendering:
  Render all pages as <canvas> elements in a scrollable container
  Each canvas: data-page={pageNum}
  Use lazy rendering: only render pages within 1 viewport of scroll position
  (Use IntersectionObserver to trigger render per page)

Fallback (renderError = true):
  Show "PDF preview unavailable" + "Download PDF" link (uses signed URL directly)

Download link:
  <a href={signedUrl} download={contract.file_name}>Download PDF</a>

Styling:
  Container: overflow-y: auto; max-height: calc(100vh - 64px)
  Canvas: display block; margin: 0 auto; box-shadow: 0 1px 4px rgba(0,0,0,0.1)
  Gap between pages: 8px
```

---

## Component: `components/viewer/TextViewerFallback.jsx`

```
'use client'

Props:
  contractText: string       ← the full text with [PAGE N] markers
  targetPage: number

Logic:
  Split contractText on regex /\[PAGE (\d+)\]/
  Build array: [{ pageNum: 1, text: '...' }, { pageNum: 2, text: '...' }, ...]

On targetPage change:
  sectionRefs[targetPage]?.current.scrollIntoView({ behavior: 'smooth' })

Rendering:
  Scrollable container
  For each page:
    <section ref={sectionRefs[pageNum]} data-page={pageNum}>
      <div className="page-label">Page {pageNum}</div>
      <pre className="font-contract">{pageText}</pre>
      <hr />
    </section>

Styling:
  Container: overflow-y: auto; max-height: calc(100vh - 64px); padding: 16px
  page-label: font-size: 12px; color: grey-500; font-weight: 500; margin-bottom: 8px
  pre: font-family: JetBrains Mono; font-size: 13px; white-space: pre-wrap; color: grey-900
  hr: border-color: grey-50; margin: 24px 0
```

---

## Component: `components/contracts/KeyTermsPanel.jsx`

```
Props:
  keyTerms: KeyTerm[]
  onPageClick: (page: number) => void
  contractId: string
  chatSessionId: string | null

Renders:
  Scrollable list of KeyTermCard components
  At bottom: FeedbackWidget
  At bottom: "⚠️ This output is for informational purposes only and does not constitute legal advice."
    Style: font-size: 12px, color: grey-400, padding: 16px

Loading state (keyTerms null):
  8× Skeleton rows

Empty state (keyTerms.length === 0):
  "No key terms extracted." — should not happen in normal flow
```

---

## Component: `components/contracts/KeyTermCard.jsx`

```
'use client'

Props:
  term: KeyTerm
  onPageClick: (page: number) => void
  onUpdate: (id: string, newValue: string) => void    ← from inline edit (Spec 07)

State:
  isEditing: boolean
  isExpanded: boolean   ← "Why?" section
  editValue: string

Layout:
┌──────────────────────────────────────────┐
│  [Term Name]           [Custom?] [Edited?]  │  ← badges (if is_manual / is_edited)
│  [Value]  OR  [Input field if isEditing]    │
│  Page [N] · [ConfidenceBar]  [⚠️ if <50%]  │
│  ▼ Why?                                     │  ← toggles SourceSentence
└──────────────────────────────────────────┘

Term Name: 16px Medium, grey-900
Value: 16px Regular, grey-700 (or input when editing)
Page N: clickable text link → onPageClick(term.page_number)
         Style: font-size: 12px, color: blue-500, cursor: pointer

Badges:
  Custom: bg-violet-50, border-violet-200, text-violet-700, "Custom"
  Edited: bg-blue-50, border-blue-200, text-blue-700, "Edited"

Low confidence (confidence_score < 50):
  AlertTriangle icon (Lucide, 14px, red-500) before term name
  Wrapped in Tooltip: "Low confidence — we recommend verifying this in the document directly."
  Tooltip trigger: hover and focus
  Tooltip: NOT dismissible

Card styling:
  bg-white, border grey-100, border-radius 8px, padding 16px
  gap 8px between sections
```

---

## Component: `components/contracts/ConfidenceBar.jsx`

```
Props:
  score: number (0–100)

Renders:
  Score label:  "92%" — 12px, font-weight 500, color varies
  Bar track:    grey-100 bg, 4px height, border-radius 2px, full width
  Bar fill:     width = `${score}%`, colour by score

Colour logic:
  score >= 80  → green-500 (#13A10E)
  score >= 50  → yellow-500 (#FFAA33)
  score < 50   → red-500 (#D13438)

Accessibility:
  role="meter" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100}
  aria-label={`Confidence: ${score}%`}
```

---

## Component: `components/contracts/SourceSentence.jsx`

```
Props:
  sourceSentence: string
  isExpanded: boolean
  onToggle: () => void

Renders:
  Toggle button: "▼ Why?" when collapsed, "▲ Why?" when expanded
  When expanded:
    <blockquote style="border-left: 2px solid grey-100; padding-left: 12px; margin-top: 8px;">
      <p style="font-size: 12px; color: grey-500; font-style: italic;">
        {sourceSentence}
      </p>
    </blockquote>
  If sourceSentence is empty → hide the "Why?" section entirely
```

---

## Edge Cases

| Scenario | Handling |
|---|---|
| `signed_url` is null (Storage failed) | TextViewerFallback renders automatically; no error shown |
| Signed URL expired (1hr) | PDF.js fetch fails → `renderError = true` → "PDF preview unavailable" + download link (user must refresh to get new URL) |
| Contract status is `'processing'` when page loads | Show "Still processing…" spinner; poll GET /api/contracts/[id] every 3s until status = 'completed' |
| Contract status is `'error'` | Show error banner: "AI processing failed. Try again." + "Reprocess" button (calls POST /api/contracts/process again) |
| page_number = 0 (term not found) | Hide page link; show "—" instead |
| key_terms is empty array | Show "No terms extracted" empty state in panel |
| PDF renders but page is blank | Expected for image-only pages — text viewer fallback preferred in this case |
| User is on mobile | Stacked layout: viewer on top, key terms panel below (single column) |

---

## Acceptance Criteria

- [ ] Results page loads within 3 seconds for a completed contract
- [ ] PDF viewer renders all pages from Supabase Storage signed URL
- [ ] Text viewer fallback renders when `signed_url` is null
- [ ] Clicking a page number in the key terms panel scrolls the active viewer to that page
- [ ] Each term card shows: name, value, page number, confidence bar
- [ ] Terms with confidence < 50 show ⚠️ icon with non-dismissible tooltip
- [ ] "Why?" section expands to reveal `source_sentence`
- [ ] `is_edited` terms show "Edited" badge; `is_manual` terms show "Custom" badge
- [ ] "Not legal advice" disclaimer is visible without scrolling on all screen sizes ≥ 1024px
- [ ] `last_accessed_at` is updated on every page visit
