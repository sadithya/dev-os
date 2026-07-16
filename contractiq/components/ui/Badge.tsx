import { type ReactNode } from 'react'

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'violet'

interface BadgeProps {
  variant?: BadgeVariant
  children: ReactNode
  className?: string
}

const STYLES: Record<BadgeVariant, { bg: string; border: string; color: string }> = {
  default: { bg: '#F0F0F1', border: '#C1C2C3', color: '#25272B' },
  success: { bg: '#E7F6E7', border: '#92D490', color: '#0D720A' },
  warning: { bg: '#FFF9F0', border: '#FFE3BD', color: '#B36800' },
  error:   { bg: '#FAEBEB', border: '#EAA2A3', color: '#942528' },
  info:    { bg: '#E7EFFC', border: '#92B7F0', color: '#0D469E' },
  violet:  { bg: '#F7F0FF', border: '#E3C7FF', color: '#6600CC' },
}

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  const s = STYLES[variant]
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 4,
        border: `1px solid ${s.border}`,
        background: s.bg,
        color: s.color,
        fontSize: 12,
        fontWeight: 500,
        lineHeight: '18px',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  )
}
