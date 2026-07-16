'use client'

import { useRef, useState } from 'react'
import { Upload, FileText, X } from 'lucide-react'
import { MAX_FILE_SIZE_MB } from '@/lib/constants'

interface DropZoneProps {
  file: File | null
  onFile: (file: File) => void
  onClear: () => void
  error?: string
  disabled?: boolean
}

function validateFile(file: File): string | null {
  if (file.type !== 'application/pdf') return 'Only PDF files are supported.'
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) return `File must be under ${MAX_FILE_SIZE_MB} MB.`
  return null
}

export function DropZone({ file, onFile, onClear, error, disabled }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const displayError = error ?? localError

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const picked = files[0]
    const err = validateFile(picked)
    if (err) {
      setLocalError(err)
      return
    }
    setLocalError(null)
    onFile(picked)
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) setIsDragging(true)
  }

  const onDragLeave = () => setIsDragging(false)

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (!disabled) handleFiles(e.dataTransfer.files)
  }

  const borderColor = displayError
    ? '#D13438'
    : isDragging
    ? '#115ACB'
    : file
    ? '#13A10E'
    : '#DADADB'

  const bgColor = isDragging ? '#EEF4FF' : file ? '#F6FFF6' : '#FAFAFA'

  return (
    <div>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Upload PDF contract"
        onClick={() => !disabled && !file && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (!disabled && !file && (e.key === 'Enter' || e.key === ' ')) inputRef.current?.click()
        }}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        style={{
          border: `2px dashed ${borderColor}`,
          borderRadius: 10,
          background: bgColor,
          padding: '40px 24px',
          textAlign: 'center',
          cursor: disabled ? 'not-allowed' : file ? 'default' : 'pointer',
          transition: 'border-color 0.15s, background 0.15s',
          opacity: disabled ? 0.5 : 1,
          position: 'relative',
        }}
      >
        {file ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <FileText size={24} color="#13A10E" />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#070A0E' }}>{file.name}</div>
              <div style={{ fontSize: 12, color: '#4A4C4F', marginTop: 2 }}>
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </div>
            </div>
            {!disabled && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onClear(); setLocalError(null) }}
                style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4, display: 'flex' }}
                aria-label="Remove file"
              >
                <X size={16} color="#4A4C4F" />
              </button>
            )}
          </div>
        ) : (
          <div>
            <Upload size={32} color="#115ACB" style={{ margin: '0 auto 12px' }} />
            <div style={{ fontSize: 14, fontWeight: 500, color: '#070A0E', marginBottom: 4 }}>
              {isDragging ? 'Drop your PDF here' : 'Drag & drop your PDF here'}
            </div>
            <div style={{ fontSize: 13, color: '#4A4C4F', marginBottom: 12 }}>
              or <span style={{ color: '#115ACB', fontWeight: 500 }}>browse files</span>
            </div>
            <div style={{ fontSize: 12, color: '#9B9C9E' }}>
              PDF only · Max {MAX_FILE_SIZE_MB} MB
            </div>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        style={{ display: 'none' }}
        onChange={(e) => handleFiles(e.target.files)}
        disabled={disabled}
      />

      {displayError && (
        <p style={{ fontSize: 12, color: '#D13438', marginTop: 6 }}>{displayError}</p>
      )}
    </div>
  )
}
