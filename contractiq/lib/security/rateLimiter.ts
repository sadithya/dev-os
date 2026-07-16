import type { SupabaseClient } from '@supabase/supabase-js'
import { RATE_LIMIT_PROCESS_PER_HOUR, RATE_LIMIT_CHAT_PER_HOUR } from '@/lib/constants'

const RATE_LIMITS: Record<string, number> = {
  'contracts/process': RATE_LIMIT_PROCESS_PER_HOUR,
  'chat/message': RATE_LIMIT_CHAT_PER_HOUR,
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  limit: number
}

export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string,
  endpoint: string,
): Promise<RateLimitResult> {
  const limit = RATE_LIMITS[endpoint]
  if (!limit) throw new Error(`Unknown rate-limit endpoint: ${endpoint}`)

  const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const pruneAt = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

  // Prune stale rows — fire and forget
  supabase
    .from('rate_limit_events')
    .delete()
    .eq('user_id', userId)
    .eq('endpoint', endpoint)
    .lt('created_at', pruneAt)
    .then(() => {})

  const { count, error } = await supabase
    .from('rate_limit_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('endpoint', endpoint)
    .gte('created_at', windowStart)

  // Fail open on DB error — don't block legitimate users
  if (error) {
    console.error('[rateLimiter] count error:', error.message)
    return { allowed: true, remaining: limit, limit }
  }

  const current = count ?? 0

  if (current >= limit) {
    return { allowed: false, remaining: 0, limit }
  }

  await supabase.from('rate_limit_events').insert({ user_id: userId, endpoint })

  return { allowed: true, remaining: limit - current - 1, limit }
}
