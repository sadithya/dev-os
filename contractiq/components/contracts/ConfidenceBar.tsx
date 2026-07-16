import { CONFIDENCE_THRESHOLD_HIGH, CONFIDENCE_THRESHOLD_LOW } from '@/lib/constants'

interface ConfidenceBarProps {
  score: number
}

function getColor(score: number) {
  if (score >= CONFIDENCE_THRESHOLD_HIGH) return '#13A10E'
  if (score >= CONFIDENCE_THRESHOLD_LOW) return '#FFAA33'
  return '#D13438'
}

export function ConfidenceBar({ score }: ConfidenceBarProps) {
  const color = getColor(score)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div
        role="meter"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Confidence: ${score}%`}
        style={{ flex: 1, height: 4, background: '#F0F0F1', borderRadius: 2, overflow: 'hidden' }}
      >
        <div style={{ width: `${score}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 500, color, minWidth: 32, textAlign: 'right' }}>
        {score}%
      </span>
    </div>
  )
}
