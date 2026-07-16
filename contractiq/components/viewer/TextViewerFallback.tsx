'use client'

import { useEffect, useRef } from 'react'

interface TextViewerFallbackProps {
  contractText: string
  targetPage: number
}

interface PageSection {
  pageNum: number
  text: string
}

function parsePages(contractText: string): PageSection[] {
  const parts = contractText.split(/\[PAGE (\d+)\]/)
  const pages: PageSection[] = []
  for (let i = 1; i < parts.length; i += 2) {
    pages.push({ pageNum: parseInt(parts[i], 10), text: parts[i + 1] ?? '' })
  }
  if (pages.length === 0) {
    pages.push({ pageNum: 1, text: contractText })
  }
  return pages
}

export function TextViewerFallback({ contractText, targetPage }: TextViewerFallbackProps) {
  const sectionRefs = useRef<Record<number, HTMLElement | null>>({})
  const pages = parsePages(contractText)

  useEffect(() => {
    const el = sectionRefs.current[targetPage]
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [targetPage])

  return (
    <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 64px)', padding: '16px 20px', background: '#FAFAFA' }}>
      {pages.map(({ pageNum, text }) => (
        <section
          key={pageNum}
          data-page={pageNum}
          ref={(el) => { sectionRefs.current[pageNum] = el }}
          style={{ marginBottom: 8 }}
        >
          <div style={{ fontSize: 12, color: '#4A4C4F', fontWeight: 500, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Page {pageNum}
          </div>
          <pre
            style={{
              fontFamily: "'JetBrains Mono', 'Courier New', monospace",
              fontSize: 13,
              lineHeight: 1.7,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              color: '#070A0E',
              margin: 0,
              background: '#FFFFFF',
              border: '1px solid #F0F0F1',
              borderRadius: 6,
              padding: '16px',
            }}
          >
            {text.trim()}
          </pre>
          <hr style={{ border: 'none', borderTop: '1px solid #F0F0F1', margin: '24px 0' }} />
        </section>
      ))}
    </div>
  )
}
