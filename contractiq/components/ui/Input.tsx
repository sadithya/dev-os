import { type InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string | null
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, style, ...rest }, ref) => {
    const id = rest.id ?? rest.name

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
        {label && (
          <label
            htmlFor={id}
            style={{ fontSize: 12, fontWeight: 500, color: '#070A0E', lineHeight: '18px' }}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: 6,
            border: `1px solid ${error ? '#D13438' : '#DADADB'}`,
            background: error ? '#FAEBEB' : '#FFFFFF',
            color: '#070A0E',
            fontSize: 16,
            lineHeight: '24px',
            fontFamily: 'inherit',
            outline: 'none',
            transition: 'border-color 100ms ease-out',
            ...style,
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = error ? '#D13438' : '#115ACB'
            e.currentTarget.style.boxShadow = `0 0 0 2px ${error ? '#D13438' : '#115ACB'}22`
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = error ? '#D13438' : '#DADADB'
            e.currentTarget.style.boxShadow = 'none'
          }}
          {...rest}
        />
        {error && (
          <span style={{ fontSize: 12, color: '#D13438', lineHeight: '18px' }}>{error}</span>
        )}
      </div>
    )
  },
)
Input.displayName = 'Input'
