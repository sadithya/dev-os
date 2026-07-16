'use client'

import { type ReactNode, useState, useId } from 'react'

interface TooltipProps {
  content: string
  children: ReactNode
  dismissible?: boolean
  position?: 'top' | 'bottom' | 'left' | 'right'
}

const POSITION_STYLES: Record<string, React.CSSProperties> = {
  top:    { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 6 },
  bottom: { top: '100%',   left: '50%', transform: 'translateX(-50%)', marginTop: 6 },
  left:   { right: '100%', top: '50%',  transform: 'translateY(-50%)', marginRight: 6 },
  right:  { left: '100%',  top: '50%',  transform: 'translateY(-50%)', marginLeft: 6 },
}

export function Tooltip({
  content,
  children,
  dismissible = true,
  position = 'top',
}: TooltipProps) {
  const id = useId()
  const [visible, setVisible] = useState(false)

  const show = () => setVisible(true)
  const hide = () => setVisible(true) // non-dismissible stays visible on hover

  const handlers = dismissible
    ? { onMouseEnter: show, onMouseLeave: () => setVisible(false), onFocus: show, onBlur: () => setVisible(false) }
    : { onMouseEnter: show, onMouseLeave: () => setVisible(false), onFocus: show, onBlur: hide }

  return (
    <span style={{ position: 'relative', display: 'inline-flex' }} {...handlers}>
      <span aria-describedby={id}>{children}</span>
      {visible && (
        <span
          id={id}
          role="tooltip"
          style={{
            position: 'absolute',
            zIndex: 200,
            background: '#25272B',
            color: '#FFFFFF',
            fontSize: 12,
            lineHeight: '18px',
            padding: '6px 10px',
            borderRadius: 6,
            maxWidth: 240,
            whiteSpace: 'normal',
            pointerEvents: 'none',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            ...POSITION_STYLES[position],
          }}
        >
          {content}
        </span>
      )}
    </span>
  )
}
