'use client'

import { Check } from 'lucide-react'
import { Spinner } from '@/components/ui/Spinner'

interface Step {
  label: string
  description: string
}

const STEPS: Step[] = [
  { label: 'Uploading', description: 'Sending your contract to the server' },
  { label: 'Extracting', description: 'Reading and processing your PDF' },
  { label: 'Analysing', description: 'AI extracting key terms' },
]

interface ProcessingProgressProps {
  currentStep: 0 | 1 | 2
  error?: string | null
}

export function ProcessingProgress({ currentStep, error }: ProcessingProgressProps) {
  return (
    <div style={{ padding: '32px 0' }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, color: '#070A0E', marginBottom: 4, textAlign: 'center' }}>
        Processing your contract
      </h2>
      <p style={{ fontSize: 14, color: '#4A4C4F', textAlign: 'center', marginBottom: 36 }}>
        This usually takes 15–30 seconds
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, maxWidth: 400, margin: '0 auto' }}>
        {STEPS.map((step, i) => {
          const isDone = i < currentStep
          const isActive = i === currentStep && !error
          const isPending = i > currentStep

          return (
            <div key={step.label} style={{ display: 'flex', gap: 16, position: 'relative' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: isDone
                      ? 'none'
                      : isActive
                      ? '2px solid #115ACB'
                      : '2px solid #DADADB',
                    background: isDone ? '#13A10E' : isActive ? '#EEF4FF' : '#FAFAFA',
                    flexShrink: 0,
                    zIndex: 1,
                  }}
                >
                  {isDone ? (
                    <Check size={16} color="#FFFFFF" strokeWidth={3} />
                  ) : isActive ? (
                    <Spinner size="sm" color="#115ACB" />
                  ) : (
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#DADADB', display: 'block' }} />
                  )}
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    style={{
                      width: 2,
                      flex: 1,
                      minHeight: 32,
                      background: isDone ? '#13A10E' : '#DADADB',
                      margin: '2px 0',
                    }}
                  />
                )}
              </div>

              <div style={{ paddingBottom: i < STEPS.length - 1 ? 24 : 0, paddingTop: 4 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: isActive ? 600 : 500,
                    color: isDone ? '#13A10E' : isActive ? '#115ACB' : '#9B9C9E',
                  }}
                >
                  {step.label}
                </div>
                <div style={{ fontSize: 12, color: '#4A4C4F', marginTop: 2 }}>
                  {step.description}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {error && (
        <div
          style={{
            marginTop: 28,
            padding: '12px 16px',
            background: '#FFF5F5',
            border: '1px solid #F4BDBF',
            borderRadius: 8,
            fontSize: 13,
            color: '#D13438',
            textAlign: 'center',
            maxWidth: 400,
            margin: '28px auto 0',
          }}
        >
          {error}
        </div>
      )}
    </div>
  )
}
