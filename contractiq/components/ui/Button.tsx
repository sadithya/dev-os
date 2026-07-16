'use client'

import { type ReactNode, type ButtonHTMLAttributes } from 'react'
import { Spinner } from './Spinner'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  children: ReactNode
}

const VARIANT_STYLES: Record<ButtonVariant, React.CSSProperties> = {
  primary:   { background: '#115ACB', color: '#FFFFFF', border: 'none' },
  secondary: { background: '#FFFFFF', color: '#070A0E', border: '1px solid #DADADB' },
  ghost:     { background: 'transparent', color: '#115ACB', border: 'none' },
  danger:    { background: '#D13438', color: '#FFFFFF', border: 'none' },
}

const SIZE_STYLES: Record<ButtonSize, React.CSSProperties> = {
  sm: { padding: '6px 12px', fontSize: 12, height: 28 },
  md: { padding: '8px 20px', fontSize: 16, height: 36 },
  lg: { padding: '10px 24px', fontSize: 16, height: 44 },
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  style,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading

  return (
    <button
      disabled={isDisabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderRadius: 6,
        fontWeight: 500,
        fontFamily: 'inherit',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.5 : 1,
        transition: 'background-color 100ms ease-out, opacity 100ms ease-out',
        ...VARIANT_STYLES[variant],
        ...SIZE_STYLES[size],
        ...style,
      }}
      {...rest}
    >
      {loading && (
        <Spinner
          size="sm"
          color={variant === 'secondary' || variant === 'ghost' ? '#115ACB' : '#FFFFFF'}
        />
      )}
      {children}
    </button>
  )
}
