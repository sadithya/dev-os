'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, type FormEvent, Suspense } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

function mapAuthError(code: string): string {
  if (code === 'INVALID_CREDENTIALS') return 'Invalid email or password.'
  if (code === 'EMAIL_NOT_CONFIRMED') return 'Please verify your email before signing in.'
  return 'Something went wrong. Please try again.'
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const json = await res.json()

      if (!res.ok) {
        setError(mapAuthError(json.error?.code ?? ''))
        setLoading(false)
        return
      }

      const safePath = next.startsWith('/') ? next : '/dashboard'
      router.push(safePath)
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {error && (
        <div role="alert" style={{ padding: '10px 14px', background: '#FAEBEB', border: '1px solid #EAA2A3', borderRadius: 6, color: '#942528', fontSize: 14 }}>
          {error}
        </div>
      )}

      <Input
        label="Email"
        type="email"
        id="email"
        name="email"
        placeholder="you@company.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        required
      />

      <Input
        label="Password"
        type="password"
        id="password"
        name="password"
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
        required
      />

      <Button type="submit" variant="primary" size="lg" loading={loading} style={{ width: '100%', marginTop: 8 }}>
        Sign In
      </Button>
    </form>
  )
}

export default function LoginPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FAFAFA', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #DADADB', borderRadius: 8, padding: 40, width: '100%', maxWidth: 400 }}>
        <div style={{ marginBottom: 24 }}>
          <Link href="/" style={{ fontSize: 18, fontWeight: 700, color: '#115ACB', textDecoration: 'none' }}>
            ContractIQ
          </Link>
          <h1 style={{ fontSize: 24, fontWeight: 500, color: '#070A0E', margin: '12px 0 4px' }}>
            Sign in to your account
          </h1>
          <p style={{ fontSize: 14, color: '#4A4C4F', margin: 0 }}>
            Don&apos;t have an account?{' '}
            <Link href="/auth/signup" style={{ color: '#115ACB', textDecoration: 'none', fontWeight: 500 }}>
              Get started free
            </Link>
          </p>
        </div>

        <Suspense fallback={<div style={{ height: 220 }} />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
