'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const supabase = createBrowserClient()

  const validatePassword = (val: string) => {
    if (val.length > 0 && val.length < 8) {
      setPasswordError('Password must be at least 8 characters.')
    } else {
      setPasswordError(null)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters.')
      return
    }
    setError(null)
    setLoading(true)

    const { error: authError } = await supabase.auth.signUp({ email, password })

    if (authError) {
      if (authError.message.toLowerCase().includes('already registered')) {
        setError('An account with this email already exists. Sign in instead.')
      } else {
        setError('Something went wrong. Please try again.')
      }
      setLoading(false)
      return
    }

    setSuccess(true)
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#FAFAFA', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #DADADB', borderRadius: 8, padding: 40, width: '100%', maxWidth: 400, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📬</div>
          <h2 style={{ fontSize: 24, fontWeight: 500, color: '#070A0E', margin: '0 0 8px' }}>Check your inbox</h2>
          <p style={{ fontSize: 16, color: '#4A4C4F', margin: '0 0 24px' }}>
            We sent a verification link to <strong>{email}</strong>. Click it to activate your account.
          </p>
          <Link href="/auth/login" style={{ color: '#115ACB', fontSize: 14 }}>
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FAFAFA', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #DADADB', borderRadius: 8, padding: 40, width: '100%', maxWidth: 400 }}>
        <div style={{ marginBottom: 24 }}>
          <Link href="/" style={{ fontSize: 18, fontWeight: 700, color: '#115ACB', textDecoration: 'none' }}>
            ContractIQ
          </Link>
          <h1 style={{ fontSize: 24, fontWeight: 500, color: '#070A0E', margin: '12px 0 4px' }}>
            Create your account
          </h1>
          <p style={{ fontSize: 14, color: '#4A4C4F', margin: 0 }}>
            Already have an account?{' '}
            <Link href="/auth/login" style={{ color: '#115ACB', textDecoration: 'none', fontWeight: 500 }}>
              Sign in
            </Link>
          </p>
        </div>

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
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => { setPassword(e.target.value); validatePassword(e.target.value) }}
            onBlur={(e) => validatePassword(e.target.value)}
            error={passwordError}
            autoComplete="new-password"
            required
          />

          <Button type="submit" variant="primary" size="lg" loading={loading} style={{ width: '100%', marginTop: 8 }}>
            Create Account
          </Button>
        </form>

        <p style={{ fontSize: 12, color: '#8F9193', textAlign: 'center', margin: '16px 0 0' }}>
          By creating an account you agree that AI outputs are not legal advice.
        </p>
      </div>
    </div>
  )
}
