'use client'

import { useState } from 'react'
import { AlertTriangle, CheckCircle, Info, XCircle, X } from 'lucide-react'

type BannerVariant = 'error' | 'warning' | 'success' | 'info'

interface BannerProps {
  variant: BannerVariant
  message: string
  action?: { label: string; onClick: () => void }
  dismissible?: boolean
  onDismiss?: () => void
}

const STYLES: Record<BannerVariant, { bg: string; border: string; color: string }> = {
  error:   { bg: '#FAEBEB', border: '#EAA2A3', color: '#942528' },
  warning: { bg: '#FFF9F0', border: '#FFE3BD', color: '#B36800' },
  success: { bg: '#E7F6E7', border: '#92D490', color: '#0D720A' },
  info:    { bg: '#E7EFFC', border: '#92B7F0', color: '#0D469E' },
}

const ICONS = {
  error:   XCircle,
  warning: AlertTriangle,
  success: CheckCircle,
  info:    Info,
}

export function Banner({ variant, message, action, dismissible = true, onDismiss }: BannerProps) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  const s = STYLES[variant]
  const Icon = ICONS[variant]

  const handleDismiss = () => {
    setDismissed(true)
    onDismiss?.()
  }

  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        background: s.bg,
        border: `1px solid ${s.border}`,
        borderRadius: 8,
        color: s.color,
      }}
    >
      <Icon size={16} style={{ flexShrink: 0 }} />
      <span style={{ fontSize: 14, fontWeight: 500, flex: 1 }}>{message}</span>
      {action && (
        <button
          onClick={action.onClick}
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: s.color,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            textDecoration: 'underline',
            padding: 0,
          }}
        >
          {action.label}
        </button>
      )}
      {dismissible && (
        <button
          onClick={handleDismiss}
          aria-label="Dismiss"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: s.color, padding: 0 }}
        >
          <X size={16} />
        </button>
      )}
    </div>
  )
}
