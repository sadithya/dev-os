'use client'

import { useState } from 'react'
import { KeyTermCard } from './KeyTermCard'
import { FeedbackWidget } from './FeedbackWidget'
import { Skeleton } from '@/components/ui/Skeleton'

interface KeyTerm {
  id: string
  term_name: string
  value: string
  ai_value: string | null
  page_number: number
  confidence_score: number
  source_sentence: string
  is_manual: boolean
  is_edited: boolean
}

interface KeyTermsPanelProps {
  initialTerms: KeyTerm[]
  onPageClick: (page: number) => void
  contractId: string
  chatSessionId: string | null
  existingFeedback: { rating: string } | null
}

export function KeyTermsPanel({ initialTerms, onPageClick, contractId, existingFeedback }: KeyTermsPanelProps) {
  const [terms, setTerms] = useState<KeyTerm[]>(initialTerms)

  const handleUpdate = (id: string, newValue: string, isEdited: boolean, aiValue: string | null) => {
    setTerms((prev) =>
      prev.map((t) => t.id === id ? { ...t, value: newValue, is_edited: isEdited, ai_value: aiValue } : t),
    )
  }

  return (
    <div
      style={{
        overflowY: 'auto',
        maxHeight: 'calc(100vh - 64px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
      }}
    >
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
        {terms.length === 0 ? (
          <p style={{ fontSize: 14, color: '#4A4C4F', textAlign: 'center', padding: '32px 0' }}>
            No key terms extracted.
          </p>
        ) : (
          terms.map((term) => (
            <KeyTermCard
              key={term.id}
              term={term}
              onPageClick={onPageClick}
              onUpdate={handleUpdate}
            />
          ))
        )}
      </div>

      <div style={{ borderTop: '1px solid #F0F0F1', padding: '16px 20px' }}>
        <FeedbackWidget contractId={contractId} existingFeedback={existingFeedback} />
      </div>

      <div style={{ padding: '8px 20px 16px', borderTop: '1px solid #F0F0F1' }}>
        <p style={{ fontSize: 12, color: '#9B9C9E', margin: 0, lineHeight: 1.5 }}>
          ⚠️ This output is for informational purposes only and does not constitute legal advice. Always consult a qualified legal professional.
        </p>
      </div>
    </div>
  )
}

export function KeyTermsPanelSkeleton() {
  return (
    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} style={{ background: '#FFFFFF', border: '1px solid #F0F0F1', borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Skeleton height="14px" width="50%" />
          <Skeleton height="14px" width="80%" />
          <Skeleton height="6px" width="100%" />
        </div>
      ))}
    </div>
  )
}
