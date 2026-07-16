'use client'

import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { ConfidenceBar } from './ConfidenceBar'
import { SourceSentence } from './SourceSentence'
import { Tooltip } from '@/components/ui/Tooltip'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { CONFIDENCE_THRESHOLD_LOW } from '@/lib/constants'

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

interface KeyTermCardProps {
  term: KeyTerm
  onPageClick: (page: number) => void
  onUpdate: (id: string, newValue: string, isEdited: boolean, aiValue: string | null) => void
}

export function KeyTermCard({ term, onPageClick, onUpdate }: KeyTermCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [editValue, setEditValue] = useState(term.value)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const isLowConfidence = term.confidence_score < CONFIDENCE_THRESHOLD_LOW

  const handleEdit = () => {
    setEditValue(term.value)
    setIsEditing(true)
    setSaveError(null)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditValue(term.value)
    setSaveError(null)
  }

  const handleSave = async () => {
    const trimmed = editValue.trim()
    if (!trimmed) { setSaveError('Value cannot be empty.'); return }
    if (trimmed === term.value) { handleCancel(); return }

    setIsSaving(true)
    setSaveError(null)

    try {
      const res = await fetch(`/api/key-terms/${term.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: trimmed }),
      })
      const json = await res.json()
      if (!res.ok) {
        setSaveError(json?.error?.message ?? 'Failed to save. Try again.')
        setIsSaving(false)
        return
      }
      onUpdate(term.id, json.data.value, json.data.is_edited, json.data.ai_value)
      setIsEditing(false)
    } catch {
      setSaveError('Failed to save. Try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); handleSave() }
    if (e.key === 'Escape') handleCancel()
  }

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #F0F0F1',
        borderRadius: 8,
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {isLowConfidence && (
          <Tooltip content="Low confidence — we recommend verifying this in the document directly." position="top" dismissible={false}>
            <AlertTriangle size={14} color="#D13438" style={{ flexShrink: 0 }} />
          </Tooltip>
        )}
        <span style={{ fontSize: 13, fontWeight: 600, color: '#070A0E', flex: 1 }}>
          {term.term_name}
        </span>
        {term.is_manual && <Badge variant="violet">Custom</Badge>}
        {term.is_edited && (
          <Tooltip content={`Original: ${term.ai_value ?? '—'}`} position="top">
            <Badge variant="info">Edited</Badge>
          </Tooltip>
        )}
      </div>

      {/* Value / edit */}
      {isEditing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            autoFocus
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              width: '100%',
              padding: '6px 8px',
              border: '1px solid #115ACB',
              borderRadius: 4,
              fontSize: 14,
              color: '#070A0E',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {saveError && <p style={{ fontSize: 12, color: '#D13438', margin: 0 }}>{saveError}</p>}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              style={{
                padding: '4px 12px',
                fontSize: 13,
                fontWeight: 500,
                background: isSaving ? '#DADADB' : '#115ACB',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 4,
                cursor: isSaving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {isSaving && <Spinner size="sm" color="#FFFFFF" />}
              Save
            </button>
            <button
              type="button"
              onClick={handleCancel}
              style={{ fontSize: 13, color: '#4A4C4F', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={handleEdit}
          onKeyDown={(e) => e.key === 'Enter' && handleEdit()}
          title="Click to edit"
          style={{
            fontSize: 14,
            color: term.value === 'Not found' ? '#9B9C9E' : '#4A4C4F',
            fontStyle: term.value === 'Not found' ? 'italic' : 'normal',
            cursor: 'pointer',
            padding: '2px 0',
            borderRadius: 2,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#FAFAFA' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
        >
          {term.value}
        </div>
      )}

      {/* Page + confidence */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {term.page_number > 0 ? (
          <button
            type="button"
            onClick={() => onPageClick(term.page_number)}
            style={{ fontSize: 12, color: '#115ACB', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', padding: 0, whiteSpace: 'nowrap' }}
          >
            Page {term.page_number}
          </button>
        ) : (
          <span style={{ fontSize: 12, color: '#9B9C9E' }}>—</span>
        )}
        <div style={{ flex: 1 }}>
          <ConfidenceBar score={term.confidence_score} />
        </div>
      </div>

      {/* Source sentence */}
      <SourceSentence
        sourceSentence={term.source_sentence}
        isExpanded={isExpanded}
        onToggle={() => setIsExpanded((v) => !v)}
      />
    </div>
  )
}
