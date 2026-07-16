import Link from 'next/link'
import { Nav } from '@/components/layout/Nav'

const FEATURES = [
  {
    icon: '⚡',
    title: 'Review in 15 minutes',
    body: 'Extract every key term from an NDA or MSA automatically — not 90 minutes of manual reading.',
  },
  {
    icon: '📍',
    title: 'Page-level attribution',
    body: 'Every extracted term links back to the exact page it came from. Verify instantly.',
  },
  {
    icon: '🎯',
    title: 'Confidence scoring',
    body: 'See how sure the AI is for each term. Colour-coded flags surface anything that needs attention.',
  },
  {
    icon: '💬',
    title: 'Chat with your contract',
    body: 'Ask plain-English questions. Get answers grounded strictly in the document with page citations.',
  },
]

const STATS = [
  { value: '≥88%', label: 'Key-term accuracy (NDA)' },
  { value: '≤15s', label: 'Chat response time P95' },
  { value: '≤$0.25', label: 'Cost per contract analysis' },
]

export default function LandingPage() {
  return (
    <div style={{ backgroundColor: '#FAFAFA', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Nav />

      {/* Hero */}
      <section style={{ padding: '80px 40px 64px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
        <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 4, background: '#E7EFFC', border: '1px solid #92B7F0', color: '#115ACB', fontSize: 12, fontWeight: 500 }}>
          NDA · MSA · AI-Powered Contract Review
        </span>

        <h1 style={{ fontSize: 48, fontWeight: 700, lineHeight: '56px', color: '#070A0E', maxWidth: 720, margin: 0 }}>
          Understand any contract in{' '}
          <span style={{ color: '#115ACB' }}>15 minutes</span>
        </h1>

        <p style={{ fontSize: 18, fontWeight: 500, lineHeight: '28px', color: '#4A4C4F', maxWidth: 560, margin: 0 }}>
          ContractIQ extracts key terms, flags risky clauses with confidence scores, and answers your questions — grounded strictly in the document.
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link href="/auth/signup" className="btn-primary" style={{ fontSize: 16 }}>
            Get Started Free
          </Link>
          <Link href="/auth/login" className="btn-secondary" style={{ fontSize: 16 }}>
            Sign In
          </Link>
        </div>

        <p style={{ fontSize: 12, color: '#8F9193', margin: 0 }}>
          No credit card required · Supports NDA and MSA contracts
        </p>
      </section>

      {/* Stats */}
      <section style={{ background: '#FFFFFF', borderTop: '1px solid #DADADB', borderBottom: '1px solid #DADADB', padding: '32px 40px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 64, flexWrap: 'wrap' }}>
          {STATS.map((s) => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 30, fontWeight: 700, color: '#115ACB' }}>{s.value}</div>
              <div style={{ fontSize: 12, color: '#4A4C4F', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '64px 40px', display: 'flex', flexDirection: 'column', gap: 40, maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ fontSize: 30, fontWeight: 600, color: '#070A0E', textAlign: 'center', margin: 0 }}>
          Everything you need to review a contract
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
          {FEATURES.map((f) => (
            <div
              key={f.title}
              style={{ background: '#FFFFFF', border: '1px solid #DADADB', borderRadius: 8, padding: 24, display: 'flex', flexDirection: 'column', gap: 8 }}
            >
              <span style={{ fontSize: 28 }}>{f.icon}</span>
              <p style={{ fontSize: 16, fontWeight: 500, color: '#070A0E', margin: 0 }}>{f.title}</p>
              <p style={{ fontSize: 14, color: '#4A4C4F', lineHeight: '20px', margin: 0 }}>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: '#115ACB', padding: '64px 40px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
        <h2 style={{ fontSize: 30, fontWeight: 600, color: '#FFFFFF', margin: 0 }}>
          From 90 minutes to 15 minutes per contract
        </h2>
        <p style={{ fontSize: 16, color: '#B6CFF5', margin: 0 }}>
          Start reviewing for free. No credit card required.
        </p>
        <Link href="/auth/signup" style={{ display: 'inline-block', padding: '10px 28px', borderRadius: 6, background: '#FFFFFF', color: '#115ACB', fontWeight: 600, fontSize: 16, textDecoration: 'none' }}>
          Get Started Free
        </Link>
      </section>

      <footer style={{ padding: '24px 40px', borderTop: '1px solid #DADADB', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontSize: 12, color: '#8F9193' }}>© 2026 ContractIQ</span>
        <span style={{ fontSize: 12, color: '#8F9193' }}>AI outputs are not a substitute for professional legal review.</span>
      </footer>
    </div>
  )
}
