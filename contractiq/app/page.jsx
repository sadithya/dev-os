import Link from 'next/link'

const FEATURES = [
  {
    icon: '⚡',
    title: 'Review in 15 minutes',
    body: 'Extract every key term from an NDA or MSA in seconds — not 90 minutes.',
  },
  {
    icon: '📍',
    title: 'Page-level attribution',
    body: 'Every extracted term links back to the exact page it came from.',
  },
  {
    icon: '🎯',
    title: 'Confidence scoring',
    body: 'See how sure the AI is for each term. Flag anything that needs human review.',
  },
  {
    icon: '💬',
    title: 'Chat with your contract',
    body: 'Ask plain-English questions. Get answers grounded strictly in the document.',
  },
]

export default function LandingPage() {
  return (
    <div style={{ backgroundColor: '#FAFAFA', minHeight: '100vh', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Nav */}
      <nav style={{
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #DADADB',
        padding: '0 112px',
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: '#115ACB', letterSpacing: 0 }}>
          ContractIQ
        </span>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link
            href="/auth/login"
            style={{
              padding: '8px 20px',
              borderRadius: 6,
              color: '#070A0E',
              fontWeight: 500,
              fontSize: 16,
              textDecoration: 'none',
            }}
          >
            Sign In
          </Link>
          <Link href="/auth/signup" className="btn-primary" style={{ padding: '8px 20px' }}>
            Get Started Free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{
        padding: '96px 112px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: 24,
      }}>
        <span style={{
          display: 'inline-block',
          padding: '4px 12px',
          borderRadius: 4,
          backgroundColor: '#E7EFFC',
          border: '1px solid #92B7F0',
          color: '#115ACB',
          fontSize: 12,
          fontWeight: 500,
          lineHeight: '18px',
        }}>
          NDA · MSA · AI-Powered Review
        </span>

        <h1 style={{
          fontSize: 48,
          fontWeight: 700,
          lineHeight: '56px',
          color: '#070A0E',
          maxWidth: 720,
          letterSpacing: 0,
        }}>
          Understand any contract in{' '}
          <span style={{ color: '#115ACB' }}>15 minutes</span>
        </h1>

        <p style={{
          fontSize: 16,
          fontWeight: 500,
          lineHeight: '24px',
          color: '#4A4C4F',
          maxWidth: 560,
        }}>
          ContractIQ extracts key terms, flags risky clauses, and answers your questions — without a lawyer.
          Built for founders, ops leads, and freelancers reviewing 5–15 contracts a month.
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link href="/auth/signup" className="btn-primary">
            Get Started Free
          </Link>
          <Link href="/auth/login" className="btn-secondary">
            Sign In
          </Link>
        </div>

        <p style={{ fontSize: 12, color: '#8F9193', fontWeight: 400, lineHeight: '18px' }}>
          No credit card required · Supports NDA and MSA contracts
        </p>
      </section>

      {/* Features */}
      <section style={{ padding: '0 112px 96px', display: 'flex', flexDirection: 'column', gap: 40 }}>
        <h2 style={{ fontSize: 30, fontWeight: 600, lineHeight: '38px', color: '#070A0E', textAlign: 'center' }}>
          Everything you need to review a contract
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 24,
        }}>
          {FEATURES.map((f) => (
            <div
              key={f.title}
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #DADADB',
                borderRadius: 8,
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <span style={{ fontSize: 24 }}>{f.icon}</span>
              <p style={{ fontSize: 16, fontWeight: 500, lineHeight: '24px', color: '#070A0E' }}>
                {f.title}
              </p>
              <p style={{ fontSize: 12, fontWeight: 400, lineHeight: '18px', color: '#4A4C4F' }}>
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Social proof strip */}
      <section style={{
        backgroundColor: '#115ACB',
        padding: '48px 112px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}>
        <p style={{ fontSize: 24, fontWeight: 500, lineHeight: '32px', color: '#FFFFFF' }}>
          From 90 minutes to 15 minutes per contract
        </p>
        <p style={{ fontSize: 16, fontWeight: 500, lineHeight: '24px', color: '#B6CFF5' }}>
          ≥ 88% key-term extraction accuracy · Page-level attribution · Grounded AI chat
        </p>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '32px 112px',
        borderTop: '1px solid #DADADB',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
      }}>
        <span style={{ fontSize: 12, color: '#8F9193', fontWeight: 400 }}>
          © 2026 ContractIQ. Not legal advice.
        </span>
        <span style={{ fontSize: 12, color: '#8F9193', fontWeight: 400 }}>
          AI outputs are not a substitute for professional legal review.
        </span>
      </footer>

    </div>
  )
}
