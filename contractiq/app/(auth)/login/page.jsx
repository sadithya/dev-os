'use client'

import Link from 'next/link'

export default function LoginPage() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#FAFAFA',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <div style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #DADADB',
        borderRadius: 8,
        padding: '40px',
        width: '100%',
        maxWidth: 400,
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h1 style={{ fontSize: 24, fontWeight: 500, lineHeight: '32px', color: '#070A0E' }}>
            Sign in to ContractIQ
          </h1>
          <p style={{ fontSize: 12, fontWeight: 400, lineHeight: '18px', color: '#4A4C4F' }}>
            Don&apos;t have an account?{' '}
            <Link href="/auth/signup" style={{ color: '#115ACB', textDecoration: 'none' }}>
              Get started free
            </Link>
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#070A0E' }}>Email</label>
            <input
              type="email"
              placeholder="you@company.com"
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid #DADADB',
                fontSize: 16,
                color: '#070A0E',
                backgroundColor: '#FFFFFF',
                outline: 'none',
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#070A0E' }}>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid #DADADB',
                fontSize: 16,
                color: '#070A0E',
                backgroundColor: '#FFFFFF',
                outline: 'none',
              }}
            />
          </div>
          <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
            Sign In
          </button>
        </div>
      </div>
    </div>
  )
}
