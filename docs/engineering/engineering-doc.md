# ContractIQ — Engineering Document

**Version:** 1.0
**Date:** 2026-10-05
**Status:** Approved
**PRD Source:** `docs/ContractIQ_PRD.md`
**Spec Sources:** `docs/specs/01-auth.md` through `docs/specs/09-shared-ui-components.md`
**SQL Schema:** `docs/specs/supabase-schema.sql`

> This document is the authoritative technical reference for the ContractIQ engineering team.
> No implementation begins without approval of the relevant section.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Scope](#2-product-scope)
3. [User Personas](#3-user-personas)
4. [User Flows](#4-user-flows)
5. [Frontend Architecture](#5-frontend-architecture)
6. [Backend Architecture](#6-backend-architecture)
7. [Database Design and Schema](#7-database-design-and-schema)
8. [AI Architecture](#8-ai-architecture)
9. [API Specification](#9-api-specification)
10. [Feature Breakdown](#10-feature-breakdown)
11. [Folder Structure](#11-folder-structure)
12. [Naming Conventions](#12-naming-conventions)
13. [Testing Strategy](#13-testing-strategy)
14. [Specs to Implementation Mapping](#14-specs-to-implementation-mapping)

---

## 1. Executive Summary

**Project Name:** ContractIQ

**Business Goal:** Reduce NDA and MSA contract review time for SMBs from 90–120 minutes to ≤15 minutes by automatically extracting key terms with page-level attribution, confidence scoring, and a plain-English Q&A interface — eliminating the need for in-house legal expertise at review time.

**Problem Statement:** Founders, operations managers, and procurement leads at companies with 5–250 employees routinely sign NDAs and MSAs without fully understanding the terms. A single contract review consumes 90–120 minutes and requires legal expertise most SMBs don't have, leading to missed auto-renewal clauses, unfavourable indemnification limits, and IP assignment obligations. Enterprise tools (DocuSign CLM, Ironclad, Kira) cost $50k–$500k/year and are built for legal departments. Generic AI (ChatGPT) lacks structured extraction, page attribution, confidence scoring, and contract-type-specific term libraries.

**Target Users:**
- **Primary:** Founders, COOs, Procurement Managers at 5–250 person companies with no legal team; signing 5–15 NDAs/MSAs per month
- **Secondary:** Freelancers and consultants receiving 1–4 MSAs per month from larger clients; cannot afford legal review

### Success Criteria

| Metric | Target |
|---|---|
| North Star — upload to completed key-term review | ≤ 15 minutes |
| Key-term extraction accuracy F1 (NDA) | ≥ 88% |
| Key-term extraction accuracy F1 (MSA) | ≥ 85% |
| Extraction latency P95 (upload → results panel rendered) | ≤ 30 seconds |
| Chat response latency P95 | ≤ 15 seconds |
| Cost per 20-page contract analysis | ≤ $0.25 |
| 30-day user retention | ≥ 45% |
| AI extraction correction rate | ≤ 12% of terms |
| NPS | ≥ 40 |

### Tech Stack Summary

| Layer | Technology | Version |
|---|---|---|
| Frontend | Next.js App Router, React, Tailwind CSS | Next.js 14.2.5, React 18.3.1 |
| API Layer | Next.js API Routes (Node.js runtime) | Next.js 14.2.5 |
| Database + Auth + Storage | Supabase (PostgreSQL 15, Supabase Auth, Supabase Storage) | @supabase/supabase-js 2.44.3 |
| AI / LLM | OpenAI GPT-4o (JSON mode, 128k context) | openai 4.52.0 |
| PDF Parsing | pdf-parse (Node.js, server-side only) | 1.1.1 |
| PDF Rendering | PDF.js (pdfjs-dist, client-side) | 4.3.136 |
| Schema Validation | Zod | 3.23.8 |
| Icons | Lucide React | 0.400.0 |
| Hosting | Netlify (frontend + API routes via @netlify/plugin-nextjs) | — |

---

## 2. Product Scope

### In Scope (MVP v0.1–v1.0)

- Email/password authentication (sign up, sign in, sign out, session persistence) via Supabase Auth
- PDF upload: ≤10 MB, ≤20 pages, text-layer PDFs only; rejection of scanned PDFs (< 100 words extracted) and oversized contracts (> 15,000 tokens)
- Server-side text extraction with `[PAGE N]` markers using pdf-parse; stored once in `contracts.contract_text`; reused by all downstream pipelines without re-downloading the PDF
- Standard key-term extraction: 10 terms for NDA, 12 terms for MSA, via GPT-4o with few-shot prompting
- Up to 5 custom key terms per analysis, added before processing and appended zero-shot to the extraction prompt
- Confidence scoring (0–100%) per extracted term; colour-coded green/amber/red; ⚠️ warning + non-dismissible tooltip for confidence < 50%
- Page-level attribution (1-indexed) per term; expandable source sentence (verbatim, "Why?" section)
- Inline PDF viewer using PDF.js with signed URL (1-hour expiry) from Supabase Storage
- Text-viewer fallback: parses `[PAGE N]` markers from `contract_text` when Storage is unavailable; both viewers respond identically to `targetPage` prop
- Click-to-navigate from key-terms panel to corresponding page in the active viewer
- Contract chat: document-grounded Q&A via GPT-4o; full contract context on every turn; mandatory `[Page X]` citation; "I cannot find this in the document" fallback
- Persistent chat history per contract; stored in Supabase; rehydrated on page revisit
- Dashboard: total contracts, NDA/MSA counts, sortable/clickable contract list
- Inline key-term editing with "Edited" badge; original `ai_value` preserved in DB
- Feedback: thumbs up/down + optional comment per contract review (P2)
- "Not legal advice" disclaimer on every results page
- Supabase RLS enforced on all 7 tables and the Storage bucket
- Rate limiting: 20 extraction calls/user/hour; 60 chat calls/user/hour (sliding window via `rate_limit_events` table)
- Prompt injection sanitisation on all chat inputs

### Out of Scope (MVP)

- Scanned/image PDFs (OCR) — graceful error shown; planned v1.2
- Non-English contracts or non-US/UK legal conventions
- Export to CSV or PDF report — planned v1.1
- Batch contract upload — planned v1.1
- Multi-user workspaces / team plans — planned v1.2
- Contract comparison view — planned v1.2
- Fine-tuning or training on user data
- Email notifications on processing completion — planned v1.2
- Dashboard analytics charts — planned v1.1
- Chunked RAG for contracts > 15,000 tokens — post-v1.0
- Stripe or payment integration

### Future Enhancements

| Version | Feature |
|---|---|
| v1.1 | Export key terms (CSV + PDF), batch upload (up to 5), dashboard analytics charts, onboarding tooltips |
| v1.2 | OCR for scanned PDFs (AWS Textract or equivalent), contract comparison, email notifications, team workspaces |
| Post-v1.0 | Chunked RAG for contracts > 15,000 tokens, jurisdiction-specific prompt variants, non-English support, fine-tuning on correction data |

---

## 3. User Personas

### Persona 1 — The Time-Pressed Founder / Ops Lead (Primary)

| Attribute | Detail |
|---|---|
| Roles | Founder, COO, Procurement Manager, Legal Ops Manager |
| Company size | 5–250 employees; no in-house legal counsel |
| Industries | SaaS, agency, professional services, fintech, e-commerce |
| Contract volume | Signs 5–15 NDAs or MSAs per month |
| Current behaviour | Google searches, ad-hoc legal consultations at $250–$500/hour |
| Primary pain | 90–120 minutes per review; routinely misses auto-renewal clauses, indemnification limits, IP assignment |
| Technical comfort | Comfortable with web tools; not a lawyer; may not know what "indemnification" means |

**Permissions:** Full access — upload, review, edit terms, chat, view dashboard, submit feedback, delete contracts.

**Primary workflows:**
1. Upload contract → view extracted key terms → verify low-confidence terms directly in PDF → use chat for clarification → save review
2. Return to dashboard → retrieve past reviews → reopen chat session for a specific contract

### Persona 2 — The Freelancer / Consultant (Secondary)

| Attribute | Detail |
|---|---|
| Roles | Designer, developer, marketer, consultant |
| Contract volume | Receives 1–4 MSAs per month from larger clients |
| Current behaviour | Signs without reading carefully because the power imbalance discourages pushback |
| Primary pain | Cannot afford legal review; unsure which clauses are non-standard or risky |
| Technical comfort | Moderate; needs plain-English explanations of legal terms throughout the UI |

**Permissions:** Identical to Primary (single user tier at MVP).

**Primary workflow:** Upload client MSA → scan confidence-flagged terms → use chat to understand unusual clauses → export summary for reference (v1.1).

---

## 4. User Flows

All flows use the format:
```
User Action → Frontend Behaviour → Backend Processing → Database Interaction → System Response
```

### Flow 1 — New Visitor Sign Up → Dashboard

```
User clicks "Get Started Free" on landing page (/)
  → Frontend navigates to /auth/signup
  → User enters email + password → submits form
  → Frontend calls supabase.auth.signUp({ email, password })
    → Supabase Auth: creates auth.users row; sends verification email
  → Frontend shows success state: "Check your inbox for a verification link to {email}"
  → User clicks verification link → Supabase establishes session; cookie stored in browser
  → middleware.ts reads session → allows access to /dashboard
  → /dashboard renders empty state: "No contracts reviewed yet — upload your first contract to begin"
  → "Review a Contract" CTA links to /upload
```

**Error handling:**
- Duplicate email → "An account with this email already exists. Sign in instead."
- Password < 8 chars → inline client-side validation before API call
- Network error → "Something went wrong. Please try again."

### Flow 2 — Returning User Sign In → Dashboard

```
User visits /auth/login
  → Frontend renders sign-in form (email + password)
  → User submits → supabase.auth.signInWithPassword({ email, password })
    → Supabase Auth validates credentials; returns session
  → Session stored in browser cookie (Supabase managed)
  → middleware.ts reads session → allows /dashboard
  → /dashboard page.tsx (Server Component):
      SELECT id, file_name, contract_type, status, page_count, created_at
      FROM contracts WHERE user_id = auth.uid() ORDER BY created_at DESC
  → StatCard renders: total count, NDA count, MSA count
  → ContractTable renders: sortable list of all contracts
  → Clicking any row → router.push('/contracts/{id}')
```

**Error handling:**
- Invalid credentials → "Invalid email or password." (inline, below password field)
- Email not confirmed → "Please verify your email before signing in."
- Session expires mid-session → middleware intercepts next protected fetch → redirect to `/auth/login?next={currentPath}`

### Flow 3 — Core Contract Review Flow

```
User clicks "Review a Contract" → navigates to /upload
```

**Step 1 — Configure:**
```
User selects contract type from ContractTypeSelector (NDA / MSA)
User drops/picks PDF file in DropZone
Client-side validation:
  - file.name.toLowerCase().endsWith('.pdf') → error if not
  - file.size <= 10,485,760 bytes → error if larger
  → If validation fails: inline error shown; no network request made
```

**Step 2 — Upload:**
```
→ POST /api/contracts/upload (multipart/form-data: file + contract_type)
  Backend:
    1. requireAuth() → 401 if no session (getUser() validates JWT with Supabase server)
    2. validateFile(file) → rejects non-PDF, > 10 MB
    3. uploadBodySchema.safeParse({ contract_type }) → rejects invalid type
    4. Buffer.from(await file.arrayBuffer())
    5. extractPDFText(buffer):
       - pdf-parse with per-page render callback
       - page texts joined with [PAGE N] markers
       - pageCount > 20 → throws TOO_MANY_PAGES
       - wordCount < 100 → throws SCANNED_PDF
       - tokenCount > 15,000 → throws CONTRACT_TOO_LONG
    6. INSERT INTO contracts { user_id, file_name, contract_type, contract_text,
                               page_count, token_count, status: 'pending' }
    7. Non-blocking: uploadToStorage(buffer, fileName, userId, contractId)
       .then(filePath => UPDATE contracts SET file_path WHERE id = contractId)
       .catch(() => { /* silent — text viewer fallback handles null file_path */ })
    8. Return 201: { contract_id, status: 'pending', page_count, token_count }
  Frontend: receives contract_id → setProcessingStep(1)
```

**Step 3 — Custom Terms (optional):**
```
TermPreviewList renders standard terms for selected type (read-only)
CustomTermInput allows adding up to 5 custom terms:
  → POST /api/contracts/custom-terms { contract_id, term_name }
    → INSERT INTO custom_key_terms
  → term added to preview list with "Custom" badge
"Analyse Contract" button enabled
```

**Step 4 — AI Extraction:**
```
User clicks "Analyse Contract" → setStep('processing') → ProcessingProgress stepper (step 2)
→ POST /api/contracts/process { contract_id, custom_terms: [...] }
  Backend:
    1. requireAuth() → 401
    2. processSchema.safeParse(body) → validates UUID, custom_terms array ≤ 5
    3. checkRateLimit(user.id, 'contracts/process') → 429 if exceeded
    4. SELECT contract_text, contract_type FROM contracts
       WHERE id = contract_id AND user_id = user.id → 404 if not found
    5. SELECT term_name FROM custom_key_terms WHERE contract_id = contract_id
    6. Deduplicate: [...dbCustomTerms, ...requestCustomTerms]
    7. UPDATE contracts SET status = 'processing'
    8. runExtraction({ contractText, contractType, customTerms }):
       - Build system prompt (nda-extraction.ts or msa-extraction.ts)
       - Build user message: contract text + standard term list + custom terms
       - Call OpenAI GPT-4o (temp 0.1, max 2000 tokens, json_object mode)
       - Parse JSON → Zod validate
       - Retry up to 3 times on JSON parse failure with corrective prompt
       - Throw AI_ERROR after 3 failures
    9. INSERT INTO key_terms (batch; is_manual = true for custom terms)
    10. UPDATE contracts SET status = 'completed'
    11. Return 200: { key_terms: [...] }
  Frontend: router.push('/contracts/{contractId}')
```

**Step 5 — Results Page:**
```
/contracts/[id]/page.tsx (Server Component):
  → SELECT contract metadata + contract_text + file_path FROM contracts
  → UPDATE contracts SET last_accessed_at = now() (non-blocking)
  → createSignedUrl(file_path, 3600) if file_path not null
  → SELECT key_terms ORDER BY created_at ASC
  → SELECT id FROM chat_sessions WHERE contract_id = id
  → SELECT rating FROM user_feedback WHERE contract_id = id
  → Passes all data as props to ResultsClient (Client Component)
ResultsClient:
  → Two-panel layout: PDF viewer (60%) / Key terms panel (40%)
  → targetPage state shared between panel and viewers
  → PDFViewer OR TextViewerFallback (based on signed_url null check)
  → KeyTermCard × N (name, value, page link, ConfidenceBar, ⚠️ if < 50%, "Why?" expandable)
  → FeedbackWidget at panel bottom
  → "Not legal advice" disclaimer always visible
  → Floating "Chat" tab
```

### Flow 4 — Contract Chat (Q&A)

```
User clicks "Chat" tab on results page
  → ChatInterface mounts
  → If no initialSessionId:
      POST /api/chat/sessions { contract_id }
        → INSERT INTO chat_sessions ON CONFLICT (contract_id) DO NOTHING
        → SELECT id FROM chat_sessions WHERE contract_id = ... AND user_id = ...
      → setSessionId(session_id)
  → GET /api/chat/{sessionId}/messages
    → SELECT role, content, created_at FROM chat_messages ORDER BY created_at ASC
  → Messages array loaded (empty array on first visit)
  → Empty state shown: "Ask anything about this contract." + 3 suggested questions

User types question and presses Enter or clicks Send:
  → Message appended optimistically to UI (right-aligned, blue bubble)
  → inputValue cleared; isLoading = true
  → POST /api/chat/message { contract_id, session_id, content: "..." }
    Backend:
      1. requireAuth() → 401
      2. chatMessageSchema.safeParse(body) → validates UUID, non-empty string ≤ 4000 chars
      3. checkRateLimit(user.id, 'chat/message') → 429 if exceeded
      4. sanitizeForLLM(content): strips ###, <|, |>, [INST], <<SYS>> patterns
         → 400 INJECTION_DETECTED if empty after sanitise
      5. Parallel: fetch contract.contract_text + verify chatSession ownership
         → 403 if either not found or not owned
      6. SELECT role, content FROM chat_messages
         WHERE session_id = ... ORDER BY created_at ASC LIMIT 200
      7. classifyQuery(sanitised) → 'contract' | 'history' | 'both'
      8. buildChatMessages({ contractText, history, newUserMessage }):
         [system] → getChatSystemPrompt(contractText)
         [...history] → previous messages
         [user] → new user message
      9. callChat(messages): OpenAI GPT-4o, temp 0.4, max 1000 tokens
      10. INSERT user message → INSERT assistant response
      11. Return 200: { message_id, content, created_at, query_type }
  → AI response appended to UI (left-aligned, white bubble)
  → [Page X] citations rendered as clickable buttons → setTargetPage(X) → viewer scrolls
  → "I cannot find this in the document." renders in italic grey-400; no page citation expected

On revisit:
  → GET /api/chat/{sessionId}/messages returns full history
  → ChatInterface rehydrates all messages in order
```

### Flow 5 — Inline Key Term Editing

```
User sees term "Laws of the State of New York" in KeyTermCard
  → User clicks the value text
  → isEditing = true; input pre-filled with current value; autoFocus
  → User changes to "New York State" → presses Enter
  → handleSave():
      if editValue.trim() === term.value → handleCancel() (no API call)
      setIsSaving(true)
      PATCH /api/key-terms/{term.id} { value: "New York State" }
        Backend:
          1. requireAuth()
          2. keyTermPatchSchema.safeParse({ value }) → non-empty, ≤ 1000 chars
          3. SELECT id, value, ai_value, is_edited, user_id FROM key_terms WHERE id = :id
             → 404 if not found; 403 if user_id ≠ auth.uid()
          4. if !is_edited: SET ai_value = current value (preserve original)
          5. UPDATE SET value = 'New York State', is_edited = true
          6. Return 200: { id, value, ai_value, is_edited: true }
      Frontend: onUpdate(id, 'New York State') → optimistic update in parent
      isEditing = false; "Edited" badge appears
      Hovering "Edited" badge shows tooltip: "Original: Laws of the State of New York"
  → Press Escape: handleCancel() → isEditing = false; editValue restored; no API call
```

### Flow 6 — Dashboard History

```
User navigates to /dashboard
  → Server Component:
      SELECT id, file_name, contract_type, status, page_count, created_at
      FROM contracts WHERE user_id = auth.uid() ORDER BY created_at DESC
  → Derived: total, ndaCount, msaCount
  → StatCard × 3: Total / NDAs / MSAs
  → ContractTable: sortable by file_name, contract_type, created_at, status
    Default sort: created_at DESC (newest first)
    Click column header → toggle sort direction
  → Click row → router.push('/contracts/{id}')
  → Empty state (0 contracts): illustration + "No contracts reviewed yet" + "Review a Contract" CTA
```

### Flow 7 — Feedback Submission

```
FeedbackWidget renders at bottom of KeyTermsPanel
  → If existingFeedback from server fetch: shows "Feedback received" immediately
  → Otherwise: thumbs up / thumbs down buttons

User clicks 👍
  → selectedRating = 'thumbs_up'; button fills blue-500
  → Textarea appears for optional comment
  → "Submit Feedback" button appears

User clicks "Submit Feedback"
  → POST /api/feedback { contract_id, rating: 'thumbs_up', comment: 'Great tool!' }
    Backend:
      1. requireAuth()
      2. feedbackSchema.safeParse → validates rating enum, comment ≤ 2000 chars
      3. SELECT id FROM contracts WHERE id = contract_id AND user_id = user.id
         → 403 if not found
      4. SELECT id FROM user_feedback WHERE contract_id = ... AND user_id = ...
         → 409 if already submitted
      5. INSERT INTO user_feedback
      6. Return 201: { feedback_id }
  → Widget replaced with: "Thanks for your feedback!"
```

---

## 5. Frontend Architecture

### Stack

| Technology | Version | Purpose |
|---|---|---|
| Next.js | 14.2.5 | App Router, Server Components, API Routes |
| React | 18.3.1 | Client Components, UI rendering |
| Tailwind CSS | 3.4.4 | Utility-first styling |
| Lucide React | 0.400.0 | Icon library (AlertTriangle, ThumbsUp, FileText, etc.) |
| PDF.js (pdfjs-dist) | 4.3.136 | Client-side PDF rendering |
| @supabase/supabase-js | 2.44.3 | Supabase DB + Auth + Storage client |
| @supabase/auth-helpers-nextjs | 0.10.0 | Middleware client, route/server component clients |
| Zod | 3.23.8 | Runtime schema validation (shared with backend) |

### Design System

Color tokens (from `docs/design.md`):

| Role | Hex | Usage |
|---|---|---|
| Brand / Interactive | `#115ACB` | Buttons, links, focus rings |
| Primary text | `#070A0E` | Body text, headings |
| Secondary text | `#4A4C4F` | Labels, captions |
| Page background | `#FAFAFA` | Root background |
| Card background | `#FFFFFF` | Cards, panels |
| Subtle divider | `#F0F0F1` | Borders, separators |
| Confidence ≥ 80% | `#13A10E` | Green confidence bar |
| Confidence 50–79% | `#FFAA33` | Amber confidence bar |
| Confidence < 50% | `#D13438` | Red confidence bar + ⚠️ |

**Typography:** Inter Display (all UI text); JetBrains Mono (contract text in TextViewerFallback).

**Spacing:** 4px base unit. Page padding: 96px vertical / 112px horizontal. Section gap: 40px.

### Routing Architecture

| Route | Type | Auth | Component |
|---|---|---|---|
| `/` | Server | No | Landing page (static) |
| `/auth/login` | Client | Redirect to /dashboard if authed | LoginPage |
| `/auth/signup` | Client | Redirect to /dashboard if authed | SignupPage |
| `/dashboard` | Server | Required | DashboardPage |
| `/upload` | Client | Required | UploadPage |
| `/contracts/[id]` | Server + Client | Required | ResultsPage (Server) + ResultsClient (Client) |

**Route protection:** `middleware.ts` uses `createMiddlewareClient({ req, res })` and `supabase.auth.getSession()`. Protected prefixes: `/dashboard`, `/upload`, `/contracts`. Unauthenticated users redirect to `/auth/login?next={pathname}`. Authenticated users visiting `/auth/*` redirect to `/dashboard`.

**Server+Client split for `/contracts/[id]`:** `page.tsx` is a Server Component that fetches all data (contract, keyTerms, chatSession, signedUrl, existingFeedback) and passes them as props to `ResultsClient.tsx`. `ResultsClient` owns all interactive state (`targetPage`, `isChatOpen`, key term mutations).

### State Management

No global state manager at MVP. All state management is local:

| State Type | Where | How |
|---|---|---|
| Auth session | Global | Supabase cookie (managed by @supabase/auth-helpers-nextjs) |
| Upload flow | UploadPage | Local `useState`: step, contractType, file, customTerms, processingStep |
| Results viewer | ResultsClient | Local `useState`: targetPage, isChatOpen |
| Key terms (editable) | KeyTermsPanel | Local `useState`: keyTerms array (initialised from server-fetched props) |
| Chat messages | ChatInterface | Local `useState`: messages[], sessionId, isLoading |
| Dashboard sort | ContractTable | Local `useState`: sortKey, sortDir |

### UX States

| State | Location | Implementation |
|---|---|---|
| Loading skeleton | Dashboard list, key terms panel | `Skeleton.tsx`: shimmer via `animate-pulse` |
| Empty state | Dashboard (no contracts) | `EmptyState.tsx`: icon + heading + CTA |
| Processing stepper | Upload after "Analyse Contract" | `ProcessingProgress.tsx`: 3-step indicator with Spinner on active step |
| Error banner | Upload failure, AI timeout | `Banner.tsx`: full-width, variant="error", dismissible, optional retry action |
| Low-confidence warning | Key terms panel per card | `Tooltip.tsx` with `dismissible=false` wrapping AlertTriangle icon |
| Storage unavailable | Results page | `TextViewerFallback.tsx` renders silently; no error shown |
| Contract processing | Results page | Polling GET /api/contracts/[id] every 3 seconds until status = 'completed' |
| Contract error | Results page | Error banner with "Reprocess" button |
| Responsive (mobile) | Results page | Stacked layout: viewer top, key terms panel below |
| WCAG 2.1 AA | All interactive elements | 2px solid #115ACB focus ring; `aria-live` on chat + processing stepper |

### Page and Component Hierarchy

```
app/layout.tsx                          ← Root: <html>, <body>, globals.css
├── app/page.tsx                        ← Landing page (Server)
├── app/auth/
│   ├── login/page.tsx                  ← LoginPage ('use client')
│   └── signup/page.tsx                 ← SignupPage ('use client')
└── app/(protected)/
    ├── layout.tsx                      ← Protected layout wrapper
    ├── dashboard/page.tsx              ← DashboardPage (Server Component)
    │   ├── StatCard.tsx                ← Stat display card
    │   ├── ContractTable.tsx           ← Sortable list ('use client')
    │   └── EmptyState.tsx              ← Empty state illustration
    ├── upload/page.tsx                 ← UploadPage ('use client')
    │   ├── ContractTypeSelector.tsx    ← NDA/MSA dropdown
    │   ├── DropZone.tsx                ← Drag-and-drop file picker ('use client')
    │   ├── TermPreviewList.tsx         ← Standard + custom terms preview
    │   ├── CustomTermInput.tsx         ← Add custom term input + counter
    │   └── ProcessingProgress.tsx      ← 3-step processing stepper
    └── contracts/[id]/page.tsx         ← ResultsPage (Server Component)
        └── ResultsClient.tsx           ← ('use client') owns targetPage state
            ├── PDFViewer.tsx           ← PDF.js-based viewer ('use client')
            ├── TextViewerFallback.tsx  ← [PAGE N] marker parser ('use client')
            ├── KeyTermsPanel.tsx       ← Right panel, scrollable
            │   ├── KeyTermCard.tsx     ← Individual term card ('use client')
            │   │   ├── ConfidenceBar.tsx  ← Coloured progress bar
            │   │   └── SourceSentence.tsx ← Expandable "Why?" section
            │   └── FeedbackWidget.tsx  ← Thumbs up/down ('use client')
            └── ChatInterface.tsx       ← Chat tab ('use client')
                └── MessageBubble.tsx   ← Individual message (user/assistant)

components/layout/
└── Nav.tsx                             ← Sticky nav: logo + auth CTA ('use client')

components/ui/                          ← Reusable design-system primitives
├── Button.tsx
├── Badge.tsx
├── Tooltip.tsx
├── Input.tsx
├── Textarea.tsx
├── Modal.tsx
├── Spinner.tsx
├── Banner.tsx
└── Skeleton.tsx
```

### Accessibility Requirements (WCAG 2.1 AA)

- All buttons and links: keyboard navigable, visible focus ring (2px solid #115ACB)
- Confidence colour coding supplemented by ⚠️ icon — not colour alone
- `ConfidenceBar`: `role="meter"` `aria-valuenow` `aria-valuemin` `aria-valuemax` `aria-label`
- Chat messages container: `aria-live="polite"` so screen readers announce new messages
- Processing stepper: `aria-live="polite"` to announce step changes
- Modal: `role="dialog"` `aria-modal="true"` `aria-labelledby`; focus trapped; Escape closes
- Legal jargon: tooltipped inline (hover/focus reveals plain-English explanation)
- All images: descriptive `alt` text; decorative images: `alt=""`

---

## 6. Backend Architecture

### Stack

| Component | Technology | Notes |
|---|---|---|
| Runtime | Node.js | Via Next.js API Routes (`export const runtime = 'nodejs'`) |
| API Framework | Next.js 14 App Router API routes | Files at `app/api/**/route.ts` |
| Auth guard | `lib/security/authGuard.ts` → `requireAuth()` | Uses `supabase.auth.getUser()` (JWT validation — more secure than `getSession()`) |
| DB client (routes) | `createRouteHandlerClient` | Respects RLS; reads session from cookie |
| DB client (server components) | `createServerComponentClient` | Same cookie-based session |
| DB client (admin operations) | `createClient` with `SUPABASE_SERVICE_ROLE_KEY` | Bypasses RLS for storage uploads and rate limit writes |
| PDF parsing | `pdf-parse` + `lib/pdf/extractor.ts` | Server-only; configured in next.config.mjs as external package |
| AI client | `openai` npm package | `lib/ai/extraction.ts`, `lib/ai/chat.ts` |
| Validation | `zod` | All API routes validate request body before processing |
| Rate limiting | Sliding window via `rate_limit_events` table | `lib/security/rateLimiter.ts` |
| Injection guard | `lib/security/promptInjectionGuard.ts` | Strips `###`, `<|`, `|>`, `[INST]`, `<<SYS>>` |

### Core Systems

**Authentication / Authorisation:**
- Supabase Auth manages all user identity (`auth.users` table)
- `requireAuth()` calls `supabase.auth.getUser()` on every protected route — validates JWT against Supabase Auth server
- All DB tables enforce `auth.uid() = user_id` via RLS policies
- Storage bucket enforces `auth.uid()::text = (storage.foldername(name))[1]`

**Business Logic:**
- PDF validation: `lib/pdf/extractor.ts` — validates page count, word count (scanned PDF detection), token count
- Extraction orchestration: `lib/ai/extraction.ts` — builds prompt, calls OpenAI, retries on JSON parse failure (up to 3 attempts), validates output schema with Zod
- Chat orchestration: `lib/ai/chat.ts` — builds full message array (system + contractText + history + new message), calls OpenAI
- Query classification: `lib/ai/classifier.ts` — keyword/pattern match (no extra API call)

**Validation:** Every API route has a corresponding Zod schema in `lib/validation/`. Validation failures return 400 with the first Zod error message.

**Error Handling:** All routes use a local `err(status, code, message)` helper returning `{ data: null, error: { code, message } }`. OpenAI failures: up to 3 retries for extraction; `contracts.status` set to `'error'` on final failure. Storage failures: non-fatal; caught and logged; `file_path` remains null. DB failures: return 500 INTERNAL_ERROR.

### Service Interaction Diagram

```
Browser (Next.js Client Components)
    │
    ├── supabase.auth.*  ────────────────────────────►  Supabase Auth Service
    │   (createBrowserClient - anon key)                  (validates tokens)
    │
    ├── supabase.from().*  ──────────────────────────►  Supabase PostgreSQL
    │   (anon key, RLS enforced)                           (RLS: read own data)
    │
    └── fetch('/api/...')  ──────────────────────────►  Next.js API Routes
                                                          (Node.js serverless)
                                                               │
                           ┌───────────────────────────────────┤
                           │                                   │
                  lib/pdf/extractor.ts               lib/ai/extraction.ts
                  (pdf-parse, Node.js)               lib/ai/chat.ts
                           │                         (openai npm package)
                           │                                   │
                           └───────────────────────────────────►  OpenAI API
                                                                   (GPT-4o)
                           │
                  lib/supabase/server.ts
                  createRouteClient()  ────────────►  Supabase PostgreSQL
                  (RLS-enforced writes)               (INSERT/UPDATE via RLS)
                           │
                  createAdminClient() ────────────►   Supabase Storage
                  (service role key)                  (PDF upload, signed URLs)
                           │
                  createAdminClient() ────────────►   rate_limit_events table
                  (bypasses RLS for rate limit writes)
```

### Long-running Route Configuration

The chat and process routes set `export const maxDuration = 60` to support up to 60-second OpenAI calls on Netlify (avoids function timeout before the LLM responds). Both routes also set `export const runtime = 'nodejs'` explicitly.

---

## 7. Database Design and Schema

### Architecture Notes

- Single Supabase project; all application tables in the `public` schema
- Supabase Auth manages `auth.users` — never modified directly; referenced via FK
- RLS enabled on all 7 tables
- All UUIDs: `gen_random_uuid()` (from pgcrypto extension)
- All timestamps: `timestamptz` with `DEFAULT now()`
- Complete runnable SQL: `docs/specs/supabase-schema.sql`

### Entity-Relationship Diagram

```
auth.users (managed by Supabase Auth)
    │  (user_id FK — all tables reference this)
    │
    ├──< contracts
    │   id (PK)
    │   user_id → auth.users
    │   file_name, contract_type, contract_text, file_path
    │   page_count, token_count, status, created_at, last_accessed_at
    │       │
    │       ├──< key_terms
    │       │   id, contract_id, user_id
    │       │   term_name, value, ai_value (nullable)
    │       │   page_number, confidence_score, source_sentence
    │       │   is_manual, is_edited, created_at
    │       │
    │       ├──< custom_key_terms
    │       │   id, contract_id, user_id, term_name, created_at
    │       │
    │       ├──< user_feedback
    │       │   id, contract_id, user_id, rating, comment, created_at
    │       │
    │       └──< chat_sessions  (UNIQUE on contract_id)
    │           id, contract_id, user_id, created_at
    │               │
    │               └──< chat_messages
    │                   id, session_id, user_id, role, content, created_at
    │
    └──< rate_limit_events
        id, user_id, endpoint, created_at
```

### Table: `contracts`

**Purpose:** Stores uploaded contract metadata, extracted text (single source of truth for all AI pipelines), and processing status.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, `DEFAULT gen_random_uuid()` | |
| `user_id` | `uuid` | NOT NULL, FK → `auth.users(id)` ON DELETE CASCADE | |
| `file_name` | `text` | NOT NULL | Original filename (e.g. `acme-nda.pdf`) |
| `contract_type` | `text` | NOT NULL, CHECK IN (`'nda'`, `'msa'`) | Validated at API layer before insert |
| `contract_text` | `text` | NOT NULL | Full text with `[PAGE N]` markers; extracted once; reused by all AI pipelines |
| `file_path` | `text` | NULLABLE | `{user_id}/{contract_id}/{filename}.pdf`; null if Storage upload failed |
| `page_count` | `integer` | NOT NULL | Set by pdf-parse at upload time |
| `token_count` | `integer` | NOT NULL | Approximate: `Math.ceil(text.length / 4)` |
| `status` | `text` | NOT NULL, CHECK IN (`'pending'`,`'processing'`,`'completed'`,`'error'`), DEFAULT `'pending'` | |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | |
| `last_accessed_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | Updated on each visit; drives 90-day PDF retention |

**Indexes:**
```sql
CREATE INDEX idx_contracts_user_id ON public.contracts (user_id);
CREATE INDEX idx_contracts_user_id_created_at ON public.contracts (user_id, created_at DESC);
```

**RLS Policies:** SELECT, INSERT, UPDATE, DELETE — all require `auth.uid() = user_id`.

---

### Table: `key_terms`

**Purpose:** One row per extracted key term per contract. Standard terms extracted by AI; custom terms land here with `is_manual = true`.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, `DEFAULT gen_random_uuid()` | |
| `contract_id` | `uuid` | NOT NULL, FK → `contracts(id)` ON DELETE CASCADE | |
| `user_id` | `uuid` | NOT NULL, FK → `auth.users(id)` ON DELETE CASCADE | Denormalised for RLS — avoids join on every read |
| `term_name` | `text` | NOT NULL | e.g. `"Governing Law"`, `"Liability Cap"` |
| `value` | `text` | NOT NULL | Current value (may be user-edited); displayed in UI |
| `ai_value` | `text` | NULLABLE | Original AI-extracted value; set on first user edit; preserved for feedback loop |
| `page_number` | `integer` | NOT NULL | 1-indexed; 0 if term not found in document |
| `confidence_score` | `numeric(5,2)` | NOT NULL, CHECK BETWEEN 0 AND 100 | Self-reported by GPT-4o; e.g. `87.50` |
| `source_sentence` | `text` | NOT NULL | Verbatim sentence used to extract value; shown in "Why?" section |
| `is_manual` | `boolean` | NOT NULL, DEFAULT `false` | `true` for user-defined custom terms |
| `is_edited` | `boolean` | NOT NULL, DEFAULT `false` | `true` after user edits the value inline |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | |

**Indexes:**
```sql
CREATE INDEX idx_key_terms_contract_id ON public.key_terms (contract_id);
CREATE INDEX idx_key_terms_user_id ON public.key_terms (user_id);
```

**RLS Policies:** SELECT, INSERT, UPDATE, DELETE — all require `auth.uid() = user_id`.

---

### Table: `custom_key_terms`

**Purpose:** Stores user-defined key terms added before processing. Consumed by the extraction pipeline → results in `key_terms` rows with `is_manual = true`.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, `DEFAULT gen_random_uuid()` | |
| `contract_id` | `uuid` | NOT NULL, FK → `contracts(id)` ON DELETE CASCADE | |
| `user_id` | `uuid` | NOT NULL, FK → `auth.users(id)` ON DELETE CASCADE | |
| `term_name` | `text` | NOT NULL | User-provided term name (e.g. `"Non-compete radius"`) |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | |

**Constraint note:** Max 5 per contract enforced at API level. API counts existing rows before INSERT; returns 400 TOO_MANY_CUSTOM_TERMS if at limit.

**Index:**
```sql
CREATE INDEX idx_custom_key_terms_contract_id ON public.custom_key_terms (contract_id);
```

**RLS Policies:** SELECT, INSERT, UPDATE, DELETE — all require `auth.uid() = user_id`.

---

### Table: `chat_sessions`

**Purpose:** Groups chat messages per contract. One session per contract enforced by UNIQUE constraint.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, `DEFAULT gen_random_uuid()` | |
| `contract_id` | `uuid` | NOT NULL, FK → `contracts(id)` ON DELETE CASCADE, **UNIQUE** | One session per contract |
| `user_id` | `uuid` | NOT NULL, FK → `auth.users(id)` ON DELETE CASCADE | |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | |

**Index:**
```sql
CREATE INDEX idx_chat_sessions_contract_id ON public.chat_sessions (contract_id);
```

**RLS Policies:** SELECT, INSERT — `auth.uid() = user_id`. (No UPDATE/DELETE at MVP.)

---

### Table: `chat_messages`

**Purpose:** Stores every message in a chat session (both user questions and assistant responses).

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, `DEFAULT gen_random_uuid()` | |
| `session_id` | `uuid` | NOT NULL, FK → `chat_sessions(id)` ON DELETE CASCADE | |
| `user_id` | `uuid` | NOT NULL, FK → `auth.users(id)` ON DELETE CASCADE | |
| `role` | `text` | NOT NULL, CHECK IN (`'user'`, `'assistant'`) | |
| `content` | `text` | NOT NULL | Full message content |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | Used for ASC ordering in history fetch |

**Index:**
```sql
CREATE INDEX idx_chat_messages_session_id_created_at
  ON public.chat_messages (session_id, created_at ASC);
```

The ASC index matches the query: `ORDER BY created_at ASC LIMIT 200`.

**RLS Policies:** SELECT, INSERT — `auth.uid() = user_id`.

---

### Table: `user_feedback`

**Purpose:** Post-review feedback from users — one feedback record per contract per user.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, `DEFAULT gen_random_uuid()` | |
| `contract_id` | `uuid` | NOT NULL, FK → `contracts(id)` ON DELETE CASCADE | |
| `user_id` | `uuid` | NOT NULL, FK → `auth.users(id)` ON DELETE CASCADE | |
| `rating` | `text` | NOT NULL, CHECK IN (`'thumbs_up'`, `'thumbs_down'`) | |
| `comment` | `text` | NULLABLE | Optional free-text; max 2000 chars enforced at API layer |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | |

**One-feedback-per-contract enforcement:** API checks for existing record before INSERT; returns 409 ALREADY_SUBMITTED if found.

**RLS Policies:** SELECT, INSERT — `auth.uid() = user_id`.

---

### Table: `rate_limit_events`

**Purpose:** Sliding-window rate limit log. One row per API call per user per endpoint. Rows older than 2 hours pruned by the API on each check (fire-and-forget DELETE).

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, `DEFAULT gen_random_uuid()` | |
| `user_id` | `uuid` | NOT NULL, FK → `auth.users(id)` ON DELETE CASCADE | |
| `endpoint` | `text` | NOT NULL | `'contracts/process'` or `'chat/message'` |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | |

**Rate limits (from `lib/constants.ts`):**
- `contracts/process`: 20 per user per hour
- `chat/message`: 60 per user per hour

**Index:**
```sql
CREATE INDEX idx_rate_limit_events_user_endpoint_created
  ON public.rate_limit_events (user_id, endpoint, created_at DESC);
```

**Important:** `checkRateLimit()` uses `createAdminClient()` (service role) — bypasses RLS so the rate limit is tamper-proof even if a user deletes their own rows through the client SDK.

**RLS Policies:** SELECT, INSERT — `auth.uid() = user_id`. (Admin client bypasses these for writes.)

---

### Supabase Storage Configuration

**Bucket:** `contracts` (private; access via signed URLs only)

Created via SQL (must be in `docs/specs/supabase-schema.sql`):
```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('contracts', 'contracts', false, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;
```

**File path pattern:** `{user_id}/{contract_id}/{filename}.pdf`

**Signed URL expiry:** 3600 seconds (1 hour). Generated server-side using `createAdminClient().storage.from('contracts').createSignedUrl(file_path, 3600)`.

**Storage RLS Policies (3 — on `storage.objects`):**
```sql
-- INSERT: user can only upload to their own folder
auth.uid()::text = (storage.foldername(name))[1] AND bucket_id = 'contracts'

-- SELECT: user can only read their own files
auth.uid()::text = (storage.foldername(name))[1] AND bucket_id = 'contracts'

-- DELETE: user can only delete their own files
auth.uid()::text = (storage.foldername(name))[1] AND bucket_id = 'contracts'
```

`(storage.foldername(name))[1]` extracts the first path segment (the `user_id`).

**Data retention:** PDFs auto-deleted 90 days after `last_accessed_at`. Users can manually delete a contract from the dashboard — triggers ON DELETE CASCADE on all related tables and a Storage object deletion.

---

## 8. AI Architecture

### LLM Provider

| Attribute | Value |
|---|---|
| Provider | OpenAI |
| Model | `gpt-4o` |
| Context window | 128,000 tokens |
| Extraction mode | `response_format: { type: "json_object" }` |
| Chat mode | Standard text (no JSON mode) |
| API key | `OPENAI_API_KEY` (server-only env var; never exposed to client) |

### Key Term Extraction

**Technique:** Few-shot prompting. 3 labelled NDA examples and 3 labelled MSA examples embedded verbatim in the system prompt (`lib/ai/prompts/nda-extraction.ts` and `lib/ai/prompts/msa-extraction.ts`).

**Parameters:**

| Parameter | Value | Rationale |
|---|---|---|
| `temperature` | `0.1` | Low = deterministic, structured output; minimises fabrication |
| `max_tokens` | `2000` | Bounds output cost; enough for 10–17 terms with all fields |
| `response_format` | `{ type: "json_object" }` | Eliminates free-text wrapping around JSON |

**Input structure sent to OpenAI:**
```
[system]:
  NDA/MSA-specific few-shot examples + schema definition
  (3 examples each: contract excerpt → request → exact JSON response)

[user]:
  CONTRACT TEXT:
  [PAGE 1]
  This Agreement is entered into...
  [PAGE 2]
  ...

  Extract the following standard terms: Parties, Effective Date, ...

  Also extract the following additional terms: Non-compete radius, Arbitration clause
  (appended only if custom_terms.length > 0)

  Return a JSON object with a "terms" array. Each term must include:
  term_name, value, page_number, confidence_score (0–100), source_sentence.
```

**Output schema (validated by Zod in `lib/ai/extraction.ts`):**
```json
{
  "terms": [
    {
      "term_name": "Governing Law",
      "value": "Laws of the State of New York",
      "page_number": 4,
      "confidence_score": 92.5,
      "source_sentence": "This Agreement shall be governed by the laws of the State of New York."
    }
  ]
}
```

**Not-found term convention:** When a term is absent from the document:
```json
{ "term_name": "IP Ownership", "value": "Not found", "page_number": 0, "confidence_score": 0, "source_sentence": "" }
```

**Standard term lists:**

| Contract Type | Standard Terms |
|---|---|
| NDA (10 terms) | Parties, Effective Date, Confidentiality Obligations, Permitted Disclosures, Term & Duration, Governing Law, Jurisdiction, IP Ownership, Non-Solicitation, Breach & Remedy |
| MSA (12 terms) | Parties, Service Scope, Payment Terms, Invoice Schedule, Late Payment Penalty, Liability Cap, Indemnification, IP Ownership, Termination Clause, Governing Law, Dispute Resolution, Notice Period |

**JSON parse retry logic (in `lib/ai/extraction.ts`):**
```
Attempt 1: Standard extraction call
  → Success: Zod validate → return terms
  → JSON parse failure:

Attempt 2: Add corrective message:
  "Your previous response was not valid JSON.
   Return only a JSON object with a 'terms' array, no explanation."
  → Success: Zod validate → return terms
  → Failure:

Attempt 3: Same corrective message
  → Success: Zod validate → return terms
  → Failure:

After 3 failures:
  throw Error with code: 'AI_ERROR'
  → Route: UPDATE contracts SET status = 'error'
  → Return 500 AI_ERROR to client
  → Client shows error banner: "AI processing failed. Please try again."
    with "Reprocess" button (user can retry without re-uploading)
```

### Contract Chat

**Technique:** Full-context (no chunking at MVP). The entire `contract_text` (≤15,000 tokens) is passed in the system prompt on every turn.

**Parameters:**

| Parameter | Value | Rationale |
|---|---|---|
| `temperature` | `0.4` | Slight warmth for natural conversational tone |
| `max_tokens` | `1000` | Concise answers; Q&A doesn't need long outputs |

**System prompt (from `lib/ai/prompts/chat-system.ts`):**
```
You are a contract analysis assistant. Your role is to answer questions strictly based
on the document text provided below. You must not use any external legal knowledge or
make assumptions beyond what is explicitly stated in the document.

RULES:
1. Answer ONLY from the document text below. Do not draw on general legal knowledge.
2. If the answer is not in the document, respond with exactly:
   "I cannot find this in the document."
3. Every response MUST end with a source citation in the format: [Page X]
4. Begin every response with: "Based on the document, ..."
5. If multiple pages are relevant, cite the most specific one: [Page X]
6. Keep responses concise and in plain English — avoid legal jargon where possible.

CONTRACT DOCUMENT:
{contractText}
```

**Message array structure:**
```
[{ role: 'system', content: systemPrompt_with_contractText }]
[{ role: 'user', content: first_user_message }]
[{ role: 'assistant', content: first_ai_response }]
...
[{ role: 'user', content: new_user_message }]
```

Up to 200 messages from DB history, fetched ascending and passed on every turn.

**Query classification (`lib/ai/classifier.ts`):**
Inline keyword/pattern match — no extra OpenAI call:
- `history`: matches patterns like "what did you say earlier", "you mentioned", "in your last response"
- `contract` (default): everything else
- `both`: history pattern matches AND contains contract keywords (contract, clause, term, section, page)

At MVP, classification is included in the response for analytics. Full context + history is always passed regardless of classification.

### Confidence Scoring

- Self-reported by GPT-4o as part of the extraction JSON — no separate inference call
- Scale: 0.0–100.0 (stored as `numeric(5,2)` in `key_terms.confidence_score`)
- UI colour thresholds (defined in `lib/constants.ts`):
  - `CONFIDENCE_THRESHOLD_HIGH = 80` → Green (`#13A10E`)
  - `CONFIDENCE_THRESHOLD_LOW = 50` → Amber below 80, Red below 50 (`#FFAA33` / `#D13438`)
- Low-confidence (< 50%): ⚠️ icon (AlertTriangle), non-dismissible tooltip, PDF viewer auto-highlights nearest matching page span

### Cost Controls

| Control | Value | Enforced In |
|---|---|---|
| Max contract size | 15,000 tokens | `lib/pdf/extractor.ts` — throws CONTRACT_TOO_LONG |
| Max custom terms | 5 per analysis | `lib/validation/process.schema.ts` + custom-terms route |
| Extraction output cap | 2,000 tokens | `OPENAI_EXTRACTION_MAX_TOKENS = 2000` in constants |
| Chat output cap | 1,000 tokens | `OPENAI_CHAT_MAX_TOKENS = 1000` in constants |
| Rate limit (extraction) | 20 calls/user/hour | `lib/security/rateLimiter.ts` via rate_limit_events table |
| Rate limit (chat) | 60 messages/user/hour | Same rate limiter |

**Cost estimate for a 20-page (15,000 token) contract:**
- Extraction input: ~15,000 tokens × $0.005/1k = $0.075
- Extraction output: ~1,500 tokens × $0.015/1k = $0.023
- Total extraction: ~$0.098 (well within $0.20 per-analysis target)

### Hallucination Guardrails

| Layer | Guardrail |
|---|---|
| Extraction — model config | Temperature 0.1 + JSON mode → deterministic, structured; minimises fabrication |
| Extraction — prompt | Few-shot examples demonstrate correct schema and "Not found" fallback |
| Extraction — output | `source_sentence` required for every term; missing = unreliable |
| Extraction — UI | Self-reported confidence score displayed; < 50% triggers ⚠️ warning and tooltip |
| Extraction — UI | Expandable "Why?" section shows verbatim source sentence |
| Chat — system prompt | "Answer ONLY from the document text. Do not draw on general legal knowledge." |
| Chat — mandatory citation | Every response must end with `[Page X]`; UI appends "Source: unknown" if absent |
| Chat — prefix | "Based on the document, ..." prefix on every response |
| Chat — fallback | "I cannot find this in the document." is the required response for absent information |
| Chat — input | `sanitizeForLLM()` strips prompt injection patterns before every OpenAI call |
| UI | Inline term editing — user can correct AI errors; original `ai_value` preserved in DB |
| UI | "Not legal advice" disclaimer always visible on results page |
| Testing | Automated Playwright test: question about topic not in document → assert "I cannot find this" |

---

## 9. API Specification

**Base URL:** `/api`

**Authentication:** All endpoints require a valid Supabase session. Each route calls `requireAuth()` which invokes `supabase.auth.getUser()` (JWT validated with Supabase server). Returns 401 if no session.

**Response envelope:**
- Success: `{ "data": { ... }, "error": null }`
- Failure: `{ "data": null, "error": { "code": "ERROR_CODE", "message": "Human-readable message." } }`

**Content-Type:** `application/json` unless noted as `multipart/form-data`.

---

### POST `/api/contracts/upload`

**Purpose:** Validate and upload a PDF contract; extract text with page markers; create DB record. Return `contract_id` to trigger processing flow.

**Auth:** Required | **Content-Type:** `multipart/form-data`

**Request fields:**

| Field | Type | Validation |
|---|---|---|
| `file` | `File` (PDF) | Required; ≤ 10,485,760 bytes; extension `.pdf` |
| `contract_type` | `string` | Required; enum: `'nda'` \| `'msa'` |

**Processing steps:**
1. `requireAuth()` — 401 if no valid session
2. `validateFile(file)` — rejects non-PDF extension; rejects > 10 MB
3. `uploadBodySchema.safeParse({ contract_type })` — rejects invalid type
4. Extract buffer and call `extractPDFText(buffer)`:
   - Per-page render via pdf-parse; join with `[PAGE N]\n` markers
   - `pageCount > 20` → throws TOO_MANY_PAGES
   - `wordCount < 100` → throws SCANNED_PDF
   - `tokenCount > 15000` → throws CONTRACT_TOO_LONG
5. `INSERT INTO contracts` with `status = 'pending'`
6. Non-blocking: `uploadToStorage()` → on success UPDATE `file_path`; on failure: silent log
7. Return 201

**Success Response (201):**
```json
{
  "data": {
    "contract_id": "a3f7e2b1-...",
    "status": "pending",
    "page_count": 12,
    "token_count": 8400
  },
  "error": null
}
```

**Error Responses:**

| HTTP | Code | Message |
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

### POST `/api/contracts/custom-terms`

**Purpose:** Save a custom key term to be included in the next extraction run.

**Auth:** Required

**Request body:**
```json
{ "contract_id": "uuid", "term_name": "Non-compete radius" }
```

**Validation:** `contract_id` — UUID, must exist and belong to `auth.uid()`; `term_name` — non-empty string ≤ 100 chars; COUNT check: ≥ 5 existing → 400 TOO_MANY_CUSTOM_TERMS.

**Success (201):**
```json
{ "data": { "id": "uuid", "term_name": "Non-compete radius" }, "error": null }
```

**Error Responses:** 400 TOO_MANY_CUSTOM_TERMS, 401 UNAUTHORIZED, 403 FORBIDDEN, 404 CONTRACT_NOT_FOUND

---

### POST `/api/contracts/process`

**Purpose:** Run AI key-term extraction on an uploaded contract; store results in `key_terms`.

**Auth:** Required

**Request body:**
```json
{
  "contract_id": "a3f7e2b1-...",
  "custom_terms": ["Non-compete radius", "Arbitration clause"]
}
```

**Validation:** `contract_id` — UUID; `custom_terms` — optional array ≤ 5 items, each string ≤ 100 chars.

**Processing steps:**
1. `requireAuth()` → 401
2. `processSchema.safeParse(body)` → 400
3. `checkRateLimit(user.id, 'contracts/process')` → 429 if exceeded
4. SELECT `contract_text`, `contract_type` WHERE `id = contract_id AND user_id = user.id` → 404 if not found
5. SELECT existing `custom_key_terms` for contract
6. Deduplicate: `[...dbCustomTerms, ...requestCustomTerms]`
7. UPDATE `contracts` SET `status = 'processing'`
8. `runExtraction()`: build prompt → call OpenAI → 3-attempt retry → Zod validate → throw AI_ERROR after 3 failures
9. Batch `INSERT INTO key_terms` (`is_manual = true` for custom terms)
10. UPDATE `contracts` SET `status = 'completed'`
11. Return 200

On failure at step 8: UPDATE `contracts` SET `status = 'error'`; return 500 or 504.

**Success Response (200):**
```json
{
  "data": {
    "key_terms": [
      {
        "id": "uuid",
        "contract_id": "uuid",
        "user_id": "uuid",
        "term_name": "Governing Law",
        "value": "Laws of the State of New York",
        "ai_value": null,
        "page_number": 4,
        "confidence_score": 92.5,
        "source_sentence": "This Agreement shall be governed by the laws of the State of New York.",
        "is_manual": false,
        "is_edited": false,
        "created_at": "2026-10-05T12:00:00Z"
      }
    ]
  },
  "error": null
}
```

Response headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`

**Error Responses:**

| HTTP | Code | Message |
|---|---|---|
| 400 | `TOO_MANY_CUSTOM_TERMS` | "Maximum 5 custom terms allowed." |
| 401 | `UNAUTHORIZED` | "Authentication required." |
| 403 | `FORBIDDEN` | "Contract does not belong to this user." |
| 404 | `CONTRACT_NOT_FOUND` | "Contract not found." |
| 429 | `RATE_LIMIT_EXCEEDED` | "Too many requests. Please wait before processing another contract." |
| 500 | `AI_ERROR` | "AI processing failed. Please try again." |
| 504 | `AI_TIMEOUT` | "AI processing timed out. Your contract has been saved — please try again." |

---

### GET `/api/contracts/[id]`

**Purpose:** Fetch a single contract with its key terms, chat session ID, existing feedback, and a signed URL for the PDF viewer.

**Auth:** Required | **Path parameter:** `id` — contract UUID

**Processing steps:**
1. `requireAuth()` → 401
2. SELECT contract WHERE `id = id AND user_id = user.id` → 404 if not found
3. Non-blocking: UPDATE `contracts` SET `last_accessed_at = now()`
4. If `file_path` not null: `createAdminClient().storage.createSignedUrl(file_path, 3600)`
5. SELECT `key_terms` WHERE `contract_id = id` ORDER BY `created_at ASC`
6. SELECT `id` FROM `chat_sessions` WHERE `contract_id = id AND user_id = user.id`
7. SELECT `rating` FROM `user_feedback` WHERE `contract_id = id AND user_id = user.id`
8. Return 200

**Success Response (200):**
```json
{
  "data": {
    "contract": {
      "id": "uuid",
      "file_name": "acme-nda.pdf",
      "contract_type": "nda",
      "status": "completed",
      "page_count": 8,
      "created_at": "2026-10-01T10:00:00Z",
      "contract_text": "[PAGE 1]\nThis Agreement...",
      "signed_url": "https://...supabase.co/storage/v1/object/sign/...?token=..."
    },
    "key_terms": [{ "id": "...", "term_name": "...", "..." : "..." }],
    "chat_session_id": "uuid | null",
    "existing_feedback": { "rating": "thumbs_up" }
  },
  "error": null
}
```

Note: `signed_url` is null if `file_path` is null or `createSignedUrl` fails. Null triggers `TextViewerFallback` — no error shown.

**Error Responses:** 401 UNAUTHORIZED, 403 FORBIDDEN, 404 CONTRACT_NOT_FOUND

---

### PATCH `/api/key-terms/[id]`

**Purpose:** Update an extracted key term value (inline edit); preserve original AI value.

**Auth:** Required | **Path parameter:** `id` — key_term UUID

**Request body:**
```json
{ "value": "New York State" }
```

**Processing steps:**
1. `requireAuth()` → 401
2. `keyTermPatchSchema.safeParse({ value })` — non-empty, ≤ 1000 chars → 400
3. SELECT term WHERE `id = id` → 404; 403 if `user_id ≠ user.id`
4. If `is_edited = false`: set `ai_value = current value` (preserve original)
5. UPDATE: `value = new_value`, `is_edited = true`
6. Return 200

**Success Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "value": "New York State",
    "ai_value": "Laws of the State of New York",
    "is_edited": true
  },
  "error": null
}
```

**Error Responses:**

| HTTP | Code | Message |
|---|---|---|
| 400 | `INVALID_VALUE` | "Value cannot be empty." |
| 400 | `VALUE_TOO_LONG` | "Value exceeds 1,000 character limit." |
| 401 | `UNAUTHORIZED` | "Authentication required." |
| 403 | `FORBIDDEN` | "Key term does not belong to this user." |
| 404 | `NOT_FOUND` | "Key term not found." |

---

### POST `/api/chat/sessions`

**Purpose:** Get or create a chat session for a contract (idempotent).

**Auth:** Required

**Request body:** `{ "contract_id": "uuid" }`

**Processing:**
1. Verify contract ownership → 403 if not found
2. `INSERT INTO chat_sessions (contract_id, user_id) ON CONFLICT (contract_id) DO NOTHING`
3. SELECT `id` FROM `chat_sessions` WHERE `contract_id = ... AND user_id = ...`
4. Return 200

**Success Response (200):**
```json
{ "data": { "session_id": "uuid" }, "error": null }
```

---

### GET `/api/chat/[sessionId]/messages`

**Purpose:** Fetch all messages for a chat session (to rehydrate chat history on page load).

**Auth:** Required | **Path parameter:** `sessionId` — chat_session UUID

**Processing:**
1. Verify session ownership
2. SELECT `id, role, content, created_at` FROM `chat_messages` WHERE `session_id = sessionId` ORDER BY `created_at ASC`
3. Return 200

**Success Response (200):**
```json
{
  "data": {
    "messages": [
      { "id": "uuid", "role": "user", "content": "What happens if I breach the NDA?", "created_at": "..." },
      { "id": "uuid", "role": "assistant", "content": "Based on the document, breach of confidentiality... [Page 3]", "created_at": "..." }
    ]
  },
  "error": null
}
```

---

### POST `/api/chat/message`

**Purpose:** Send a user message and receive an AI response grounded in the contract.

**Auth:** Required

**Route exports:** `export const runtime = 'nodejs'` and `export const maxDuration = 60`

**Request body:**
```json
{
  "contract_id": "uuid",
  "session_id": "uuid",
  "content": "What happens if I breach this NDA?"
}
```

**Validation:** `contract_id`, `session_id` — UUIDs; `content` — non-empty string ≤ 4000 chars.

**Processing steps:**
1. `requireAuth()` → 401
2. `chatMessageSchema.safeParse(body)` → 400
3. `checkRateLimit(user.id, 'chat/message')` → 429
4. `sanitizeForLLM(content)` → 400 INJECTION_DETECTED if empty after sanitise
5. Parallel: fetch `contract.contract_text` + verify `chatSession` ownership → 403 if either fails
6. SELECT history from `chat_messages` (ASC, LIMIT 200)
7. `classifyQuery(sanitised)` → `'contract'` | `'history'` | `'both'`
8. `buildChatMessages({ contractText, history, newUserMessage })`
9. `callChat(messages)` — GPT-4o, temp 0.4, max 1000 tokens
10. INSERT user message → INSERT assistant response
11. Return 200

**Success Response (200):**
```json
{
  "data": {
    "message_id": "uuid",
    "content": "Based on the document, breach of confidentiality obligations triggers a right to seek injunctive relief without posting bond. [Page 3]",
    "created_at": "2026-10-05T12:05:00Z",
    "query_type": "contract"
  },
  "error": null
}
```

Response headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`

**Error Responses:**

| HTTP | Code | Message |
|---|---|---|
| 400 | `INVALID_MESSAGE` | "Message cannot be empty." |
| 400 | `MESSAGE_TOO_LONG` | "Message exceeds 4,000 character limit." |
| 400 | `INJECTION_DETECTED` | "Invalid message content." |
| 401 | `UNAUTHORIZED` | "Authentication required." |
| 403 | `FORBIDDEN` | "Session or contract does not belong to this user." |
| 429 | `RATE_LIMIT_EXCEEDED` | "Too many chat messages. Please wait a moment." |
| 504 | `CHAT_TIMEOUT` | "Response timed out. Please try again." |

---

### POST `/api/feedback`

**Purpose:** Submit a thumbs-up or thumbs-down rating with optional comment.

**Auth:** Required

**Request body:**
```json
{
  "contract_id": "uuid",
  "rating": "thumbs_up",
  "comment": "Really helped me spot the auto-renewal clause!"
}
```

**Validation:** `contract_id` — UUID; `rating` — enum `'thumbs_up'` | `'thumbs_down'`; `comment` — optional string ≤ 2000 chars.

**Processing steps:**
1. Verify contract ownership → 403
2. Check for existing feedback → 409 ALREADY_SUBMITTED
3. `INSERT INTO user_feedback`
4. Return 201

**Success Response (201):**
```json
{ "data": { "feedback_id": "uuid" }, "error": null }
```

**Error Responses:** 400 INVALID_RATING, 401 UNAUTHORIZED, 403 FORBIDDEN, 409 ALREADY_SUBMITTED

---

### GET `/api/contracts/[id]/export` *(v1.1 — deferred)*

**Purpose:** Generate and return a downloadable CSV or PDF report of key terms.

**Query parameter:** `format` — `'csv'` | `'pdf'`

**Note:** Not implemented at MVP. Returns a binary file download within 5 seconds.

---

## 10. Feature Breakdown

### Phase 1 — MVP Core (v0.1–v0.4)

#### v0.1 — Foundation (Weeks 1–2)

**US-001: Email/password auth (sign up, sign in, sign out, session persistence)**
- Acceptance: Auth flow completes ≤ 10 seconds; invalid credentials show inline error; protected routes redirect unauthenticated users; session persists across page refreshes
- Dependencies: Supabase project provisioned; `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` set
- Implementation: `app/auth/login/page.tsx`, `app/auth/signup/page.tsx`, `middleware.ts`, `lib/supabase/client.ts`, `components/layout/Nav.tsx`

**FR-13/FR-14: Supabase schema with RLS + Storage bucket**
- Acceptance: All 7 tables have RLS enabled; storage.objects policies restrict to `auth.uid()::text = (storage.foldername(name))[1]`; file executes cleanly on a fresh project
- Dependencies: None
- Implementation: `docs/specs/supabase-schema.sql`

**Landing page (static):** Hero, value proposition, sign-in/sign-up CTAs. Dependencies: Nav component.

#### v0.2 — Core Review Flow (Weeks 3–5)

**US-002: PDF upload + text extraction**
- Acceptance: Accepts ≤ 10 MB, ≤ 20 pages; rejects scanned PDFs (< 100 words) with "Scanned PDFs are not supported yet"; rejects > 15,000 tokens; extraction ≤ 30s P95; text stored in `contracts.contract_text` with `[PAGE N]` markers
- Dependencies: Supabase Storage bucket, pdf-parse, `lib/pdf/extractor.ts`
- Implementation: `app/(protected)/upload/page.tsx`, `app/api/contracts/upload/route.ts`, `lib/pdf/extractor.ts`, `lib/validation/upload.schema.ts`

**US-003: Page attribution per key term**
- Acceptance: Every extracted term shows 1-indexed page number; clicking page number scrolls active viewer to that page
- Dependencies: US-002, extraction pipeline returning `page_number`
- Implementation: `lib/ai/extraction.ts`, `components/contracts/KeyTermCard.tsx`, `components/viewer/PDFViewer.tsx`, `components/viewer/TextViewerFallback.tsx`

**US-004: Confidence score display**
- Acceptance: Colour-coded score per term (green ≥ 80%, amber 50–79%, red < 50%); < 50% shows ⚠️ with non-dismissible tooltip
- Dependencies: US-002, OpenAI extraction returning `confidence_score`
- Implementation: `components/contracts/ConfidenceBar.tsx`, `components/contracts/KeyTermCard.tsx`, `components/ui/Tooltip.tsx`

**US-005: Custom key terms (up to 5 before processing)**
- Acceptance: Custom terms appear in preview list with "Custom" badge; max 5 enforced with clear error; custom terms in results have same data structure as standard terms
- Dependencies: US-002, `custom_key_terms` table
- Implementation: `components/upload/CustomTermInput.tsx`, `components/upload/TermPreviewList.tsx`, `app/api/contracts/custom-terms/route.ts`

**US-011-partial: Key terms panel (name, value, page, confidence, source sentence)**
- Acceptance: Panel shows ≥ 80% of standard terms with values; "Why?" expandable; "Not legal advice" disclaimer visible
- Dependencies: US-002, US-003, US-004
- Implementation: `components/contracts/KeyTermsPanel.tsx`, `components/contracts/KeyTermCard.tsx`, `components/contracts/SourceSentence.tsx`

#### v0.3 — Enriched Experience (Weeks 6–8)

**US-006: Inline PDF viewer**
- Acceptance: PDF.js renders all pages from signed URL; scrollable, zoomable; text fallback renders when signed_url is null; clicking page link scrolls the active viewer
- Dependencies: Supabase Storage, pdfjs-dist, `public/pdf.worker.min.mjs`
- Implementation: `components/viewer/PDFViewer.tsx`, `components/viewer/TextViewerFallback.tsx`

#### v0.4 — Chat and History (Weeks 9–11)

**US-007: Contract chat (Q&A)**
- Acceptance: Responds ≤ 15s P95; every response begins "Based on the document, ..."; every response ends with `[Page X]`; "I cannot find this in the document" for absent information; page citations are clickable
- Dependencies: US-002, `chat_sessions` + `chat_messages` tables, GPT-4o, `lib/ai/chat.ts`, `lib/ai/prompts/chat-system.ts`
- Implementation: `components/chat/ChatInterface.tsx`, `components/chat/MessageBubble.tsx`, `app/api/chat/sessions/route.ts`, `app/api/chat/message/route.ts`, `lib/ai/chat.ts`

**US-012: Persistent chat history**
- Acceptance: Chat messages reload on page revisit; full conversation history loads in order
- Dependencies: US-007, `app/api/chat/[sessionId]/messages/route.ts`

**US-008: Dashboard and contract history**
- Acceptance: Shows total, NDA/MSA counts; sortable list; clicking row opens results page; empty state for new users
- Dependencies: `contracts` table
- Implementation: `app/(protected)/dashboard/page.tsx`, `components/dashboard/ContractTable.tsx`, `components/dashboard/StatCard.tsx`, `components/dashboard/EmptyState.tsx`

**US-009: Inline key term editing**
- Acceptance: Click value → input; Enter saves; Escape cancels; "Edited" badge shown; original AI value preserved; edit persists on refresh; saves ≤ 2 seconds
- Dependencies: `key_terms` table (`ai_value`, `is_edited` columns), `PATCH /api/key-terms/[id]`
- Implementation: `components/contracts/KeyTermCard.tsx`, `app/api/key-terms/[id]/route.ts`

### Phase 2 — v1.0 Launch (Weeks 12–14)

**Rate limiting:** 20 extraction/user/hour; 60 chat/user/hour
- Acceptance: 21st extraction → 429; 61st chat → 429; rate limit headers present on all AI responses
- Implementation: `lib/security/rateLimiter.ts`, `rate_limit_events` table

**Prompt injection sanitisation:** Strips `###`, `<|`, `|>`, `[INST]`, `<<SYS>>`
- Implementation: `lib/security/promptInjectionGuard.ts`

**Performance target:** ≤ 30s P95 for extraction
- Verification: Timed integration test against 50-contract eval set

**Security audit:** Cross-user RLS isolation verified; signed URL expiry; API key management
- Test: User A cannot access User B's contracts via direct URL manipulation

**WCAG 2.1 AA review:** Focus rings, `aria-live` regions, `ConfidenceBar role="meter"`, Modal focus trap

**Onboarding tooltips:** Contextual help on ⚠️ icon, "Why?" section, confidence bar

### Phase 3 — v1.1 and v1.2 (Weeks 15–24)

**US-010: Feedback submission (thumbs up/down + comment)** *(P2 — already coded)*
- Acceptance: One submission per contract per user; 409 on second submission; "Thanks for your feedback!" shown after
- Implementation: `components/contracts/FeedbackWidget.tsx`, `app/api/feedback/route.ts`

**US-011: Export key terms to CSV / PDF report** *(v1.1)*
- Acceptance: Export button generates file within 5 seconds; downloads to browser
- Dependencies: CSV serialisation of `key_terms`; PDF generation library (pdfmake or @react-pdf/renderer)

**v1.1 (Weeks 15–18):** Dashboard analytics charts (contracts by month, correction rate), batch upload (up to 5 contracts), onboarding modal for first-time users

**v1.2 (Weeks 19–24):** Scanned PDF OCR (AWS Textract or Tesseract.js), contract comparison view, email notifications (Resend or Postmark), team workspace (multi-user with `team_id` FK on contracts)

---

## 11. Folder Structure

```
contractiq/
├── app/
│   ├── (protected)/                      ← Auth-required routes (guarded by middleware)
│   │   ├── layout.tsx                    ← Protected layout wrapper
│   │   ├── contracts/[id]/
│   │   │   └── page.tsx                  ← ResultsPage (Server Component; fetches all data)
│   │   ├── dashboard/
│   │   │   └── page.tsx                  ← DashboardPage (Server Component)
│   │   └── upload/
│   │       └── page.tsx                  ← UploadPage ('use client'; multi-step wizard)
│   ├── api/
│   │   ├── chat/
│   │   │   ├── [sessionId]/messages/
│   │   │   │   └── route.ts              ← GET /api/chat/{sessionId}/messages
│   │   │   ├── message/
│   │   │   │   └── route.ts              ← POST /api/chat/message (runtime=nodejs, maxDuration=60)
│   │   │   └── sessions/
│   │   │       └── route.ts              ← POST /api/chat/sessions
│   │   ├── contracts/
│   │   │   ├── [id]/
│   │   │   │   └── route.ts              ← GET /api/contracts/{id}
│   │   │   ├── custom-terms/
│   │   │   │   └── route.ts              ← POST /api/contracts/custom-terms
│   │   │   ├── process/
│   │   │   │   └── route.ts              ← POST /api/contracts/process (runtime=nodejs, maxDuration=60)
│   │   │   └── upload/
│   │   │       └── route.ts              ← POST /api/contracts/upload
│   │   ├── feedback/
│   │   │   └── route.ts                  ← POST /api/feedback
│   │   └── key-terms/[id]/
│   │       └── route.ts                  ← PATCH /api/key-terms/{id}
│   ├── auth/
│   │   ├── login/
│   │   │   └── page.tsx                  ← LoginPage ('use client')
│   │   └── signup/
│   │       └── page.tsx                  ← SignupPage ('use client')
│   ├── globals.css                       ← Tailwind directives + skeleton animation
│   ├── layout.tsx                        ← Root layout: html, body, metadata
│   └── page.tsx                          ← Landing page (marketing)
│
├── components/
│   ├── chat/
│   │   ├── ChatInterface.tsx             ← Full chat UI (session, messages, input, auto-scroll)
│   │   └── MessageBubble.tsx             ← Individual message; parses [Page X] into clickable buttons
│   ├── contracts/
│   │   ├── ConfidenceBar.tsx             ← Colour-coded progress bar with role="meter" aria
│   │   ├── FeedbackWidget.tsx            ← Thumbs up/down + optional comment
│   │   ├── KeyTermCard.tsx               ← Expandable term card with inline edit
│   │   ├── KeyTermsPanel.tsx             ← Scrollable panel; owns keyTerms array state
│   │   ├── ResultsClient.tsx             ← 'use client'; owns targetPage, isChatOpen state
│   │   └── SourceSentence.tsx            ← Collapsible "Why?" section
│   ├── dashboard/
│   │   ├── ContractTable.tsx             ← Client-side sortable table
│   │   ├── EmptyState.tsx                ← Empty state with CTA
│   │   └── StatCard.tsx                  ← Single stat display (number + label)
│   ├── layout/
│   │   └── Nav.tsx                       ← Sticky navigation bar
│   ├── ui/                               ← Design-system primitives (Spec 09)
│   │   ├── Badge.tsx
│   │   ├── Banner.tsx
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── Skeleton.tsx
│   │   ├── Spinner.tsx
│   │   ├── Textarea.tsx
│   │   └── Tooltip.tsx
│   ├── upload/
│   │   ├── ContractTypeSelector.tsx      ← NDA/MSA dropdown selector
│   │   ├── CustomTermInput.tsx           ← Input + counter for custom terms
│   │   ├── DropZone.tsx                  ← Drag-and-drop PDF zone
│   │   ├── ProcessingProgress.tsx        ← 3-step progress stepper
│   │   └── TermPreviewList.tsx           ← Standard + custom term preview list
│   └── viewer/
│       ├── PDFViewer.tsx                 ← PDF.js wrapper; accepts targetPage prop; lazy pages
│       └── TextViewerFallback.tsx        ← [PAGE N] marker parser; same targetPage interface
│
├── lib/
│   ├── ai/
│   │   ├── chat.ts                       ← buildChatMessages() + callChat()
│   │   ├── classifier.ts                 ← classifyQuery(): 'contract' | 'history' | 'both'
│   │   ├── extraction.ts                 ← runExtraction() with 3-attempt retry logic
│   │   └── prompts/
│   │       ├── chat-system.ts            ← Chat system prompt with contractText injection
│   │       ├── msa-extraction.ts         ← MSA few-shot system prompt (3 examples)
│   │       └── nda-extraction.ts         ← NDA few-shot system prompt (3 examples)
│   ├── pdf/
│   │   └── extractor.ts                  ← extractPDFText(): per-page render, [PAGE N], validation
│   ├── security/
│   │   ├── authGuard.ts                  ← requireAuth(): getUser() → AuthResult (user | 401)
│   │   ├── promptInjectionGuard.ts       ← sanitizeForLLM(): strips injection patterns
│   │   └── rateLimiter.ts                ← checkRateLimit(): sliding window via admin client
│   ├── supabase/
│   │   ├── client.ts                     ← createBrowserClient() — anon key, Client Components
│   │   └── server.ts                     ← createRouteClient(), createPageClient(), createAdminClient()
│   ├── validation/
│   │   ├── chat.schema.ts                ← chatMessageSchema
│   │   ├── feedback.schema.ts            ← feedbackSchema
│   │   ├── key-term.schema.ts            ← keyTermPatchSchema
│   │   ├── process.schema.ts             ← processSchema
│   │   └── upload.schema.ts              ← uploadBodySchema + validateFile()
│   └── constants.ts                      ← All numeric/config constants
│
├── public/
│   └── pdf.worker.min.mjs                ← PDF.js worker (copied from pdfjs-dist/build/)
│
├── docs/
│   ├── ContractIQ_PRD.md
│   ├── design.md
│   ├── engineering/
│   │   └── engineering-doc.md            ← This document
│   └── specs/
│       ├── 01-auth.md
│       ├── 02-pdf-upload-extraction.md
│       ├── 03-ai-key-term-extraction.md
│       ├── 04-results-page.md
│       ├── 05-contract-chat.md
│       ├── 06-dashboard.md
│       ├── 07-inline-editing-feedback.md
│       ├── 08-rate-limiting.md
│       ├── 09-shared-ui-components.md
│       └── supabase-schema.sql
│
├── .env.example                          ← All required env vars documented
├── .env.local                            ← Local values (gitignored)
├── middleware.ts                         ← Route protection + auth redirect
├── next.config.mjs                       ← serverComponentsExternalPackages: ['pdf-parse']
├── netlify.toml                          ← Netlify deployment config
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## 12. Naming Conventions

### Files and Folders

| Category | Convention | Example |
|---|---|---|
| Page files | `page.tsx` (lowercase) | `app/(protected)/dashboard/page.tsx` |
| API routes | `route.ts` (lowercase) | `app/api/contracts/upload/route.ts` |
| React components | PascalCase `.tsx` | `KeyTermsPanel.tsx`, `PDFViewer.tsx` |
| Custom hook files | `use` + PascalCase `.ts` | `useContractData.ts`, `usePDFViewer.ts` |
| Lib modules | kebab-case `.ts` | `extractor.ts`, `chat-system.ts` |
| Schema files | kebab-case + `.schema.ts` | `upload.schema.ts`, `chat.schema.ts` |
| Prompt files | kebab-case `.ts` | `nda-extraction.ts`, `msa-extraction.ts` |
| Route group folders | parentheses + kebab-case | `(protected)/` |
| API route folders | kebab-case | `key-terms/`, `custom-terms/` |
| Dynamic segments | camelCase in brackets | `[id]`, `[sessionId]` |

### React Components

- PascalCase, descriptive: `KeyTermCard`, `ConfidenceBar`, `TextViewerFallback`, `ProcessingProgress`
- Custom hooks: `use` prefix + PascalCase (`useContractData`, `usePDFViewer`, `useChatSession`)
- Context providers: PascalCase + `Provider` suffix (`AuthProvider`, `ContractProvider`)

### API Routes

- REST nouns, plural, kebab-case path segments: `/api/key-terms/[id]`, `/api/chat/sessions`
- HTTP method determines action: `GET` = read, `POST` = create, `PATCH` = partial update, `DELETE` = delete
- No verbs in paths (exception: `/api/contracts/process` — noun-adjacent process step)
- Nested resources: `/api/chat/[sessionId]/messages`

### Database

| Element | Convention | Example |
|---|---|---|
| Tables | `snake_case`, plural | `contracts`, `key_terms`, `chat_messages` |
| Columns | `snake_case` | `contract_id`, `confidence_score`, `is_edited` |
| Indexes | `idx_{table}_{column(s)}` | `idx_contracts_user_id` |
| RLS policy names | `"Users can {operation} own {table}"` | `"Users can view own contracts"` |
| FK columns | `{referenced_table_singular}_id` | `contract_id`, `session_id` |
| Boolean columns | `is_` prefix | `is_manual`, `is_edited` |
| Timestamp columns | `_at` suffix | `created_at`, `last_accessed_at` |
| Status enums | lowercase strings | `'pending'`, `'processing'`, `'completed'`, `'error'` |

### Environment Variables

- Server-only (never `NEXT_PUBLIC_` prefix): `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Client-safe: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- All vars documented in `.env.example` with descriptions and example values

### Constants (`lib/constants.ts`)

All exported constants use SCREAMING_SNAKE_CASE:

```typescript
MAX_FILE_SIZE_MB = 10
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
MAX_PAGES = 20
MAX_TOKEN_COUNT = 15_000
MIN_WORD_COUNT = 100
MAX_CUSTOM_TERMS = 5
CONFIDENCE_THRESHOLD_LOW = 50
CONFIDENCE_THRESHOLD_HIGH = 80
OPENAI_EXTRACTION_TEMP = 0.1
OPENAI_CHAT_TEMP = 0.4
OPENAI_EXTRACTION_MAX_TOKENS = 2000
OPENAI_CHAT_MAX_TOKENS = 1000
SIGNED_URL_EXPIRY_SECONDS = 3600
MAX_CHAT_HISTORY = 200
RATE_LIMIT_PROCESS_PER_HOUR = 20
RATE_LIMIT_CHAT_PER_HOUR = 60
CONTRACT_TYPE_NDA = 'nda'
CONTRACT_TYPE_MSA = 'msa'
```

---

## 13. Testing Strategy

### Unit Tests

**Framework:** Vitest

**Coverage target:** ≥ 80% line coverage on `lib/` modules

**Key test targets:**

| Module | What to test | Representative assertions |
|---|---|---|
| `lib/pdf/extractor.ts` | `[PAGE N]` marker insertion; word count detection; token count calculation; error on corrupt PDF; page count enforcement | Buffer with 3 pages → text contains `[PAGE 1]`, `[PAGE 2]`, `[PAGE 3]`; 21-page PDF → throws TOO_MANY_PAGES |
| `lib/ai/extraction.ts` | Valid JSON parsing; corrective retry on parse failure (mock OpenAI); Zod schema validation; custom term injection; "Not found" term handling | Mock returns invalid JSON → second call made with corrective prompt; `confidence_score` out of 0–100 range → Zod throws |
| `lib/ai/chat.ts` | Message array construction; history capped at 200; contract_text in system prompt | `buildChatMessages` with 205-message history → messages array has ≤ 202 items (system + 200 history + 1 new) |
| `lib/ai/classifier.ts` | All three query types for representative inputs | "What did you say earlier?" → `'history'`; "What is the governing law?" → `'contract'`; "What did you say about the governing law?" → `'both'` |
| `lib/validation/*.schema.ts` | Valid and invalid inputs for each Zod schema | `uploadBodySchema`: `{ contract_type: 'invalid' }` → fails; `{ contract_type: 'nda' }` → passes |
| `lib/security/rateLimiter.ts` | Count at limit → `allowed: false`; count below limit → `allowed: true`, `remaining` decremented | Mock Supabase count = 20 for `'contracts/process'` → `{ allowed: false, remaining: 0 }` |
| `lib/security/promptInjectionGuard.ts` | All injection patterns stripped; empty result after stripping → `safe: false` | Input `"###ignore previous"` → `safe: false` or stripped output empty |
| `lib/constants.ts` | Values match PRD requirements | `MAX_FILE_SIZE_BYTES === 10 * 1024 * 1024`; `CONFIDENCE_THRESHOLD_LOW === 50` |

### Integration Tests

**Framework:** Vitest + Supabase local development stack (`supabase start`)

**Coverage target:** ≥ 70% line coverage on API routes

**Key test targets:**

| Endpoint | Test Case | Expected Outcome |
|---|---|---|
| POST `/api/contracts/upload` | Valid 5-page text-layer PDF + `'nda'` | 201; contracts row with `status = 'pending'`; `contract_text` contains `[PAGE 1]` |
| POST `/api/contracts/upload` | Scanned PDF (< 100 words extracted) | 400 SCANNED_PDF; no DB insert |
| POST `/api/contracts/upload` | File > 10 MB | 400 FILE_TOO_LARGE; no DB insert |
| POST `/api/contracts/upload` | No auth token | 401 UNAUTHORIZED |
| POST `/api/contracts/process` | Standard terms + 2 custom terms | 200; `is_manual = true` for custom terms; `contracts.status = 'completed'` |
| POST `/api/contracts/process` | OpenAI mock throws timeout | 504 AI_TIMEOUT; `contracts.status = 'error'` |
| POST `/api/contracts/process` | 21st request from same user in 1 hour | 429 RATE_LIMIT_EXCEEDED |
| PATCH `/api/key-terms/[id]` | Correct user; new value | 200; `ai_value` = previous value; `is_edited = true` |
| PATCH `/api/key-terms/[id]` | Different user tries to edit | 403 FORBIDDEN |
| POST `/api/chat/message` | Valid message | 200; user + assistant messages in `chat_messages` |
| POST `/api/feedback` | Second submission for same contract | 409 ALREADY_SUBMITTED |
| **RLS isolation** | User A's JWT queries User B's `contracts` table | Empty result (RLS policy blocks cross-user reads) |
| **RLS isolation** | User B accesses User A's `key_terms` directly | Empty result |

### End-to-End Tests

**Framework:** Playwright

**Test environment:** Netlify preview deploy or local `next dev` with Supabase local

| Test ID | Name | Flow | Assertion |
|---|---|---|---|
| E2E-001 | Full NDA review flow | Sign up → upload 8-page NDA → process → view results | Key terms panel shows ≥ 8 terms with confidence scores and page numbers |
| E2E-002 | PDF viewer page navigation | Open results → click page number on key term | PDF viewer scrolls to correct page |
| E2E-003 | Text viewer fallback | Open results for contract with null `file_path` | Text viewer renders; page navigation still works |
| E2E-004 | Chat groundedness — answer present | Open chat → ask "What is the governing law?" (present in contract) | Response contains "Based on the document," and `[Page X]` citation |
| E2E-005 | Chat hallucination regression | Open chat → ask about topic not in document | Response contains "I cannot find this in the document." |
| E2E-006 | Inline term editing | Click a term value → edit → Enter | "Edited" badge shown; refresh → edited value persists |
| E2E-007 | Chat persistence | Close chat → reopen contract | Previous conversation loads in full |
| E2E-008 | Cross-user isolation | Log in as User B → navigate to `/contracts/{User A's contract ID}` | 404 or redirect; User B's data not visible |
| E2E-009 | Scanned PDF rejection | Upload image-only PDF | Banner shows "Scanned PDFs are not supported yet." |
| E2E-010 | Custom term in results | Add "Non-compete radius" → process | Term appears in results with "Custom" badge and same data structure |
| E2E-011 | Dashboard sort | Dashboard → click "Date Uploaded" header | List reverses sort order; oldest contract appears first |
| E2E-012 | Feedback submission | Submit thumbs up + comment → revisit results page | Widget shows "Thanks for your feedback!"; no buttons shown on revisit |

### Offline AI Evaluation

*(Separate from automated test suite — run manually before each release)*

**Dataset:**
- 30 manually labelled NDA contracts (annotated by legal SME or from CUAD dataset)
- 20 manually labelled MSA contracts

**Metrics and targets:**

| Metric | Target | Cadence |
|---|---|---|
| Key-term extraction F1 (NDA) | ≥ 88% | Every release |
| Key-term extraction F1 (MSA) | ≥ 85% | Every release |
| Page number accuracy (% correct) | ≥ 92% | Every release |
| Custom term extraction F1 | ≥ 80% | Every release |
| Chat groundedness (% hallucinated) | ≤ 5% | Monthly |
| Confidence calibration error | ≤ 0.10 | Monthly |

**Evaluation spreadsheet columns:**
`Contract_ID | Contract_Type | Term_Name | Expected_Value | AI_Extracted_Value | Expected_Page | AI_Page | Confidence_Score | F1_Match | Expert_Rating | Notes`

**Production monitoring:**
- Weekly drift check: sample 10 recent user-corrected terms → compare against expected extraction
- Alert: correction rate > 12% in any 7-day rolling window → trigger immediate prompt review
- Monthly: legal SME audits 5 random production contracts for quality assurance

---

## 14. Specs to Implementation Mapping

| Spec | User Story | Key Implementation Files | Full Flow |
|---|---|---|---|
| `01-auth.md` | US-001 | `app/auth/login/page.tsx`, `app/auth/signup/page.tsx`, `middleware.ts`, `lib/supabase/client.ts`, `components/layout/Nav.tsx` | User submits form → `supabase.auth.signInWithPassword()` or `signUp()` → session cookie stored → `middleware.ts` reads session on every protected route → redirect logic applied |
| `02-pdf-upload-extraction.md` | US-002, US-005 | `app/(protected)/upload/page.tsx`, `components/upload/DropZone.tsx`, `components/upload/ContractTypeSelector.tsx`, `app/api/contracts/upload/route.ts`, `lib/pdf/extractor.ts`, `lib/validation/upload.schema.ts`, `components/upload/CustomTermInput.tsx`, `app/api/contracts/custom-terms/route.ts` | User drops PDF → client validates → `POST /api/contracts/upload` → `extractPDFText()` parses pages + builds `[PAGE N]` text → `INSERT INTO contracts` → non-blocking Storage upload; Custom term → `POST /api/contracts/custom-terms` → `INSERT INTO custom_key_terms` → preview list updates |
| `03-ai-key-term-extraction.md` | US-003, US-004, US-005 | `app/api/contracts/process/route.ts`, `lib/ai/extraction.ts`, `lib/ai/prompts/nda-extraction.ts`, `lib/ai/prompts/msa-extraction.ts`, `lib/validation/process.schema.ts`, `lib/security/rateLimiter.ts` | `POST /api/contracts/process` → rate limit check → fetch `contract_text` from DB → `runExtraction()` → few-shot prompt built → OpenAI call with retry → Zod validate → `INSERT INTO key_terms` → `UPDATE status = 'completed'` |
| `04-results-page.md` | US-003, US-004, US-006 | `app/(protected)/contracts/[id]/page.tsx`, `components/contracts/ResultsClient.tsx`, `components/viewer/PDFViewer.tsx`, `components/viewer/TextViewerFallback.tsx`, `components/contracts/KeyTermsPanel.tsx`, `components/contracts/KeyTermCard.tsx`, `components/contracts/ConfidenceBar.tsx`, `components/contracts/SourceSentence.tsx`, `app/api/contracts/[id]/route.ts` | Server Component fetches contract + keyTerms + signedUrl + chatSession + feedback → passes to `ResultsClient` → `PDFViewer` renders from signed_url (or `TextViewerFallback` if null) → `KeyTermCard` renders per term with confidence + page link + "Why?" → clicking page number calls `setTargetPage()` → both viewers scroll |
| `05-contract-chat.md` | US-007, US-012 | `components/chat/ChatInterface.tsx`, `components/chat/MessageBubble.tsx`, `app/api/chat/sessions/route.ts`, `app/api/chat/message/route.ts`, `app/api/chat/[sessionId]/messages/route.ts`, `lib/ai/chat.ts`, `lib/ai/classifier.ts`, `lib/ai/prompts/chat-system.ts`, `lib/validation/chat.schema.ts`, `lib/security/promptInjectionGuard.ts` | User types → `POST /api/chat/message` → `sanitizeForLLM()` → rate limit check → fetch `contract_text` + verify session → fetch history (200 messages ASC) → `classifyQuery()` → `buildChatMessages()` (system + contractText + history + new) → `callChat()` → INSERT both messages → return response → `MessageBubble` renders with `[Page X]` as clickable button |
| `06-dashboard.md` | US-008 | `app/(protected)/dashboard/page.tsx`, `components/dashboard/ContractTable.tsx`, `components/dashboard/StatCard.tsx`, `components/dashboard/EmptyState.tsx` | Server Component: `SELECT contracts WHERE user_id = auth.uid() ORDER BY created_at DESC` → derive stats → `StatCard × 3` → `ContractTable` (client-side sort) → clicking row → `router.push('/contracts/{id}')` |
| `07-inline-editing-feedback.md` | US-009, US-010 | `components/contracts/KeyTermCard.tsx`, `app/api/key-terms/[id]/route.ts`, `lib/validation/key-term.schema.ts`, `components/contracts/FeedbackWidget.tsx`, `app/api/feedback/route.ts`, `lib/validation/feedback.schema.ts` | Term click → inline input → Enter → `PATCH /api/key-terms/{id}` → preserve `ai_value` on first edit → `is_edited = true` → "Edited" badge; Thumbs click → textarea → Submit → `POST /api/feedback` → 409 if duplicate → "Thanks for your feedback!" |
| `08-rate-limiting.md` | (non-functional) | `lib/security/rateLimiter.ts`, `rate_limit_events` table, `app/api/contracts/process/route.ts`, `app/api/chat/message/route.ts` | `checkRateLimit(userId, endpoint)` → sliding window COUNT in `rate_limit_events` WHERE `created_at >= now() - 1hr` → if count ≥ limit: return `{ allowed: false }` → route returns 429 with Retry-After header; else: INSERT new event → return `{ allowed: true, remaining: N }` |
| `09-shared-ui-components.md` | (non-functional) | `components/ui/Button.tsx`, `Badge.tsx`, `Tooltip.tsx`, `Input.tsx`, `Textarea.tsx`, `Modal.tsx`, `Spinner.tsx`, `Banner.tsx`, `Skeleton.tsx` | Used by all feature components; design-system tokens from `docs/design.md`; all keyboard navigable; no hardcoded hex values |
| `supabase-schema.sql` | FR-13, FR-14 | `docs/specs/supabase-schema.sql` | Single paste-and-run SQL file: CREATE TABLE × 7 + indexes + RLS policies + storage bucket INSERT + storage.objects policies × 3 |

### Critical Files

| File | Why it matters |
|---|---|
| `docs/specs/supabase-schema.sql` | Must be executed first on any new Supabase project; creates the entire database foundation including Storage RLS |
| `lib/ai/extraction.ts` | Core AI extraction orchestration with retry logic; the heart of the product's accuracy guarantee |
| `app/api/contracts/upload/route.ts` | Upload pipeline entry point; determines what text the entire downstream AI system sees |
| `components/contracts/ResultsClient.tsx` | Client-side root of the results page; owns the `targetPage` state that connects key terms panel to both viewers |
| `lib/security/rateLimiter.ts` | Prevents runaway OpenAI costs; uses admin client to bypass RLS for tamper-proof rate limit enforcement |
