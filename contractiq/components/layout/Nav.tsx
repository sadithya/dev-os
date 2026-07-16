'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import type { Session } from '@supabase/supabase-js'
import { Button } from '@/components/ui/Button'

export function Nav() {
  const router = useRouter()
  const supabase = createBrowserClient()
  const [session, setSession] = useState<Session | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })
    return () => subscription.unsubscribe()
  }, [supabase])

  const handleSignOut = async () => {
    setSigningOut(true)
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        height: 64,
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #DADADB',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 40px',
      }}
    >
      <Link
        href={session ? '/dashboard' : '/'}
        style={{ fontSize: 18, fontWeight: 700, color: '#115ACB', textDecoration: 'none' }}
      >
        ContractIQ
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {session ? (
          <>
            <Link
              href="/dashboard"
              style={{ fontSize: 16, fontWeight: 500, color: '#4A4C4F', textDecoration: 'none' }}
            >
              Dashboard
            </Link>
            <Link
              href="/upload"
              style={{ fontSize: 16, fontWeight: 500, color: '#4A4C4F', textDecoration: 'none' }}
            >
              Review a Contract
            </Link>
            <Button variant="secondary" size="sm" loading={signingOut} onClick={handleSignOut}>
              Sign Out
            </Button>
          </>
        ) : (
          <>
            <Link href="/auth/login">
              <Button variant="secondary" size="sm">Sign In</Button>
            </Link>
            <Link href="/auth/signup">
              <Button variant="primary" size="sm">Get Started Free</Button>
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}
