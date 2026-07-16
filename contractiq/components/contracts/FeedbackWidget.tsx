'use client'

import { useEffect, useState } from 'react'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { Spinner } from '@/components/ui/Spinner'

interface FeedbackWidgetProps {
  contractId: string
  existingFeedback: { rating: string } | null
}

export function FeedbackWidget({ contractId, existingFeedback }: FeedbackWidgetProps) {
  const [selectedRating, setSelectedRating] = useState<'thumbs_up' | 'thumbs_down' | null>(null)
  const [comment, setComment] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (existingFeedback) setIsSubmitted(true)
  }, [existingFeedback])

  const handleSubmit = async () => {
    if (!selectedRating) return
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const body: Record<string, string> = { contract_id: contractId, rating: selectedRating }
      const trimmed = comment.trim()
      if (trimmed) body.comment = trimmed

      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.status === 409 || res.ok) {
        setIsSubmitted(true)
        return
      }

      const json = await res.json()
      setSubmitError(json?.error?.message ?? "Couldn't submit. Try again.")
    } catch {
      setSubmitError("Couldn't submit. Try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <p style={{ fontSize: 14, color: '#4A4C4F', fontStyle: 'italic', textAlign: 'center', margin: 0 }}>
        Thanks for your feedback!
      </p>
    )
  }

  const btnBase: React.CSSProperties = {
    width: 40,
    height: 40,
    borderRadius: 8,
    border: '1px solid #DADADB',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'background 0.15s',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{ fontSize: 12, color: '#4A4C4F', margin: 0, textAlign: 'center' }}>Was this review helpful?</p>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        <button
          type="button"
          onClick={() => setSelectedRating('thumbs_up')}
          style={{
            ...btnBase,
            background: selectedRating === 'thumbs_up' ? '#115ACB' : 'transparent',
            borderColor: selectedRating === 'thumbs_up' ? '#115ACB' : '#DADADB',
          }}
          aria-label="Thumbs up"
        >
          <ThumbsUp size={18} color={selectedRating === 'thumbs_up' ? '#FFFFFF' : '#9B9C9E'} />
        </button>
        <button
          type="button"
          onClick={() => setSelectedRating('thumbs_down')}
          style={{
            ...btnBase,
            background: selectedRating === 'thumbs_down' ? '#115ACB' : 'transparent',
            borderColor: selectedRating === 'thumbs_down' ? '#115ACB' : '#DADADB',
          }}
          aria-label="Thumbs down"
        >
          <ThumbsDown size={18} color={selectedRating === 'thumbs_down' ? '#FFFFFF' : '#9B9C9E'} />
        </button>
      </div>

      {selectedRating && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Optional: share any additional thoughts..."
            rows={3}
            maxLength={2000}
            style={{
              width: '100%',
              border: '1px solid #DADADB',
              borderRadius: 6,
              padding: 8,
              fontSize: 12,
              resize: 'vertical',
              color: '#070A0E',
              outline: 'none',
              boxSizing: 'border-box',
              fontFamily: 'inherit',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <span style={{ fontSize: 12, color: '#9B9C9E' }}>{comment.length} / 2000</span>
          </div>

          {submitError && <p style={{ fontSize: 12, color: '#D13438', margin: 0 }}>{submitError}</p>}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || comment.length > 2000}
            style={{
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 500,
              background: isSubmitting ? '#DADADB' : '#115ACB',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 6,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            {isSubmitting && <Spinner size="sm" color="#FFFFFF" />}
            Submit Feedback
          </button>
        </div>
      )}
    </div>
  )
}
