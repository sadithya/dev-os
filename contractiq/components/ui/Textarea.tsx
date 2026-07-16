import { type TextareaHTMLAttributes, forwardRef } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string | null
  resize?: 'none' | 'vertical' | 'both'
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, resize = 'vertical', style, ...rest }, ref) => {
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
        <textarea
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
            resize,
            transition: 'border-color 100ms ease-out',
            ...style,
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#115ACB'
            e.currentTarget.style.boxShadow = '0 0 0 2px #115ACB22'
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
Textarea.displayName = 'Textarea'
