# Spec 01 — Authentication

**Feature:** US-001  
**Routes:** `/auth/login`, `/auth/signup`, `middleware.ts`  
**Tables:** `auth.users` (Supabase managed)  
**Depends on:** Supabase project provisioned, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## User Flow

```
New user:
  / → "Get Started Free" → /auth/signup
  → Enter email + password → supabase.auth.signUp()
  → Supabase sends verification email
  → User clicks verification link → session established → redirect to /dashboard

Returning user:
  / or /auth/login → Enter email + password → supabase.auth.signInWithPassword()
  → Session stored in browser (Supabase managed cookies) → redirect to /dashboard

Sign out:
  Nav "Sign Out" → supabase.auth.signOut() → redirect to /

Protected route access without session:
  Any /dashboard, /upload, /contracts/* → middleware intercepts → redirect to /auth/login?next={pathname}

Authed user visits /auth/*:
  → middleware redirects to /dashboard
```

---

## Files to Create / Modify

| File | Action | Notes |
|---|---|---|
| `app/(auth)/login/page.jsx` | Implement | Full login form with Supabase integration |
| `app/(auth)/signup/page.jsx` | Implement | Full signup form with Supabase integration |
| `components/layout/Nav.jsx` | Create | Top nav: logo, Sign In / Get Started / Sign Out |
| `middleware.ts` | Already scaffolded | Verify logic covers all protected paths |
| `lib/supabase/client.ts` | Already scaffolded | Browser client |

---

## Component Specs

### `app/(auth)/login/page.jsx`

```
'use client'

State:
  email: string
  password: string
  error: string | null
  loading: boolean

On submit:
  1. setLoading(true), setError(null)
  2. const { error } = await supabase.auth.signInWithPassword({ email, password })
  3. If error → setError(mapAuthError(error.message))
  4. If success → router.push('/dashboard')

Error mapping:
  'Invalid login credentials' → 'Invalid email or password.'
  'Email not confirmed'       → 'Please verify your email before signing in.'
  (any other)                 → 'Something went wrong. Please try again.'

Inline validation (onBlur, not onSubmit):
  email: must be valid email format
  password: must not be empty

Fields: email (type="email"), password (type="password")
Button: "Sign In" — disabled while loading; shows Spinner when loading
Link: "Don't have an account? Get started free" → /auth/signup
```

### `app/(auth)/signup/page.jsx`

```
'use client'

State:
  email: string
  password: string
  error: string | null
  loading: boolean
  success: boolean

On submit:
  1. Client validate: password.length >= 8
  2. setLoading(true), setError(null)
  3. const { error } = await supabase.auth.signUp({ email, password })
  4. If error.message includes 'already registered' → setError('An account with this email already exists. Sign in instead.')
  5. If success → setSuccess(true) — show "Check your email for a verification link."

Fields: email (type="email"), password (type="password", minLength hint: "At least 8 characters")
Button: "Create Account" — disabled while loading
Link: "Already have an account? Sign in" → /auth/login
Disclaimer: "By creating an account you agree that AI outputs are not legal advice."

Success state (replaces form):
  "Check your inbox — we sent a verification link to {email}."
```

### `components/layout/Nav.jsx`

```
'use client'

Props: none (reads session from Supabase hook)

Uses: createClientComponentClient() + useEffect to listen to auth state

Renders:
  Left: "ContractIQ" logo → links to /
  Right (unauthenticated): "Sign In" (btn-secondary) + "Get Started Free" (btn-primary)
  Right (authenticated): "Dashboard" link + "Sign Out" (btn-secondary)

Sign Out handler:
  await supabase.auth.signOut()
  router.push('/')

Styling: white bg, border-bottom 1px solid grey-100, height 64px, sticky top-0 z-50
```

---

## Middleware Logic (`middleware.ts`)

```typescript
const PROTECTED_PREFIXES = ['/dashboard', '/upload', '/contracts']

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()
  const { pathname } = req.nextUrl

  // Block unauthenticated access to protected routes
  if (PROTECTED_PREFIXES.some(p => pathname.startsWith(p)) && !session) {
    const loginUrl = new URL('/auth/login', req.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect authenticated users away from auth pages
  if (session && pathname.startsWith('/auth/')) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return res
}

export const config = {
  matcher: ['/dashboard/:path*', '/upload/:path*', '/contracts/:path*', '/auth/:path*'],
}
```

After redirect to `/auth/login?next={pathname}`, the login page must:
1. Read `next` query param on successful sign-in
2. `router.push(next || '/dashboard')`

---

## Error States

| Trigger | Display | Location |
|---|---|---|
| Invalid credentials | "Invalid email or password." | Inline below password field |
| Email not confirmed | "Please verify your email before signing in." | Inline |
| Duplicate email (signup) | "An account with this email already exists. Sign in instead." | Inline |
| Weak password (< 8 chars) | "Password must be at least 8 characters." | Inline, on blur |
| Network error | "Something went wrong. Please try again." | Inline |

---

## Edge Cases

- User navigates directly to `/auth/login` while already signed in → middleware redirects to `/dashboard`
- Session expires mid-session → next protected route fetch returns 401 → client redirects to `/auth/login?next={currentPath}`
- Email verification link expires → user sees Supabase error page; they must sign up again
- Password contains special characters → no escaping needed; Supabase handles securely
- `?next` param contains an external URL → sanitise: only allow relative paths starting with `/`

---

## Acceptance Criteria

- [ ] New user can sign up with email/password and receive verification email
- [ ] Verified user can sign in and land on `/dashboard` within 10 seconds
- [ ] Invalid credentials show a clear inline error message (not a page redirect)
- [ ] Unauthenticated requests to `/dashboard`, `/upload`, `/contracts/*` redirect to `/auth/login`
- [ ] After login, user is redirected to the original `?next` path
- [ ] Signed-in user visiting `/auth/login` or `/auth/signup` is redirected to `/dashboard`
- [ ] Sign out clears session and redirects to `/`
- [ ] Session persists across page refreshes (Supabase cookie-based)
