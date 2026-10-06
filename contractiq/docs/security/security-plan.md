# ContractIQ — Security Plan

**Version:** 1.0  
**Date:** 2026-10-05  
**Status:** Implemented

---

## Overview

This document records every security surface in ContractIQ, the control implemented for each, the files that enforce it, and any outstanding items. All controls are production-ready and active.

---

## Security Surfaces and Controls

### 1. Authentication & Protected Routes

| Surface | Control | File |
|---|---|---|
| API route access | `requireAuth()` calls `supabase.auth.getUser()` — validates JWT with Supabase Auth server, not just cookie reads | `lib/security/authGuard.ts` |
| Protected pages | Middleware intercepts `/dashboard`, `/upload`, `/contracts/*`; redirects unauthenticated users to `/auth/login?next={path}` | `middleware.ts` |
| Auth page redirect | Middleware redirects authenticated users away from `/auth/login` and `/auth/signup` to `/dashboard` | `middleware.ts` |
| Server-side sign-in | `POST /api/auth/login` validates credentials server-side via `createRouteHandlerClient`; sets httpOnly session cookie | `app/api/auth/login/route.ts` |
| Server-side sign-out | `POST /api/auth/logout` clears session server-side before client state is cleared | `app/api/auth/logout/route.ts` |
| Open redirect (`?next`) | Login page validates: `next.startsWith('/')` before redirect; external URLs fall back to `/dashboard` | `app/auth/login/page.tsx` |
| `getUser()` vs `getSession()` | All API auth guards use `getUser()` which makes a round-trip to Supabase Auth to validate the JWT. `getSession()` is never used for authorization decisions (it only reads cookies without server-side verification) | `lib/security/authGuard.ts` |

---

### 2. API Request Validation

All API routes validate input with Zod before any DB or AI call. Invalid requests return `400` with a typed error code.

| Route | Schema | Key Validations |
|---|---|---|
| `POST /api/contracts/upload` | `uploadBodySchema` + `validateFileUpload()` | contract_type enum; file extension, MIME, size |
| `POST /api/contracts/process` | `processSchema` | contract_id UUID; custom_terms max-5, max-100 chars each |
| `POST /api/contracts/custom-terms` | `customTermSchema` | contract_id UUID; term_name max-100 chars |
| `PATCH /api/key-terms/[id]` | `keyTermPatchSchema` | value min-1, max-1000 chars |
| `POST /api/chat/sessions` | `chatSessionSchema` | contract_id UUID |
| `POST /api/chat/message` | `chatMessageSchema` | contract_id + session_id UUIDs; content max-4000 chars |
| `POST /api/feedback` | `feedbackSchema` | contract_id UUID; rating enum; comment max-2000 chars |
| `POST /api/auth/login` | inline `loginSchema` | email format; password non-empty |

All schemas are centrally re-exported from `lib/security/inputValidator.ts`.

---

### 3. Rate Limiting

Sliding-window rate limiting on all AI endpoints. All reads and writes use `createAdminClient()` (service role) — users cannot manipulate their own `rate_limit_events` rows.

| Endpoint | Limit | Window |
|---|---|---|
| `contracts/process` | 20 requests | per user per hour |
| `chat/message` | 60 requests | per user per hour |

**Implementation:**
- `lib/security/rateLimiter.ts` — `checkRateLimit(userId, endpoint)` using admin client
- On limit exceeded: returns `{ allowed: false }` → route returns `429` with `Retry-After: 3600`
- Stale rows (> 2 hours) pruned fire-and-forget on each check
- Fail open on DB error: logs warning, allows request (prevents legitimate users from being blocked by DB issues)

**Why admin client:** RLS is enabled on `rate_limit_events` but no user-facing policies exist. If user-facing policies existed, a user with the anon key could DELETE their own events to reset their quota.

---

### 4. Prompt Injection Protection

Every user message is passed through `sanitizeForLLM()` before reaching the AI. Injection detected → `400 INJECTION_DETECTED`, no AI call made.

**Structural patterns blocked** (manipulate raw prompt format):
- `###` sequences (section markers)
- `<|` and `|>` (token delimiters)
- `[INST]`, `<<SYS>>`, `</SYS>` (model instruction tags)

**Semantic patterns blocked** (override assistant behaviour):
- `ignore/override/disregard/forget (previous) instructions`
- `reveal/print/show system prompt`
- `expose env variables / show API keys`
- `you are now a / act as / pretend you are / roleplay as`
- `jailbreak / DAN mode / developer mode / do anything now`
- `bypass filters / turn off safety`

**Files:** `lib/security/promptInjectionGuard.ts`

---

### 5. Token & Usage Limits

Configurable limits enforced at the API layer before any AI call.

| Limit | Value | Enforced by |
|---|---|---|
| Max file size | 10 MB | `validateFileUpload()` in `inputValidator.ts`; Supabase Storage bucket policy |
| Max pages | 20 pages | `extractPDFText()` in `lib/pdf/extractor.ts` |
| Max token count | 15,000 tokens | `extractPDFText()` in `lib/pdf/extractor.ts` |
| Max message length | 4,000 chars | `chatMessageSchema` in `lib/validation/chat.schema.ts` |
| Max chat history to model | 200 turns | `MAX_CHAT_HISTORY` constant; configurable via `MAX_CHAT_HISTORY` env var |
| Max custom terms | 5 per contract | `processSchema`; API COUNT check before INSERT |
| Extraction max output tokens | 2,000 | `OPENAI_EXTRACTION_MAX_TOKENS` in constants |
| Chat max output tokens | 1,000 | `OPENAI_CHAT_MAX_TOKENS` in constants |

**Files:** `lib/security/tokenLimiter.ts`, `lib/constants.ts`, `lib/pdf/extractor.ts`

---

### 6. Chat Security

Before every chat message is processed, ownership of both the contract and the session is verified inline in the route handler.

**Checks performed (in parallel):**
1. Contract exists AND `contract.user_id === auth.uid()` (via RLS + explicit user_id check)
2. Session exists AND `session.contract_id === contract_id` AND `session.user_id === auth.uid()`

**Failure responses:**
- Contract or session not found → `403 FORBIDDEN` (not 404 — avoids enumeration)
- RLS prevents cross-user data leakage at the DB layer as a second defence

**Reusable helpers:** `lib/security/chatSecurity.ts` exports `verifyContractOwnership()` and `verifySessionOwnership()` for use in any future route that needs the same checks.

---

### 7. File Upload Security

Validation order: **extension → MIME type → size**.

**Blocklist (rejected before allowlist check):**
`.exe`, `.js`, `.mjs`, `.cjs`, `.php`, `.zip`, `.sh`, `.bat`, `.cmd`, `.py`, `.rb`, `.ps1`

**Allowlist:**
`.pdf` only (MIME: `application/pdf`)

**Additional checks:**
- File size > 0 bytes
- File size ≤ 10 MB
- Supabase Storage bucket enforces `allowed_mime_types: ['application/pdf']` and `file_size_limit: 10485760` at the infrastructure level

**Storage path:** `{user_id}/{contract_id}/{filename}.pdf` in private bucket `contracts`  
**Access:** Signed URLs only (1-hour expiry), generated server-side via `createAdminClient()`; never public URLs

**Files:** `lib/security/inputValidator.ts`, `lib/validation/upload.schema.ts`, `app/api/contracts/upload/route.ts`

---

### 8. Environment Variable Security

| Variable | Exposure | Used in |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client-safe | Supabase browser client |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client-safe | Supabase browser client |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only | `createAdminClient()` only |
| `OPENAI_API_KEY` | Server-only | `lib/ai/extraction.ts` only |
| `AZURE_AGENT_ENDPOINT` | Server-only | `lib/azure.ts` only |
| `AZURE_API_KEY` | Server-only | `lib/azure.ts` only |

**Rules enforced:**
- `SUPABASE_SERVICE_ROLE_KEY` used **only** inside `createAdminClient()` in `lib/supabase/server.ts`
- No secrets logged — `console.error` calls log only error messages, never key values
- `NEXT_PUBLIC_` prefix never applied to any secret variable
- `.env.local` in `.gitignore`; `.env.example` has placeholder values only

---

### 9. Database Row Level Security

RLS enabled on all 7 tables. Policy pattern: users can only access rows where `auth.uid() = user_id`.

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `contracts` | ✅ | ✅ | ✅ | ✅ |
| `key_terms` | ✅ | ✅ | ✅ | ✅ |
| `custom_key_terms` | ✅ | ✅ | — | ✅ |
| `chat_sessions` | ✅ | ✅ | — | — |
| `chat_messages` | ✅ | ✅ | — | — |
| `user_feedback` | ✅ | ✅ | — | — |
| `rate_limit_events` | ✗ | ✗ | ✗ | ✗ |

`rate_limit_events`: RLS enabled with **no user-facing policies** — zero client access. All operations go through the service role client server-side.

**Schema:** `database.sql`  
**Policies only (idempotent):** `supabase/rls-policies.sql`

---

## Security Issues Found and Fixed

| # | Issue | Severity | Fix | File |
|---|---|---|---|---|
| 1 | Client-side sign-out only — server-side session cookie not cleared on logout | Medium | Added `POST /api/auth/logout` server-side route; Nav calls it before client `signOut()` | `app/api/auth/logout/route.ts`, `components/layout/Nav.tsx` |
| 2 | Login used direct Supabase client call — session cookies set client-side only | Low | Added `POST /api/auth/login` server-side route using `createRouteHandlerClient`; login page now calls API route | `app/api/auth/login/route.ts`, `app/auth/login/page.tsx` |
| 3 | `MAX_CHAT_HISTORY` missing from `.env.example` | Low | Added `MAX_CHAT_HISTORY=200` to `.env.example` | `.env.example` |
| 4 | No central file upload validator in security layer | Low | Created `validateFileUpload()` in `lib/security/inputValidator.ts` with explicit blocklist + allowlist | `lib/security/inputValidator.ts` |
| 5 | No reusable chat ownership helpers (ownership checks were inline only) | Low | Extracted `verifyContractOwnership()` and `verifySessionOwnership()` into `lib/security/chatSecurity.ts` | `lib/security/chatSecurity.ts` |
| 6 | No centralized token/size limit validators | Low | Created `lib/security/tokenLimiter.ts` with `validateMessageLength()`, `validateFileSize()`, `validatePageCount()` | `lib/security/tokenLimiter.ts` |
| 7 | `user_feedback` had no DB-level uniqueness enforcement (only API-layer 409 check) | Medium | Added `UNIQUE (contract_id, user_id)` constraint + composite index to `database.sql` | `database.sql` |

---

## Files Created

| File | Purpose |
|---|---|
| `lib/security/authGuard.ts` | `requireAuth()` — JWT validation via `getUser()` |
| `lib/security/rateLimiter.ts` | Sliding-window rate limiting via admin client |
| `lib/security/promptInjectionGuard.ts` | `sanitizeForLLM()` — structural + semantic injection detection |
| `lib/security/tokenLimiter.ts` | File size, page count, message length validators + constants |
| `lib/security/chatSecurity.ts` | `verifyContractOwnership()`, `verifySessionOwnership()` |
| `lib/security/inputValidator.ts` | `validateFileUpload()` + central Zod schema re-exports |
| `app/api/auth/login/route.ts` | Server-side sign-in; sets session cookie httpOnly |
| `app/api/auth/logout/route.ts` | Server-side sign-out; clears session cookie |
| `supabase/rls-policies.sql` | Idempotent RLS policy SQL (drop + recreate) |
| `docs/security/security-plan.md` | This document |

## Files Modified

| File | Change |
|---|---|
| `app/auth/login/page.tsx` | Login calls `POST /api/auth/login` instead of client-side Supabase directly |
| `components/layout/Nav.tsx` | Sign-out calls `POST /api/auth/logout` (server) before client `signOut()` |
| `database.sql` | Added `UNIQUE (contract_id, user_id)` constraint on `user_feedback`; fixed index to cover composite key |
| `.env.example` | Added `AZURE_AGENT_ENDPOINT`, `AZURE_API_KEY`, `MAX_CHAT_HISTORY` |

---

## SQL to Run in Supabase

Run `database.sql` for a fresh project (tables + indexes + RLS + storage).  
Run `supabase/rls-policies.sql` to update policies only on an existing project.

Both files are idempotent.

---

## Environment Variables to Add to `.env.local`

```
SUPABASE_SERVICE_ROLE_KEY=<from Supabase Settings > API > service_role>
OPENAI_API_KEY=<from platform.openai.com/api-keys>
AZURE_AGENT_ENDPOINT=https://<resource>.services.ai.azure.com/openai/deployments/<deployment>
AZURE_API_KEY=<from Azure AI Foundry portal>
MAX_CHAT_HISTORY=200
```

---

## Outstanding Items

| Item | Priority | Notes |
|---|---|---|
| Email verification enforced | Medium | Currently Supabase email verification is enabled but not rate-limited at the API layer. Consider adding a rate limit on sign-up attempts. |
| Password reset flow | Low | Supabase handles the reset email; no custom route needed. Verify `SITE_URL` is set correctly in Supabase Auth settings. |
| Contract deletion + Storage cleanup | Medium | `ON DELETE CASCADE` handles DB rows. A separate API route or Supabase edge function is needed to delete the Storage object when a contract is deleted from the dashboard. |
| Refresh token rotation | Low | Enable in Supabase Auth settings (Auth > Configuration > Token rotation). No code change required. |
| CSRF protection | Low | Next.js App Router API routes are protected from cross-origin form submissions by the `SameSite` cookie attribute set by Supabase auth helpers. Explicit CSRF tokens not required. |
