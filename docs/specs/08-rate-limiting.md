# Spec 08 — Rate Limiting

**Purpose:** Sliding-window rate limiting on AI endpoints to control OpenAI costs and prevent abuse.  
**Table:** `rate_limit_events`  
**Used by:** `POST /api/contracts/process`, `POST /api/chat/message`

---

## Rate Limits

| Endpoint | Limit | Window |
|---|---|---|
| `contracts/process` | 20 requests | per user per hour |
| `chat/message` | 60 requests | per user per hour |

---

## Files to Create

| File | Purpose |
|---|---|
| `lib/security/rateLimiter.ts` | Sliding-window check + record function |

---

## `lib/security/rateLimiter.ts`

```typescript
import { SupabaseClient } from '@supabase/supabase-js'
import { RATE_LIMIT_PROCESS_PER_HOUR, RATE_LIMIT_CHAT_PER_HOUR } from '@/lib/constants'

export const RATE_LIMITS: Record<string, number> = {
  'contracts/process': RATE_LIMIT_PROCESS_PER_HOUR,
  'chat/message':      RATE_LIMIT_CHAT_PER_HOUR,
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
}

export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string,
  endpoint: string,
): Promise<RateLimitResult> {
  const limitPerHour = RATE_LIMITS[endpoint]
  if (!limitPerHour) throw new Error(`Unknown rate-limit endpoint: ${endpoint}`)

  const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const resetAt     = new Date(Date.now() + 60 * 60 * 1000)

  // Prune stale events older than 2 hours (best-effort cleanup)
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  supabase
    .from('rate_limit_events')
    .delete()
    .eq('user_id', userId)
    .eq('endpoint', endpoint)
    .lt('created_at', twoHoursAgo)
    .then(() => {})  // fire and forget

  // Count events in the last hour
  const { count } = await supabase
    .from('rate_limit_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('endpoint', endpoint)
    .gte('created_at', windowStart)

  const currentCount = count ?? 0

  if (currentCount >= limitPerHour) {
    return { allowed: false, remaining: 0, resetAt }
  }

  // Record this event
  await supabase
    .from('rate_limit_events')
    .insert({ user_id: userId, endpoint })

  return {
    allowed: true,
    remaining: limitPerHour - currentCount - 1,
    resetAt,
  }
}
```

---

## Usage Pattern in API Routes

```typescript
// In POST /api/contracts/process/route.ts
import { checkRateLimit } from '@/lib/security/rateLimiter'

const { allowed, remaining } = await checkRateLimit(supabase, session.user.id, 'contracts/process')

if (!allowed) {
  return Response.json(
    { data: null, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests. Please wait before processing another contract.' } },
    { status: 429, headers: { 'Retry-After': '3600', 'X-RateLimit-Remaining': '0' } }
  )
}
```

---

## Response Headers on Rate-Limited Requests

| Header | Value | Notes |
|---|---|---|
| `Retry-After` | `3600` | Seconds until limit resets |
| `X-RateLimit-Limit` | e.g. `20` | Total allowed per hour |
| `X-RateLimit-Remaining` | `0` | Requests remaining (0 on 429) |

Include these headers on all AI endpoint responses (even successful ones):
```typescript
headers: {
  'X-RateLimit-Limit': String(limitPerHour),
  'X-RateLimit-Remaining': String(remaining),
}
```

---

## UI Handling of 429 Responses

**Extraction (process) endpoint:**
- Show full-width Banner (red): "You've reached the limit of 20 contract analyses per hour. Please try again later."
- Do not show retry button (rate limit won't clear within seconds)

**Chat endpoint:**
- Show inline error below chat input: "Too many messages. Please wait a moment before sending."
- Re-enable input after 30 seconds (soft UX delay — actual limit is server-enforced)

---

## Edge Cases

| Scenario | Handling |
|---|---|
| Race condition (two requests arrive simultaneously) | Both count queries run before either insert; one may slip through. Acceptable at MVP — off by one is not a security issue. |
| Supabase count query fails | Fail open: return `{ allowed: true }` with a log warning. Do not block legitimate users due to DB error. |
| Pruning DELETE fails | Non-critical; table will grow but queries remain fast due to index on (user_id, endpoint, created_at). |
| User spoofs userId (impossible — userId comes from session) | Not an issue; userId always set from `session.user.id` server-side. |

---

## Acceptance Criteria

- [ ] 21st extraction request within an hour returns 429 with correct error message
- [ ] 61st chat message within an hour returns 429
- [ ] `rate_limit_events` table is pruned of entries older than 2 hours
- [ ] Rate limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`) present on all AI endpoint responses
- [ ] UI shows appropriate message on 429 (different for extraction vs chat)
- [ ] Rate limit is per-user (different users do not share quota)
