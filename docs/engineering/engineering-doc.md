# ContractIQ — Engineering Document

**Version:** 1.0  
**Date:** 2026-07-14  
**Status:** Draft — Awaiting Approval  
**PRD Source:** `docs/ContractIQ_PRD.md`

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
14. [Specs-to-Implementation Mapping](#14-specs-to-implementation-mapping)

---

## 1. Executive Summary

**Product:** ContractIQ  
**Version:** MVP (v0.1–v1.0)  

### Business Goal

Reduce NDA and MSA contract review time for SMBs from 90–120 minutes to ≤15 minutes by automatically extracting key terms, providing page-level attribution, confidence scoring, and plain-English Q&A — without requiring in-house legal expertise.

### Problem Statement

Business professionals at companies with 5–250 employees routinely sign NDAs and MSAs without fully understanding the terms. Without legal teams, a single contract review takes 90–120 minutes, requires expertise most SMBs don't have, and results in missed obligations, unfavourable terms, or costly disputes. Existing enterprise tools (DocuSign CLM, Ironclad, Kira) cost $50k–$500k/year. Generic AI (ChatGPT) lacks structured extraction, page attribution, confidence scoring, and contract-type-specific term libraries.

### Target Users

- **Primary:** Founders, COOs, Procurement Managers at 5–250 person companies (no legal team); sign 5–15 NDAs/MSAs per month
- **Secondary:** Freelancers and consultants signing client MSAs; receive 1–4 MSAs/month; cannot afford legal review

### Success Criteria

| Metric | Target |
|---|---|
| North Star — time from upload to completed key-term review | ≤ 15 minutes |
| Key-term extraction accuracy (F1, NDA) | ≥ 88% |
| Key-term extraction accuracy (F1, MSA) | ≥ 85% |
| Extraction latency (upload → results panel) P95 | ≤ 30 seconds |
| Chat response latency P95 | ≤ 15 seconds |
| Cost per 20-page contract analysis | ≤ $0.25 |
| 30-day user retention | ≥ 45% |
| AI extraction correction rate | ≤ 12% of terms |

### Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), React 18, Tailwind CSS |
| Backend | Next.js 14 API Routes (Vercel serverless) |
| Database + Auth + Storage | Supabase (PostgreSQL, Supabase Auth, Supabase Storage) |
| AI / LLM | OpenAI GPT-4o (JSON mode, 128k context) |
| PDF Parsing | pdf-parse (Node.js, server-side) |
| PDF Rendering | PDF.js (client-side) |
| Schema Validation | Zod |
| Icons | Lucide React |
| Fonts | Inter (body), JetBrains Mono (contract text) |
| Hosting | Vercel (frontend + API routes) |

---

## 2. Product Scope

### In Scope (MVP)

- Email/password authentication via Supabase Auth
- PDF upload (≤10 MB, ≤20 pages, text-layer PDFs only)
- Server-side text extraction with `[PAGE N]` markers; stored once in DB; reused for all downstream processing
- Standard key-term extraction for NDA (10 terms) and MSA (12 terms) via GPT-4o
- Up to 5 custom key terms per analysis, added before processing
- Confidence scoring per extracted term (0–100%), colour-coded (green ≥ 80%, amber 50–79%, red < 50%)
- Page-level attribution per term; expandable source sentence ("Why?" section)
- Low-confidence (< 50%) flagging with ⚠️ icon and non-dismissible tooltip
- Inline PDF viewer using PDF.js (signed URL from Supabase Storage)
- Text-viewer fallback (parses `[PAGE N]` markers from DB) when Storage is unavailable
- Click-to-navigate from key-terms panel to corresponding PDF page
- Contract chat: Q&A grounded strictly in the uploaded document (GPT-4o, full context, page citation required)
- Persistent chat history per contract (stored in Supabase, loaded on page revisit)
- Dashboard: total contracts, breakdown by type, sortable contract list
- Inline key-term editing with "Edited" badge; original AI value preserved
- Feedback submission: thumbs up/down + optional comment per contract review
- "Not legal advice" disclaimer on every results page
- Supabase RLS enforced on all tables and Storage bucket

### Out of Scope (MVP)

- Scanned/image PDFs (OCR) — graceful error shown; planned v1.2
- Non-English contracts or non-US/UK legal conventions
- Export to CSV or PDF — P2 backlog, planned v1.1
- Batch contract upload — planned v1.1
- Multi-user workspaces / team plans — planned v1.2
- Contract comparison view — planned v1.2
- Fine-tuning or model training on user data
- Email notifications — planned v1.2
- Dashboard analytics charts — planned v1.1

### Future Enhancements

| Version | Feature |
|---|---|
| v1.1 | Export key terms (CSV + PDF), batch upload (up to 5), dashboard charts |
| v1.2 | OCR for scanned PDFs (AWS Textract), contract comparison, email notifications, team workspaces |
| Post-v1.0 | Chunked RAG for contracts > 15,000 tokens, jurisdiction-specific prompt variants, non-English support |

---

## 3. User Personas

### Persona 1 — The Time-Pressed Founder / Ops Lead (Primary)

| Attribute | Detail |
|---|---|
| Roles | Founder, COO, Procurement Manager, Legal Ops Manager |
| Company size | 5–250 employees; no in-house legal counsel |
| Industries | SaaS, agency, professional services, fintech, e-commerce |
| Contract volume | Signs 5–15 NDAs or MSAs per month |
| Current behaviour | Google searches, ad-hoc legal consultations ($250–$500/hr) |
| Primary pain | 90–120 min per review; misses auto-renewal, indemnification, IP assignment clauses |
| Technical comfort | Comfortable with web tools; not a lawyer |

**Permissions:** Full access — upload, review, edit terms, chat, view dashboard

**Primary workflows:**
1. Upload contract → view extracted key terms → verify low-confidence terms → chat for clarification
2. Revisit dashboard to track contract history and retrieve past reviews

---

### Persona 2 — The Freelancer / Consultant (Secondary)

| Attribute | Detail |
|---|---|
| Roles | Designer, developer, marketer, consultant |
| Contract volume | Receives 1–4 MSAs/month from larger clients |
| Current behaviour | Signs without reading carefully due to power imbalance |
| Primary pain | Cannot afford legal review; unsure which clauses are non-standard or risky |
| Technical comfort | Moderate; needs plain-English explanations of legal terms |

**Permissions:** Same as Primary (single user tier at MVP)

**Primary workflows:**
1. Upload client MSA → scan key terms for red flags → use chat to understand risky clauses

---

## 4. User Flows

All flows follow the format:
```
User Action → Frontend Behaviour → Backend Processing → Database Interaction → System Response
```

---

### Flow 1 — New Visitor → Sign Up → Dashboard

```
User clicks "Get Started Free" on landing page
  → Frontend renders Supabase Auth sign-up modal (email + password)
  → Supabase Auth: createUser (email/password)
  → Supabase inserts row in auth.users; session token returned
  → Frontend receives session; redirects to /dashboard
  → Dashboard renders empty state: "No contracts reviewed yet — upload your first contract to begin"
```

**Steps:**
1. Landing page (`/`) — hero, value prop, demo GIF, CTAs: "Sign In" / "Get Started Free"
2. "Get Started Free" → renders `/auth/signup`
3. User submits email + password → Supabase Auth `signUp()` → email verification sent
4. On verification completion → session established → redirect to `/dashboard`
5. Dashboard empty state shown; "Review a Contract" CTA prominent

**Error states:**
- Duplicate email → "An account with this email already exists. Sign in instead."
- Weak password → inline validation before submission
- Network error → toast: "Something went wrong. Please try again."

---

### Flow 2 — Returning User → Sign In → Dashboard

```
User visits / or /auth/login
  → Frontend renders sign-in form
  → Supabase Auth: signInWithPassword(email, password)
  → Session token stored in browser (Supabase managed)
  → Redirect to /dashboard
  → Frontend queries contracts table (WHERE user_id = auth.uid()) 
  → Renders: total count, NDA/MSA breakdown, last 5 contracts (sortable list)
```

**Dashboard data displayed:**
- Total contracts reviewed (COUNT)
- Breakdown by type (NDA count / MSA count)
- Sortable list: contract name, type, date uploaded, status (completed / processing / error)
- Each row is clickable → opens `/contracts/[id]` (results page)

---

### Flow 3 — Core Contract Review Flow

```
User clicks "Review a Contract"
  → /upload page renders
  → User selects contract type (NDA / MSA) from dropdown
  → User drags/drops or file-picks a PDF
  → Frontend validates file client-side (≤10 MB, .pdf extension)
  → POST /api/contracts/upload (multipart: file + contract_type)
    → Server: pdf-parse extracts text with [PAGE N] markers
    → Server: validates ≥100 words (reject scanned PDF)
    → Server: validates ≤15,000 tokens (reject oversized)
    → Server: INSERT INTO contracts (user_id, file_name, contract_type, contract_text, page_count, token_count, status='pending')
    → Server: non-blocking upload to Supabase Storage at contracts/{user_id}/{contract_id}/{filename}.pdf
  → Frontend receives { contract_id }
  → Pre-processing preview renders:
    - Standard terms list for selected contract type (NDA: 10 terms / MSA: 12 terms)
    - "+ Add Key Term" input to add custom terms (≤5)
    - Custom terms shown with "Custom" badge in the preview list
    - Custom terms saved to custom_key_terms table on add
  → User clicks "Process Contract"
  → POST /api/contracts/process { contract_id, custom_terms: [...] }
    → Server: fetches contracts.contract_text from DB
    → Server: builds few-shot prompt (NDA or MSA) with standard + custom terms
    → Server: calls OpenAI GPT-4o (JSON mode, temp 0.1, max 2000 tokens)
    → Server: parses JSON response → validates schema
    → Server: INSERT INTO key_terms (one row per term)
    → Server: UPDATE contracts SET status='completed'
  → Frontend polls or receives response: key_terms array
  → Results page (/contracts/[id]) renders:
    - Left panel: PDF.js viewer (signed URL, 1hr expiry) OR text-viewer fallback
    - Right panel: key terms list (name / value / page / confidence, colour-coded)
    - ⚠️ flag on terms with confidence < 50%
    - Expandable "Why?" section per term (source_sentence)
    - Floating "Chat with Contract" tab
```

**Processing progress indicator (3 steps):**
1. Extracting text from PDF
2. Analysing with AI
3. Compiling results

**Low-confidence handling:**
- Confidence < 50% → ⚠️ icon + tooltip: "Low confidence — we recommend verifying this in the document directly."
- PDF viewer auto-highlights nearest matching page span
- Term is shown (never hidden)

---

### Flow 4 — Contract Chat (Q&A)

```
User clicks "Chat" tab on results page
  → Chat interface renders (chat_session created if not exists)
    → POST /api/chat/sessions { contract_id } → INSERT INTO chat_sessions → returns session_id
  → User types question (e.g. "What happens if I breach the NDA?")
  → POST /api/chat/message { contract_id, session_id, content: "..." }
    → Server: fetches all chat_messages for session (ascending, up to 200)
    → Server: classifies query (contract / history / both) — inline, no extra API call
    → Server: builds context: system prompt + contract_text + conversation history
    → Server: calls OpenAI GPT-4o (temp 0.4, max 1000 tokens)
    → Server: INSERT INTO chat_messages (user message + assistant response)
  → Response displayed in chat UI:
    - User messages: right-aligned
    - AI responses: left-aligned, prefixed "Based on the document…"
    - Each AI response includes "[Page X]" citation as a clickable link → scrolls PDF viewer
  → "I cannot find this in the document" is a valid, expected response
  → Conversation persists: revisiting /contracts/[id] reloads full chat history
```

**Hallucination safeguard:**
- System prompt: "Answer only from the document text provided. If the answer is not in the document, say so."
- Mandatory `[Page X]` citation on every response
- If model responds without a page citation, the UI appends "Source: unknown" to flag it

---

### Flow 5 — Inline Key Term Editing

```
User clicks on an extracted term value in the key terms panel
  → Inline input field renders pre-filled with current value
  → User edits value and presses Enter or clicks Save
  → PATCH /api/key-terms/[id] { value: "new value" }
    → Server: verifies auth.uid() = key_terms.user_id (ownership check)
    → Server: stores original value in ai_value (if not already stored)
    → Server: UPDATE key_terms SET value='new value', is_edited=true
  → Frontend re-renders term with "Edited" badge
  → Original AI value preserved in ai_value column for feedback loop
```

---

### Flow 6 — Dashboard History

```
User returns to /dashboard
  → Frontend: SELECT * FROM contracts WHERE user_id = auth.uid() ORDER BY created_at DESC
  → Renders sortable table: file_name | contract_type | created_at | status
  → Clicking any row → navigates to /contracts/[id]
  → Results page loads: key terms + chat history rehydrated from DB
```

---

## 5. Frontend Architecture

### Stack

| Technology | Version | Purpose |
|---|---|---|
| Next.js | 14.2.5 | App Router, server components, API routes |
| React | 18.3.1 | UI rendering |
| Tailwind CSS | 3.x | Utility-first styling, design system tokens |
| Lucide React | latest | Icon library |
| PDF.js (pdfjs-dist) | 4.x | Client-side PDF rendering |
| @supabase/supabase-js | 2.x | DB, auth, storage client |
| Zod | 3.x | Runtime schema validation (shared with backend) |

### Design System Integration

All colors, typography, spacing, and component styles must come from `docs/design.md`:

- **Brand colors:** Primary `#112E81`, Secondary `#4647AE`, Accent `#AACCD6`
- **Confidence colors:** Green (≥80%), Lime (70–79%), Amber (50–69%), Red (<50%)
- **Typography:** Inter for all UI text; JetBrains Mono for contract text display
- **Spacing:** 4px base grid
- **Border radius:** 4–12px range

### Routing

| Route | Page | Auth Required |
|---|---|---|
| `/` | Landing page | No |
| `/auth/login` | Sign-in form | No (redirects to /dashboard if authed) |
| `/auth/signup` | Sign-up form | No (redirects to /dashboard if authed) |
| `/dashboard` | Contract list + stats | Yes |
| `/upload` | Contract type + PDF upload + pre-processing | Yes |
| `/contracts/[id]` | Results: PDF viewer + key terms + chat | Yes |

**Route protection:** `middleware.ts` checks Supabase session; redirects unauthenticated users from protected routes to `/auth/login`.

### State Management

- **Auth state:** Supabase client session (managed by `@supabase/auth-helpers-nextjs`)
- **Contract review state:** React `useState` / `useReducer` local to the upload and results pages
- **Chat state:** Local `useState` for optimistic UI; messages persisted to DB and rehydrated on load
- **No global state manager** (Redux/Zustand) needed at MVP — Supabase client handles all persistence

### UX States

| State | Where | Implementation |
|---|---|---|
| Loading skeleton | Dashboard list, key terms panel | Tailwind `animate-pulse` skeleton divs |
| Empty state | Dashboard (no contracts yet) | Illustration + "Upload your first contract" CTA |
| Processing stepper | Upload page after "Process Contract" | 3-step progress indicator with animated spinner |
| Error banner | Upload failure, OpenAI timeout | Full-width dismissible banner with retry CTA |
| Low-confidence warning | Key terms panel | ⚠️ icon + non-dismissible Tooltip component |
| "Not found" chat response | Chat interface | Normal response styled differently, no page citation shown |
| Storage unavailable | Results page | Text viewer renders automatically; no error shown to user |

### Page and Component Hierarchy

```
app/layout.jsx                    ← Root layout: Nav, Supabase Auth provider, font imports
├── app/page.jsx                  ← Landing page (Hero, Features, Pricing, CTA)
├── app/(auth)/
│   ├── login/page.jsx            ← LoginPage
│   └── signup/page.jsx           ← SignupPage
└── app/(protected)/
    ├── dashboard/page.jsx        ← DashboardPage
    │   ├── components/dashboard/StatCard.jsx
    │   ├── components/dashboard/ContractTable.jsx
    │   └── components/dashboard/EmptyState.jsx
    ├── upload/page.jsx           ← UploadPage
    │   ├── components/upload/ContractTypeSelector.jsx
    │   ├── components/upload/DropZone.jsx
    │   ├── components/upload/TermPreviewList.jsx
    │   ├── components/upload/CustomTermInput.jsx
    │   └── components/upload/ProcessingProgress.jsx
    └── contracts/[id]/page.jsx  ← ResultsPage
        ├── components/viewer/PDFViewer.jsx
        ├── components/viewer/TextViewerFallback.jsx
        ├── components/contracts/KeyTermsPanel.jsx
        │   ├── components/contracts/KeyTermCard.jsx
        │   │   ├── components/contracts/ConfidenceBar.jsx
        │   │   └── components/contracts/SourceSentence.jsx
        │   └── components/contracts/FeedbackWidget.jsx
        └── components/chat/ChatInterface.jsx
            └── components/chat/MessageBubble.jsx
```

**Shared UI primitives** (`components/ui/`):
`Button`, `Badge`, `Tooltip`, `Input`, `Textarea`, `Modal`, `Spinner`, `Banner`, `Skeleton`

### Accessibility

- WCAG 2.1 AA compliance target
- All interactive elements keyboard-navigable with visible focus ring
- Confidence colour coding supplemented by icon (⚠️) — not colour alone
- Legal jargon tooltipped inline (hover/focus reveals plain-English explanation)
- `aria-live` regions on chat response area and processing stepper

---

## 6. Backend Architecture

### Stack

- **Runtime:** Node.js (Vercel serverless functions via Next.js API Routes)
- **Framework:** Next.js 14 API Routes (`app/api/**/route.ts`)
- **DB client:** `@supabase/supabase-js` (server-side, using service role key for writes; anon key for auth-gated reads)
- **PDF parsing:** `pdf-parse` (Node.js)
- **AI client:** `openai` npm package
- **Validation:** Zod
- **Environment:** `.env.local` (never committed); `.env.example` documents all required vars

### Core Services

```
lib/
├── supabase/
│   ├── client.ts          ← Browser client (anon key, used in Client Components)
│   └── server.ts          ← Server client (service role key, used in API routes only)
├── pdf/
│   └── extractor.ts       ← pdf-parse wrapper: returns { text, pageCount, wordCount, tokenCount }
│                              Injects [PAGE N] markers; throws if wordCount < 100 or tokenCount > 15000
├── ai/
│   ├── extraction.ts      ← buildExtractionPrompt() + callExtraction() + parseExtractionResponse()
│   ├── chat.ts            ← buildChatMessages() + callChat() with full context + history
│   ├── classifier.ts      ← classifyQuery(message) → 'contract' | 'history' | 'both'
│   └── prompts/
│       ├── nda-extraction.ts   ← System prompt + 3 few-shot NDA examples + NDA term list
│       ├── msa-extraction.ts   ← System prompt + 3 few-shot MSA examples + MSA term list
│       └── chat-system.ts      ← Chat system prompt (document-only instruction)
├── validation/
│   ├── upload.schema.ts        ← Zod: file size, type, contract_type enum
│   ├── process.schema.ts       ← Zod: contract_id, custom_terms (max 5, each ≤ 100 chars)
│   ├── key-term.schema.ts      ← Zod: value (non-empty, ≤ 1000 chars)
│   ├── chat.schema.ts          ← Zod: contract_id, session_id, message (non-empty, ≤ 4000 chars)
│   └── feedback.schema.ts      ← Zod: contract_id, rating enum, comment (optional, ≤ 2000 chars)
└── constants.ts
    ├── MAX_FILE_SIZE_MB = 10
    ├── MAX_PAGES = 20
    ├── MAX_TOKEN_COUNT = 15000
    ├── MIN_WORD_COUNT = 100
    ├── MAX_CUSTOM_TERMS = 5
    ├── CONFIDENCE_THRESHOLD_LOW = 50
    ├── CONFIDENCE_THRESHOLD_HIGH = 80
    ├── OPENAI_EXTRACTION_TEMP = 0.1
    ├── OPENAI_CHAT_TEMP = 0.4
    ├── OPENAI_EXTRACTION_MAX_TOKENS = 2000
    ├── OPENAI_CHAT_MAX_TOKENS = 1000
    ├── SIGNED_URL_EXPIRY_SECONDS = 3600
    └── MAX_CHAT_HISTORY = 200
```

### OpenAI Error Handling

```
Attempt 1 → OpenAI API call
  → Success → parse JSON response → continue
  → JSON parse failure → Attempt 2 with corrective prompt:
      "Your previous response was not valid JSON. Return only the JSON array, no explanation."
  → Success → continue
  → Failure → Attempt 3 (same corrective prompt)
  → Failure → UPDATE contracts SET status='error'
              → Return 504 with { error: "AI processing failed. Please try again." }
              → Frontend shows error banner with "Try again" button (user can retry without re-uploading)
```

### Service Interaction Diagram

```
Browser (React)
    │
    ├── Supabase JS client ──────────────────── Supabase Auth
    │   (auth, realtime reads)                   Supabase DB (RLS reads)
    │
    └── Fetch (API routes)
            │
            └── Next.js API Routes (Vercel)
                    │
                    ├── lib/pdf/extractor.ts ──── pdf-parse (Node.js)
                    │
                    ├── lib/ai/extraction.ts ───── OpenAI GPT-4o API
                    ├── lib/ai/chat.ts ──────────── OpenAI GPT-4o API
                    │
                    └── lib/supabase/server.ts ─── Supabase DB (writes)
                                                    Supabase Storage (PDF upload)
```

---

## 7. Database Design and Schema

### Overview

Single Supabase project; all tables in the `public` schema. Supabase Auth manages `auth.users` — all application tables reference `auth.users.id` via `user_id` FK. RLS is enabled on every table.

---

### Table: `contracts`

**Purpose:** Stores uploaded contract metadata, extracted text, and processing status.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `user_id` | `uuid` | NOT NULL, FK → `auth.users(id)` ON DELETE CASCADE | |
| `file_name` | `text` | NOT NULL | Original uploaded filename |
| `contract_type` | `text` | NOT NULL, CHECK IN ('nda','msa') | |
| `contract_text` | `text` | NOT NULL | Full text with `[PAGE N]` markers; used by all AI pipelines |
| `file_path` | `text` | NULLABLE | `contracts/{user_id}/{id}/{filename}.pdf`; null if Storage upload failed |
| `page_count` | `integer` | NOT NULL | |
| `token_count` | `integer` | NOT NULL | Approximate token count for cost tracking |
| `status` | `text` | NOT NULL, CHECK IN ('pending','processing','completed','error'), default 'pending' | |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |
| `last_accessed_at` | `timestamptz` | NOT NULL, default `now()` | Updated on each page visit; used for 90-day retention policy |

**Indexes:**
- `idx_contracts_user_id ON contracts(user_id)`
- `idx_contracts_user_id_created_at ON contracts(user_id, created_at DESC)` — dashboard list query

**RLS Policies:**
- `SELECT`: `auth.uid() = user_id`
- `INSERT`: `auth.uid() = user_id`
- `UPDATE`: `auth.uid() = user_id`
- `DELETE`: `auth.uid() = user_id`

---

### Table: `key_terms`

**Purpose:** Stores every extracted key term (standard or custom) for a contract.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `contract_id` | `uuid` | NOT NULL, FK → `contracts(id)` ON DELETE CASCADE | |
| `user_id` | `uuid` | NOT NULL, FK → `auth.users(id)` ON DELETE CASCADE | Denormalised for RLS |
| `term_name` | `text` | NOT NULL | e.g. "Governing Law", "Liability Cap" |
| `value` | `text` | NOT NULL | Current value (may be user-edited) |
| `ai_value` | `text` | NULLABLE | Original AI-extracted value; set on first user edit |
| `page_number` | `integer` | NOT NULL | 1-indexed page number |
| `confidence_score` | `numeric(5,2)` | NOT NULL, CHECK BETWEEN 0 AND 100 | e.g. 87.50 |
| `source_sentence` | `text` | NOT NULL | Verbatim sentence from contract used to extract value |
| `is_manual` | `boolean` | NOT NULL, default false | true for user-defined custom terms |
| `is_edited` | `boolean` | NOT NULL, default false | true after user edits the value |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |

**Indexes:**
- `idx_key_terms_contract_id ON key_terms(contract_id)`
- `idx_key_terms_user_id ON key_terms(user_id)`

**RLS Policies:**
- `SELECT`: `auth.uid() = user_id`
- `INSERT`: `auth.uid() = user_id`
- `UPDATE`: `auth.uid() = user_id`
- `DELETE`: `auth.uid() = user_id`

---

### Table: `custom_key_terms`

**Purpose:** Stores user-defined key terms added before processing. These are consumed by the extraction pipeline and result in `key_terms` rows with `is_manual = true`.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `contract_id` | `uuid` | NOT NULL, FK → `contracts(id)` ON DELETE CASCADE | |
| `user_id` | `uuid` | NOT NULL, FK → `auth.users(id)` ON DELETE CASCADE | |
| `term_name` | `text` | NOT NULL | User-provided term name |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |

**Constraint:** Max 5 custom terms per contract enforced at API level (not DB level).

**Indexes:**
- `idx_custom_key_terms_contract_id ON custom_key_terms(contract_id)`

**RLS Policies:** Same pattern as `key_terms`.

---

### Table: `chat_sessions`

**Purpose:** Groups chat messages per contract. One session per contract at MVP.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `contract_id` | `uuid` | NOT NULL, FK → `contracts(id)` ON DELETE CASCADE, UNIQUE | One session per contract |
| `user_id` | `uuid` | NOT NULL, FK → `auth.users(id)` ON DELETE CASCADE | |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |

**Indexes:**
- `idx_chat_sessions_contract_id ON chat_sessions(contract_id)`

**RLS Policies:** Same pattern.

---

### Table: `chat_messages`

**Purpose:** Stores every message in a chat session (user questions + AI responses).

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `session_id` | `uuid` | NOT NULL, FK → `chat_sessions(id)` ON DELETE CASCADE | |
| `user_id` | `uuid` | NOT NULL, FK → `auth.users(id)` ON DELETE CASCADE | |
| `role` | `text` | NOT NULL, CHECK IN ('user', 'assistant') | |
| `content` | `text` | NOT NULL | |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |

**Indexes:**
- `idx_chat_messages_session_id_created_at ON chat_messages(session_id, created_at ASC)` — fetch all messages in order

**RLS Policies:** Same pattern.

---

### Table: `user_feedback`

**Purpose:** Stores post-review feedback (thumbs up/down + optional comment).

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `contract_id` | `uuid` | NOT NULL, FK → `contracts(id)` ON DELETE CASCADE | |
| `user_id` | `uuid` | NOT NULL, FK → `auth.users(id)` ON DELETE CASCADE | |
| `rating` | `text` | NOT NULL, CHECK IN ('thumbs_up', 'thumbs_down') | |
| `comment` | `text` | NULLABLE | Optional free-text comment |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |

**RLS Policies:** Same pattern.

---

### Table: `rate_limit_events`

**Purpose:** Sliding-window rate limiting — one row per API call per user per endpoint; old rows pruned periodically.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `user_id` | `uuid` | NOT NULL, FK → `auth.users(id)` ON DELETE CASCADE | |
| `endpoint` | `text` | NOT NULL | e.g. 'contracts/process', 'chat/message' |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |

**Indexes:**
- `idx_rate_limit_events_user_endpoint_created ON rate_limit_events(user_id, endpoint, created_at DESC)`

**Rate limits (MVP):**
- `contracts/process`: 20 requests / user / hour
- `chat/message`: 60 requests / user / hour

**RLS Policies:**
- `SELECT`: `auth.uid() = user_id`
- `INSERT`: `auth.uid() = user_id`

---

### Supabase Storage

**Bucket:** `contracts` (created via SQL — `INSERT INTO storage.buckets`)

**File path pattern:** `contracts/{user_id}/{contract_id}/{filename}.pdf`

**Signed URL expiry:** 3600 seconds (1 hour)

**Storage RLS Policies (on `storage.objects`):**
- `INSERT`: `auth.uid()::text = (storage.foldername(name))[1]`
- `SELECT`: `auth.uid()::text = (storage.foldername(name))[1]`
- `DELETE`: `auth.uid()::text = (storage.foldername(name))[1]`

**Non-blocking behaviour:** Storage upload happens after text extraction and DB insert. If Storage upload fails, `contracts.file_path` remains null; the PDF viewer is hidden; the text-viewer fallback renders automatically. The AI pipeline is unaffected.

**Data retention:** PDFs auto-deleted after 90 days from `last_accessed_at`. Users can delete a contract (and all associated data) from the dashboard — this triggers CASCADE deletes across all tables and a Storage object deletion.

---

### Entity Relationship Diagram

```
auth.users
    │
    ├──< contracts (user_id)
    │       │
    │       ├──< key_terms (contract_id)
    │       ├──< custom_key_terms (contract_id)
    │       ├──< user_feedback (contract_id)
    │       └──< chat_sessions (contract_id, UNIQUE)
    │                   │
    │                   └──< chat_messages (session_id)
    │
    └──< rate_limit_events (user_id)
```

---

## 8. AI Architecture

### LLM Provider

**Provider:** OpenAI  
**Model:** GPT-4o  
**Context window:** 128,000 tokens  
**API mode:** `response_format: { type: "json_object" }` for extraction; standard text for chat  

---

### Key Term Extraction

**Goal:** Extract a structured list of key terms from the contract text.

**Technique:** Few-shot prompting — 3 labelled NDA examples and 3 labelled MSA examples embedded in the system prompt.

**Parameters:**
| Parameter | Value |
|---|---|
| `model` | `gpt-4o` |
| `temperature` | `0.1` |
| `max_tokens` | `2000` |
| `response_format` | `{ type: "json_object" }` |

**Input to model:**
```
System prompt: [Contract-type-specific few-shot examples + extraction instruction]
User message: [Full contract text with [PAGE N] markers] + [Standard term list] + [Custom terms list (if any)]
```

**Output schema:**
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

**NDA standard terms (10):**
Parties, Effective Date, Confidentiality Obligations, Permitted Disclosures, Term & Duration, Governing Law, Jurisdiction, IP Ownership, Non-Solicitation, Breach & Remedy

**MSA standard terms (12):**
Parties, Service Scope, Payment Terms, Invoice Schedule, Late Payment Penalty, Liability Cap, Indemnification, IP Ownership, Termination Clause, Governing Law, Dispute Resolution, Notice Period

**Custom terms:** Appended to the standard term list in the user message with the instruction: "Also extract the following additional terms: [term1, term2, ...]"

**Error recovery (JSON parse failure):**
```
Attempt 1 → call extraction
Attempt 2 (if JSON parse fails) → retry with corrective prompt:
  "Your previous response was not valid JSON. Return only a JSON object with a 'terms' array, no explanation."
Attempt 3 (if still failing) → return 504, set contracts.status = 'error'
```

---

### Contract Chat (Q&A)

**Goal:** Answer user questions strictly from the uploaded contract text; cite the page number.

**Technique:** Full-context (no chunking at MVP) — entire `contract_text` passed on every turn.

**Parameters:**
| Parameter | Value |
|---|---|
| `model` | `gpt-4o` |
| `temperature` | `0.4` |
| `max_tokens` | `1000` |

**System prompt:**
```
You are a contract analysis assistant. Answer questions strictly from the document text provided below.
Do not use any general legal knowledge. If the answer is not in the document, say exactly:
"I cannot find this in the document."
Every response must end with a source citation in the format: [Page X]
Begin every response with: "Based on the document, ..."
```

**Message structure sent to OpenAI:**
```
[system] → system prompt + full contract_text
[user]   → first user message
[assistant] → first AI response
...
[user]   → latest user message (up to 200 messages total)
```

**Query classification** (`lib/ai/classifier.ts`):
- `contract` — question is about the document (default)
- `history` — question is about the conversation itself ("what did you say earlier about X?")
- `both` — mixed reference
Classification is a simple keyword/pattern match inline in the classifier; no extra OpenAI call.

---

### Confidence Scoring

- Confidence is **self-reported** by the model as part of the extraction JSON (0.0–100.0 scale)
- No separate inference call for confidence
- UI colour coding: Green ≥ 80%, Amber 50–79%, Red < 50%
- Terms with confidence < 50%: ⚠️ icon, non-dismissible tooltip, PDF auto-highlight

---

### Cost Controls

| Control | Value |
|---|---|
| Max contract size | 15,000 tokens (hard reject) |
| Max custom terms | 5 per analysis |
| Max extraction output | 2,000 tokens |
| Max chat output | 1,000 tokens |
| Rate limit (extraction) | 20 calls/user/hour |
| Rate limit (chat) | 60 calls/user/hour |
| Target cost per analysis | ≤ $0.25 ($0.20 extraction + $0.05 buffer) |

**Cost estimate per analysis (GPT-4o):**
- Input: ~15,000 tokens × $0.005/1k = $0.075
- Output: ~1,500 tokens × $0.015/1k = $0.022
- **Total extraction: ~$0.097** (well within $0.20 target)

---

### Hallucination Guardrails Summary

| Layer | Guardrail |
|---|---|
| Extraction | Temperature 0.1 + JSON mode → minimises fabrication |
| Extraction | `source_sentence` required — term without source treated as unreliable |
| Extraction | Self-reported confidence score shown; < 50% triggers ⚠️ warning |
| Chat | System prompt: "Answer only from the document text" |
| Chat | Mandatory `[Page X]` citation per response |
| Chat | "Based on the document..." prefix |
| Chat | "I cannot find this in the document" is the correct response when absent |
| UI | Inline edit corrects AI errors; original `ai_value` preserved for improvement loop |
| UI | "Not legal advice" disclaimer on every results page |
| Testing | Automated regression test: question about topic not in doc → assert "cannot find" response |

---

## 9. API Specification

All endpoints:
- Base URL: `/api`
- Auth: Bearer token via Supabase session (verified via `supabase.auth.getUser()` in each route)
- Content-Type: `application/json` unless noted
- All responses: `{ data: ..., error: null }` on success / `{ data: null, error: { code, message } }` on failure

---

### POST `/api/contracts/upload`

**Purpose:** Validate and upload a PDF contract; extract text; create DB record.  
**Auth:** Required  
**Content-Type:** `multipart/form-data`

**Request fields:**
| Field | Type | Validation |
|---|---|---|
| `file` | `File` (PDF) | Required; ≤10 MB; `.pdf` extension; text-layer (validated post-extraction) |
| `contract_type` | `string` | Required; enum: `nda` \| `msa` |

**Processing steps:**
1. Validate file size (≤10 MB) and extension
2. `pdf-parse` extracts text + page count
3. If word count < 100 → reject (scanned PDF)
4. If token count > 15,000 → reject (too long)
5. `INSERT INTO contracts` (status = `'pending'`)
6. Non-blocking: upload PDF to Supabase Storage; update `file_path` if successful
7. Return `contract_id`

**Success Response (201):**
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

**Error Responses:**
| Status | Code | Message |
|---|---|---|
| 400 | `FILE_TOO_LARGE` | "File exceeds the 10 MB limit." |
| 400 | `TOO_MANY_PAGES` | "Contract exceeds the 20-page limit." |
| 400 | `SCANNED_PDF` | "Scanned PDFs are not supported yet. Please upload a text-layer PDF." |
| 400 | `CONTRACT_TOO_LONG` | "Contract exceeds the 15,000 token limit for MVP." |
| 400 | `INVALID_FILE_TYPE` | "Only PDF files are accepted." |
| 400 | `INVALID_CONTRACT_TYPE` | "contract_type must be 'nda' or 'msa'." |
| 401 | `UNAUTHORIZED` | "Authentication required." |
| 500 | `INTERNAL_ERROR` | "Upload failed. Please try again." |

---

### POST `/api/contracts/process`

**Purpose:** Run AI key-term extraction on an uploaded contract.  
**Auth:** Required

**Request body:**
```json
{
  "contract_id": "uuid",
  "custom_terms": ["Non-compete radius", "Arbitration clause"]
}
```

**Validation:**
- `contract_id`: UUID, must exist and belong to authenticated user
- `custom_terms`: Array, max 5 items, each ≤100 chars (optional)

**Processing steps:**
1. Fetch `contract_text` and `contract_type` from `contracts` table (verify ownership)
2. Fetch any pre-saved `custom_key_terms` for this contract
3. Merge request `custom_terms` with DB custom terms (deduplicate)
4. `UPDATE contracts SET status = 'processing'`
5. Build few-shot prompt (NDA or MSA prompt template)
6. Call OpenAI GPT-4o with retry logic (max 3 attempts)
7. Parse JSON response → validate schema (Zod)
8. `INSERT INTO key_terms` (one row per term; `is_manual = true` for custom terms)
9. `UPDATE contracts SET status = 'completed'`
10. Return key_terms array

**Success Response (200):**
```json
{
  "data": {
    "key_terms": [
      {
        "id": "uuid",
        "term_name": "Governing Law",
        "value": "Laws of New York",
        "page_number": 4,
        "confidence_score": 92.5,
        "source_sentence": "This Agreement shall be governed by the laws of New York.",
        "is_manual": false,
        "is_edited": false
      }
    ]
  },
  "error": null
}
```

**Error Responses:**
| Status | Code | Message |
|---|---|---|
| 400 | `TOO_MANY_CUSTOM_TERMS` | "Maximum 5 custom terms allowed." |
| 401 | `UNAUTHORIZED` | "Authentication required." |
| 403 | `FORBIDDEN` | "Contract does not belong to this user." |
| 404 | `CONTRACT_NOT_FOUND` | "Contract not found." |
| 429 | `RATE_LIMIT_EXCEEDED` | "Too many requests. Please wait before processing another contract." |
| 504 | `AI_TIMEOUT` | "AI processing timed out. Your contract has been saved — please try again." |
| 500 | `AI_ERROR` | "AI processing failed. Please try again." |

---

### GET `/api/contracts/[id]`

**Purpose:** Fetch a contract with its key terms and chat session.  
**Auth:** Required

**Response (200):**
```json
{
  "data": {
    "contract": {
      "id": "uuid",
      "file_name": "acme-nda.pdf",
      "contract_type": "nda",
      "status": "completed",
      "page_count": 8,
      "created_at": "2026-07-14T10:00:00Z",
      "signed_url": "https://...(1-hour expiry) or null if Storage unavailable"
    },
    "key_terms": [...],
    "chat_session": { "id": "uuid" }
  },
  "error": null
}
```

**Notes:** `signed_url` is generated server-side (Supabase Storage `createSignedUrl`); null if `file_path` is null or Storage is unavailable.

---

### PATCH `/api/key-terms/[id]`

**Purpose:** Update an extracted key term (inline edit).  
**Auth:** Required

**Request body:**
```json
{ "value": "New York State" }
```

**Validation:**
- `value`: string, non-empty, ≤1000 chars

**Processing:**
1. Verify `key_terms.user_id = auth.uid()`
2. If `is_edited = false`: store current `value` in `ai_value`
3. `UPDATE key_terms SET value='...', is_edited=true`

**Success Response (200):**
```json
{
  "data": { "id": "uuid", "value": "New York State", "is_edited": true, "ai_value": "Laws of New York" },
  "error": null
}
```

---

### POST `/api/chat/sessions`

**Purpose:** Get or create a chat session for a contract.  
**Auth:** Required

**Request body:**
```json
{ "contract_id": "uuid" }
```

**Processing:** `INSERT INTO chat_sessions ... ON CONFLICT (contract_id) DO NOTHING` — returns existing or new session.

**Success Response (200):**
```json
{ "data": { "session_id": "uuid" }, "error": null }
```

---

### POST `/api/chat/message`

**Purpose:** Send a chat message and get an AI response.  
**Auth:** Required

**Request body:**
```json
{
  "contract_id": "uuid",
  "session_id": "uuid",
  "content": "What happens if I breach the NDA?"
}
```

**Validation:**
- `content`: string, non-empty, ≤4000 chars

**Processing:**
1. Verify contract ownership
2. Sanitise `content` for prompt injection (strip `###`, `<|`, system-marker patterns)
3. Fetch all `chat_messages` for session (ascending, up to 200)
4. Classify query → `'contract' | 'history' | 'both'`
5. Build OpenAI messages array (system + contract_text + history + new user message)
6. Call GPT-4o (temp 0.4, max 1000 tokens)
7. `INSERT INTO chat_messages` (user message + assistant response)
8. Return assistant response

**Success Response (200):**
```json
{
  "data": {
    "message_id": "uuid",
    "content": "Based on the document, breach of confidentiality obligations triggers... [Page 3]",
    "created_at": "2026-07-14T10:05:00Z"
  },
  "error": null
}
```

**Error Responses:**
| Status | Code | Message |
|---|---|---|
| 400 | `INJECTION_DETECTED` | "Invalid message content." |
| 429 | `RATE_LIMIT_EXCEEDED` | "Too many chat messages. Please wait a moment." |
| 504 | `CHAT_TIMEOUT` | "Response timed out. Please try again." |

---

### GET `/api/chat/[sessionId]/messages`

**Purpose:** Fetch all messages for a chat session (for rehydrating chat on page load).  
**Auth:** Required

**Response (200):**
```json
{
  "data": {
    "messages": [
      { "id": "uuid", "role": "user", "content": "...", "created_at": "..." },
      { "id": "uuid", "role": "assistant", "content": "...", "created_at": "..." }
    ]
  },
  "error": null
}
```

---

### POST `/api/feedback`

**Purpose:** Submit a thumbs up/down rating and optional comment for a contract review.  
**Auth:** Required

**Request body:**
```json
{
  "contract_id": "uuid",
  "rating": "thumbs_up",
  "comment": "Really helped me spot the auto-renewal clause!"
}
```

**Validation:**
- `rating`: enum `'thumbs_up' | 'thumbs_down'`
- `comment`: optional string, ≤2000 chars

**Success Response (201):**
```json
{ "data": { "feedback_id": "uuid" }, "error": null }
```

---

## 10. Feature Breakdown

### Phase 1 — MVP Core (P0 Stories)

**US-001 — Authentication**
- Sign up (email/password), sign in, sign out via Supabase Auth
- Session persistence via Supabase session tokens
- Protected routes via `middleware.ts`
- Acceptance: Auth flow completes within 10 seconds; invalid credentials return clear error
- Dependencies: Supabase project provisioned

**US-002 — PDF Upload + Text Extraction**
- Upload page: contract type dropdown + drag-and-drop / file picker
- Client-side validation (≤10 MB, .pdf extension)
- Server-side: pdf-parse extraction with `[PAGE N]` markers
- Scanned PDF detection (< 100 words) → graceful error
- Token limit check (> 15,000 tokens) → clear rejection message
- Non-blocking Storage upload; text stored in DB regardless
- Acceptance: Accepts ≤10 MB, ≤20 pages; extraction completes ≤30s P95
- Dependencies: pdf-parse, Supabase Storage bucket with RLS

**US-003 — Page Attribution**
- Each extracted term includes a `page_number` (1-indexed)
- Clicking the page number in the key terms panel scrolls the PDF viewer to that page
- Text viewer fallback also supports page navigation
- Acceptance: Every extracted term displays a page number; clicking scrolls the viewer
- Dependencies: US-002, PDFViewer component, TextViewerFallback component

**US-004 — Confidence Score Display**
- Each term shows a colour-coded confidence score (0–100%)
- Green ≥ 80%, Amber 50–79%, Red < 50%
- Terms with confidence < 50%: ⚠️ icon + non-dismissible tooltip + PDF auto-highlight
- "Why?" expandable section shows `source_sentence`
- Acceptance: Scores shown per term; < 50% triggers ⚠️ with tooltip
- Dependencies: US-002, OpenAI extraction returning `confidence_score`

**US-005 — Custom Key Terms**
- "+ Add Key Term" button on pre-processing preview page
- Up to 5 custom terms; each shows with "Custom" badge in preview list
- Custom terms stored in `custom_key_terms` table
- Extraction prompt includes custom terms alongside standard terms
- Results include custom terms with same structure (value, page, confidence, source_sentence)
- Acceptance: Custom terms appear in results with same data structure; max 5 enforced
- Dependencies: US-002, extraction pipeline

**US-011-partial — Key Terms Panel**
- Two-panel results layout: PDF viewer (left) + key terms panel (right)
- Each term card: term name, value, page number, colour-coded confidence
- Expandable "Why?" section with source sentence
- "Not legal advice" disclaimer below panel
- Acceptance: Panel shows ≥ 80% of standard NDA/MSA terms with values
- Dependencies: US-002, US-003, US-004

---

### Phase 2 — MVP Enriched (P1 Stories)

**US-006 — Inline PDF Viewer**
- PDF.js renders uploaded PDF from Supabase Storage signed URL (1-hour expiry)
- Scrollable, zoomable; lazy page loading for performance
- Text-viewer fallback: parses `[PAGE N]` markers from `contract_text`; renders each page as labelled section
- Both viewers respond to `targetPage` prop from key-term click events
- "Download PDF" fallback link if PDF.js rendering fails
- Acceptance: PDF viewer renders all pages; scroll, zoom work; highlighted term references clickable
- Dependencies: Supabase Storage, PDF.js, `file_path` in contracts table

**US-007 — Contract Chat**
- Chat tab on results page
- User messages right-aligned; AI responses left-aligned with "Based on the document..." prefix
- Full contract context passed on every turn (no chunking at MVP)
- Mandatory `[Page X]` citation on every AI response
- "I cannot find this in the document" for absent information
- Page citation is a clickable link → scrolls PDF viewer
- Acceptance: Chat responds ≤15s; responses grounded in document; page citation on every response
- Dependencies: US-002, chat_sessions + chat_messages tables, GPT-4o

**US-012 — Persistent Chat History**
- Chat messages stored in `chat_messages` table in real-time
- Revisiting `/contracts/[id]` loads full previous conversation
- Acceptance: Chat history persists; reopening loads previous session
- Dependencies: US-007, GET /api/chat/[sessionId]/messages

**US-008 — Dashboard & Contract History**
- Dashboard shows: total contracts, NDA count, MSA count
- Sortable list: contract name, type, date uploaded, status
- Clickable rows → open results page for that contract
- Key terms and chat rehydrated from DB on results page load
- Empty state for new users
- Acceptance: Dashboard displays all contracts; clicking opens results page
- Dependencies: contracts table, key_terms table, chat_sessions table

**US-009 — Inline Key Term Editing**
- Click any term value → inline input appears
- Save → PATCH request; term shows "Edited" badge; original `ai_value` preserved
- Acceptance: Inline edit saves ≤2 seconds; "Edited" badge shown; original AI value stored
- Dependencies: key_terms table (`ai_value`, `is_edited` columns), PATCH /api/key-terms/[id]

---

### Phase 3 — Backlog (P2 Stories)

**US-010 — Feedback Submission**
- Thumbs up / thumbs down widget on results page
- Optional text comment
- Stored in `user_feedback` table
- Acceptance: Feedback saved; thumbs appear on every results page
- Dependencies: user_feedback table, POST /api/feedback

**US-011 — Export Key Terms**
- Export button → generates CSV or formatted PDF within 5 seconds
- Downloads to browser
- Acceptance: File downloads within 5 seconds
- Dependencies: US-011-partial; CSV generation library
- **Deferred to v1.1**

---

## 11. Folder Structure

```
contractiq/
├── app/
│   ├── (auth)/                          ← Unauthenticated routes
│   │   ├── login/
│   │   │   └── page.jsx                 ← LoginPage
│   │   └── signup/
│   │       └── page.jsx                 ← SignupPage
│   ├── (protected)/                     ← Auth-required routes (middleware guards)
│   │   ├── dashboard/
│   │   │   └── page.jsx                 ← DashboardPage
│   │   ├── upload/
│   │   │   └── page.jsx                 ← UploadPage (type select + PDF drop + preview)
│   │   └── contracts/
│   │       └── [id]/
│   │           └── page.jsx             ← ResultsPage (viewer + key terms + chat)
│   ├── api/
│   │   ├── contracts/
│   │   │   ├── upload/
│   │   │   │   └── route.ts             ← POST /api/contracts/upload
│   │   │   ├── process/
│   │   │   │   └── route.ts             ← POST /api/contracts/process
│   │   │   └── [id]/
│   │   │       └── route.ts             ← GET /api/contracts/[id]
│   │   ├── key-terms/
│   │   │   └── [id]/
│   │   │       └── route.ts             ← PATCH /api/key-terms/[id]
│   │   ├── chat/
│   │   │   ├── sessions/
│   │   │   │   └── route.ts             ← POST /api/chat/sessions
│   │   │   ├── message/
│   │   │   │   └── route.ts             ← POST /api/chat/message
│   │   │   └── [sessionId]/
│   │   │       └── messages/
│   │   │           └── route.ts         ← GET /api/chat/[sessionId]/messages
│   │   └── feedback/
│   │       └── route.ts                 ← POST /api/feedback
│   ├── layout.jsx                       ← Root layout: Nav, Auth provider, fonts
│   ├── page.jsx                         ← Landing page (unauthenticated)
│   └── globals.css                      ← Tailwind directives + CSS custom properties
│
├── components/
│   ├── ui/                              ← Reusable design-system primitives
│   │   ├── Button.jsx
│   │   ├── Badge.jsx
│   │   ├── Tooltip.jsx
│   │   ├── Input.jsx
│   │   ├── Textarea.jsx
│   │   ├── Modal.jsx
│   │   ├── Spinner.jsx
│   │   ├── Banner.jsx
│   │   └── Skeleton.jsx
│   ├── contracts/                       ← Key terms display components
│   │   ├── KeyTermsPanel.jsx
│   │   ├── KeyTermCard.jsx
│   │   ├── ConfidenceBar.jsx
│   │   ├── SourceSentence.jsx           ← Expandable "Why?" section
│   │   └── FeedbackWidget.jsx
│   ├── upload/                          ← Upload flow components
│   │   ├── ContractTypeSelector.jsx
│   │   ├── DropZone.jsx
│   │   ├── TermPreviewList.jsx          ← Pre-processing standard term preview
│   │   ├── CustomTermInput.jsx
│   │   └── ProcessingProgress.jsx       ← 3-step progress stepper
│   ├── viewer/                          ← PDF and text viewers
│   │   ├── PDFViewer.jsx               ← PDF.js wrapper; accepts targetPage prop
│   │   └── TextViewerFallback.jsx       ← Parses [PAGE N] markers; accepts targetPage prop
│   ├── chat/                            ← Chat interface components
│   │   ├── ChatInterface.jsx
│   │   └── MessageBubble.jsx
│   ├── dashboard/                       ← Dashboard components
│   │   ├── ContractTable.jsx
│   │   ├── StatCard.jsx
│   │   └── EmptyState.jsx
│   └── layout/                         ← Navigation and layout
│       └── Nav.jsx
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts                    ← Browser Supabase client (anon key)
│   │   └── server.ts                    ← Server Supabase client (service role key)
│   ├── pdf/
│   │   └── extractor.ts                 ← pdf-parse wrapper
│   ├── ai/
│   │   ├── extraction.ts                ← Extraction orchestration + retry logic
│   │   ├── chat.ts                      ← Chat orchestration + context building
│   │   ├── classifier.ts                ← Query type classification
│   │   └── prompts/
│   │       ├── nda-extraction.ts        ← NDA few-shot system prompt + term list
│   │       ├── msa-extraction.ts        ← MSA few-shot system prompt + term list
│   │       └── chat-system.ts           ← Chat system prompt
│   ├── validation/
│   │   ├── upload.schema.ts
│   │   ├── process.schema.ts
│   │   ├── key-term.schema.ts
│   │   ├── chat.schema.ts
│   │   └── feedback.schema.ts
│   └── constants.ts                     ← All numeric/string constants
│
├── middleware.ts                         ← Supabase session check; protect /dashboard, /upload, /contracts/*
│
├── public/
│   └── fonts/                           ← Inter + JetBrains Mono font files (or Google Fonts import)
│
├── .env.example                         ← All required env vars
├── .env.local                           ← Local values (gitignored)
├── next.config.mjs
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## 12. Naming Conventions

### Files and Folders

| Category | Convention | Example |
|---|---|---|
| Page files | `page.jsx` | `app/(protected)/dashboard/page.jsx` |
| API routes | `route.ts` | `app/api/contracts/upload/route.ts` |
| Components | PascalCase `.jsx` | `KeyTermsPanel.jsx`, `PDFViewer.jsx` |
| Lib modules | kebab-case `.ts` | `extractor.ts`, `chat-system.ts` |
| Schema files | kebab-case + `.schema.ts` suffix | `upload.schema.ts` |
| Prompt files | kebab-case `.ts` | `nda-extraction.ts` |
| Route folders | kebab-case | `key-terms/`, `chat-system/` |

### Components

- **React components:** PascalCase (`KeyTermCard`, `ConfidenceBar`, `TextViewerFallback`)
- **Custom hooks:** `use` prefix + PascalCase (`useContractData`, `usePDFViewer`, `useChatSession`)
- **Context providers:** PascalCase + `Provider` suffix (`AuthProvider`, `ContractProvider`)

### API Routes

- **REST nouns, plural, kebab-case:** `/api/key-terms/[id]`, `/api/chat/sessions`, `/api/user-feedback`
- **Path parameters:** camelCase in brackets: `[id]`, `[sessionId]`

### Database

- **Tables:** snake_case, plural (`contracts`, `key_terms`, `chat_messages`, `rate_limit_events`)
- **Columns:** snake_case (`contract_id`, `confidence_score`, `is_edited`, `ai_value`)
- **Indexes:** `idx_{table}_{columns}` (`idx_contracts_user_id`, `idx_chat_messages_session_id_created_at`)
- **RLS policies:** descriptive string (`"Users can view own contracts"`, `"Users can insert own key_terms"`)

### Environment Variables

- **Server-only:** `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **Client-safe (NEXT_PUBLIC_):** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Feature config:** `NEXT_PUBLIC_MAX_FILE_SIZE_MB`, `NEXT_PUBLIC_MAX_PAGES`

### Constants (`lib/constants.ts`)

- SCREAMING_SNAKE_CASE: `MAX_FILE_SIZE_MB`, `MAX_PAGES`, `MAX_CUSTOM_TERMS`, `CONFIDENCE_THRESHOLD_LOW`, `CONFIDENCE_THRESHOLD_HIGH`, `OPENAI_EXTRACTION_TEMP`, `SIGNED_URL_EXPIRY_SECONDS`, `MAX_CHAT_HISTORY`

---

## 13. Testing Strategy

### Unit Tests

**Framework:** Vitest  
**Coverage target:** ≥ 80% on `lib/` modules

**Key test targets:**
| Module | What to test |
|---|---|
| `lib/pdf/extractor.ts` | `[PAGE N]` marker insertion, word count detection (scanned PDF rejection), token count calculation, error on unreadable PDF |
| `lib/ai/extraction.ts` | Valid JSON parsing, corrective retry on parse failure, schema validation (Zod), custom term injection into prompt |
| `lib/ai/classifier.ts` | All three query types classified correctly for representative inputs |
| `lib/ai/chat.ts` | Context building with 200-message cap, contract_text truncation at token limit |
| `lib/validation/*.schema.ts` | Valid and invalid inputs for each Zod schema |
| `lib/constants.ts` | Values match PRD requirements (spot check) |

---

### Integration Tests

**Framework:** Vitest + Supabase local development stack  
**Coverage target:** ≥ 70% on API routes

**Key test targets:**
| Endpoint | What to test |
|---|---|
| `POST /api/contracts/upload` | Valid PDF → contract row created; scanned PDF → 400; oversized → 400; unauthenticated → 401 |
| `POST /api/contracts/process` | Standard terms extracted; custom terms included; status updated to 'completed'; OpenAI timeout → 504 + status 'error' |
| `PATCH /api/key-terms/[id]` | Value updated; `ai_value` preserved; wrong user → 403 |
| `POST /api/chat/message` | Correct OpenAI messages built; user + assistant messages stored in DB |
| **RLS cross-user test** | User A cannot read User B's contracts, key_terms, or chat_messages (critical) |

---

### End-to-End Tests

**Framework:** Playwright  
**Coverage:** Golden paths + critical edge cases

**Test suite:**
| Test | Flow |
|---|---|
| Full review flow | Sign up → Upload NDA → Process → View key terms with confidence scores → Click page number → PDF scrolls |
| Chat groundedness | Open chat → Ask question present in document → Assert `[Page X]` in response |
| Hallucination regression | Open chat → Ask question about topic NOT in document → Assert "I cannot find this in the document" |
| Inline edit | Edit a key term → Assert "Edited" badge shown → Refresh page → Assert edited value persists |
| Cross-user isolation | Log in as User B → Try to access User A's contract URL → Assert 403 or redirect |
| Scanned PDF rejection | Upload image-only PDF → Assert error message shown |

---

### Offline AI Evaluation

**Dataset:**
- 30 manually labelled NDA contracts (annotated by legal SME or CUAD)
- 20 manually labelled MSA contracts

**Metrics:**
| Metric | Target | Cadence |
|---|---|---|
| Key-term extraction F1 (NDA) | ≥ 88% | Every release |
| Key-term extraction F1 (MSA) | ≥ 85% | Every release |
| Page number accuracy | ≥ 92% | Every release |
| Custom term extraction F1 | ≥ 80% | Every release |
| Chat groundedness (% hallucinated) | ≤ 5% | Monthly |
| Confidence score calibration error | ≤ 0.10 | Monthly |

**Evaluation spreadsheet columns:** `Contract_ID | Contract_Type | Term_Name | Expected_Value | AI_Extracted_Value | Expected_Page | AI_Page | Confidence_Score | F1_Match | Expert_Rating | Notes`

---

## 14. Specs-to-Implementation Mapping

| User Story / Spec | Implementation Files | Full Flow |
|---|---|---|
| **US-001 — Auth** | `app/(auth)/login/page.jsx`, `app/(auth)/signup/page.jsx`, `middleware.ts`, `lib/supabase/client.ts`, `components/layout/Nav.jsx` | User submits form → `supabase.auth.signInWithPassword()` → session set → middleware reads session → redirect to dashboard |
| **US-002 — PDF Upload + Extraction** | `app/(protected)/upload/page.jsx`, `components/upload/DropZone.jsx`, `app/api/contracts/upload/route.ts`, `lib/pdf/extractor.ts`, `lib/validation/upload.schema.ts` | User drops PDF → client validates → `POST /api/contracts/upload` → `extractor.ts` parses text → `INSERT INTO contracts` → Storage upload (non-blocking) |
| **US-003 — Page Attribution** | `lib/ai/extraction.ts`, `lib/ai/prompts/nda-extraction.ts`, `lib/ai/prompts/msa-extraction.ts`, `components/contracts/KeyTermCard.jsx`, `components/viewer/PDFViewer.jsx` | OpenAI returns `page_number` per term → stored in `key_terms.page_number` → `KeyTermCard` renders page link → click triggers `setTargetPage` → `PDFViewer` scrolls |
| **US-004 — Confidence Scores** | `components/contracts/ConfidenceBar.jsx`, `components/contracts/KeyTermCard.jsx`, `components/ui/Tooltip.jsx`, `lib/constants.ts` | OpenAI returns `confidence_score` → `ConfidenceBar` colour-codes → `KeyTermCard` shows ⚠️ if < 50 with `Tooltip` |
| **US-005 — Custom Terms** | `components/upload/CustomTermInput.jsx`, `components/upload/TermPreviewList.jsx`, `app/api/contracts/process/route.ts`, `lib/validation/process.schema.ts` | User types custom term → `INSERT INTO custom_key_terms` → preview list updates with "Custom" badge → `POST /api/contracts/process` sends custom_terms → prompt builder appends to standard terms |
| **US-006 — PDF Viewer** | `components/viewer/PDFViewer.jsx`, `components/viewer/TextViewerFallback.jsx`, `app/api/contracts/[id]/route.ts` | Results page calls `GET /api/contracts/[id]` → receives `signed_url` → `PDFViewer` renders from URL; if null → `TextViewerFallback` parses `contract_text` by `[PAGE N]` markers |
| **US-007 — Chat** | `components/chat/ChatInterface.jsx`, `components/chat/MessageBubble.jsx`, `app/api/chat/message/route.ts`, `lib/ai/chat.ts`, `lib/ai/classifier.ts`, `lib/ai/prompts/chat-system.ts` | User types → `POST /api/chat/message` → `classifier.ts` types query → `chat.ts` builds messages array (system + contract_text + history) → OpenAI call → INSERT messages → response rendered in `MessageBubble` with page citation link |
| **US-008 — Dashboard** | `app/(protected)/dashboard/page.jsx`, `components/dashboard/ContractTable.jsx`, `components/dashboard/StatCard.jsx`, `components/dashboard/EmptyState.jsx` | Page loads → `SELECT contracts WHERE user_id = auth.uid()` → `StatCard` renders counts → `ContractTable` renders sortable list → click row → navigate to `/contracts/[id]` |
| **US-009 — Inline Edit** | `components/contracts/KeyTermCard.jsx`, `app/api/key-terms/[id]/route.ts`, `lib/validation/key-term.schema.ts` | User clicks term → input renders → submit → `PATCH /api/key-terms/[id]` → server preserves `ai_value` → updates `value` + `is_edited=true` → `KeyTermCard` shows "Edited" badge |
| **US-010 — Feedback** | `components/contracts/FeedbackWidget.jsx`, `app/api/feedback/route.ts`, `lib/validation/feedback.schema.ts` | User clicks thumbs up/down → optional comment → `POST /api/feedback` → `INSERT INTO user_feedback` |
| **US-012 — Persistent Chat** | `app/api/chat/[sessionId]/messages/route.ts`, `components/chat/ChatInterface.jsx` | Results page mounts → `GET /api/chat/[sessionId]/messages` → `ChatInterface` rehydrates message history from DB |
| **FR-03 — Text stored once** | `app/api/contracts/upload/route.ts`, `lib/pdf/extractor.ts` | Text extracted at upload, stored in `contracts.contract_text`; extraction route reads from DB, not Storage; chat route reads from DB, not Storage |
| **FR-06 — Viewer fallback** | `components/viewer/TextViewerFallback.jsx`, `app/(protected)/contracts/[id]/page.jsx` | `signed_url` null or Storage error → `TextViewerFallback` renders; same `targetPage` prop API as `PDFViewer` |
| **FR-13 — RLS** | `supabase/rls-policies.sql` (created in Stage 2) | Every table has RLS enabled; policies enforce `auth.uid() = user_id` on all operations |
| **FR-14 — Single SQL file** | `docs/specs/supabase-schema.sql` (created in Stage 2) | Contains all `CREATE TABLE`, `CREATE INDEX`, `CREATE POLICY`, `INSERT INTO storage.buckets`, `CREATE POLICY ON storage.objects` statements |

---

*Both engineering documents are ready in `docs/engineering/`. Review this document and let me know when you're happy to move to Stage 2 — Implementation Specs.*
