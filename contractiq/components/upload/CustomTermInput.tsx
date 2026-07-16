'use client'

import { useState, useRef } from 'react'
import { Plus } from 'lucide-react'
import { MAX_CUSTOM_TERMS } from '@/lib/constants'

interface CustomTermInputProps {
  terms: string[]
  onAdd: (term: string) => void
  onRemove: (term: string) => void
  disabled?: boolean
}

export function CustomTermInput({ terms, onAdd, onRemove, disabled }: CustomTermInputProps) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const atMax = terms.length >= MAX_CUSTOM_TERMS

  const handleAdd = () => {
    const trimmed = value.trim()
    if (!trimmed) { setError('Enter a term name.'); return }
    if (trimmed.length > 100) { setError('Term name must be 100 characters or fewer.'); return }
    if (terms.includes(trimmed)) { setError('This term has already been added.'); return }
    if (atMax) { setError(`Maximum ${MAX_CUSTOM_TERMS} custom terms allowed.`); return }
    setError(null)
    onAdd(trimmed)
    setValue('')
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); handleAdd() }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <p style={{ fontSize: 14, fontWeight: 500, color: '#070A0E', margin: 0 }}>
          Custom Terms <span style={{ fontWeight: 400, color: '#4A4C4F' }}>(optional)</span>
        </p>
        <span style={{ fontSize: 12, color: atMax ? '#D13438' : '#4A4C4F' }}>
          {terms.length}/{MAX_CUSTOM_TERMS}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => { setValue(e.target.value); setError(null) }}
          onKeyDown={handleKeyDown}
          placeholder="e.g. Renewal Clause"
          disabled={disabled || atMax}
          maxLength={100}
          style={{
            flex: 1,
            height: 38,
            padding: '0 12px',
            fontSize: 14,
            border: `1px solid ${error ? '#D13438' : '#DADADB'}`,
            borderRadius: 8,
            outline: 'none',
            color: '#070A0E',
            background: disabled || atMax ? '#FAFAFA' : '#FFFFFF',
          }}
          aria-label="Custom term name"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={disabled || atMax || !value.trim()}
          style={{
            height: 38,
            padding: '0 14px',
            borderRadius: 8,
            border: 'none',
            background: disabled || atMax || !value.trim() ? '#DADADB' : '#115ACB',
            color: '#FFFFFF',
            cursor: disabled || atMax || !value.trim() ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 14,
            fontWeight: 500,
            whiteSpace: 'nowrap',
          }}
        >
          <Plus size={14} /> Add
        </button>
      </div>

      {error && <p style={{ fontSize: 12, color: '#D13438', marginBottom: 8 }}>{error}</p>}

      {terms.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {terms.map((term) => (
            <div
              key={term}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                color: '#070A0E',
                background: '#EEF4FF',
                border: '1px solid #B3CAED',
                borderRadius: 6,
                padding: '4px 8px 4px 10px',
                fontWeight: 500,
              }}
            >
              {term}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => onRemove(term)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: '#4A4C4F', lineHeight: 1 }}
                  aria-label={`Remove ${term}`}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
