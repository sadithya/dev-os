'use client'

interface ContractTypeSelectorProps {
  value: 'nda' | 'msa' | ''
  onChange: (value: 'nda' | 'msa') => void
  disabled?: boolean
}

const OPTIONS: { value: 'nda' | 'msa'; label: string; description: string }[] = [
  { value: 'nda', label: 'NDA', description: 'Non-Disclosure Agreement' },
  { value: 'msa', label: 'MSA', description: 'Master Service Agreement' },
]

export function ContractTypeSelector({ value, onChange, disabled }: ContractTypeSelectorProps) {
  return (
    <div>
      <p style={{ fontSize: 14, fontWeight: 500, color: '#070A0E', marginBottom: 10 }}>
        Contract Type
      </p>
      <div style={{ display: 'flex', gap: 12 }}>
        {OPTIONS.map((opt) => {
          const selected = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt.value)}
              style={{
                flex: 1,
                padding: '14px 16px',
                borderRadius: 8,
                border: selected ? '2px solid #115ACB' : '1px solid #DADADB',
                background: selected ? '#EEF4FF' : '#FFFFFF',
                cursor: disabled ? 'not-allowed' : 'pointer',
                textAlign: 'left',
                transition: 'border-color 0.15s, background 0.15s',
                opacity: disabled ? 0.5 : 1,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, color: selected ? '#115ACB' : '#070A0E' }}>
                {opt.label}
              </div>
              <div style={{ fontSize: 12, color: '#4A4C4F', marginTop: 2 }}>
                {opt.description}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
