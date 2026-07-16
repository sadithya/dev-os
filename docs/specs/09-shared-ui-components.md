# Spec 09 — Shared UI Components

**Purpose:** Reusable design-system primitives used across all features.  
**Location:** `components/ui/`  
**Design system source:** `docs/design.md`

All components must:
- Use only design-system colour tokens (no arbitrary hex values in JSX)
- Accept a `className` prop for compositional overrides
- Be accessible (keyboard navigable, correct ARIA roles)
- Use `'use client'` only when they require browser APIs or event handlers

---

## Button (`components/ui/Button.jsx`)

```jsx
Props:
  variant: 'primary' | 'secondary' | 'ghost' | 'danger'  (default: 'primary')
  size:    'sm' | 'md' | 'lg'                             (default: 'md')
  disabled: boolean
  loading: boolean      ← shows Spinner, disables button
  onClick: function
  type: 'button' | 'submit' | 'reset'                    (default: 'button')
  children: ReactNode
  className: string

Sizes:
  sm: padding 6px 12px, font-size 12px, height 28px
  md: padding 8px 20px, font-size 16px, height 36px
  lg: padding 10px 24px, font-size 16px, height 44px

Variants (colours — all border-radius 6px):
  primary:   bg #115ACB, color white; hover: bg #0D469E; active: bg #0A367B
  secondary: bg white, color #070A0E, border 1px solid #DADADB; hover: bg #F0F0F1
  ghost:     bg transparent, color #115ACB; hover: bg #E7EFFC
  danger:    bg #D13438, color white; hover: bg #942528

Disabled state (all variants):
  opacity: 0.5; cursor: not-allowed; pointer-events: none

Loading:
  Shows <Spinner size="sm" /> before children
  Button remains same width (use min-width or fixed width)

Transition: background-color 100ms ease-out

Usage:
  <Button variant="primary" size="md" onClick={handleSubmit}>Save</Button>
  <Button variant="danger" loading={isDeleting}>Delete</Button>
```

---

## Badge (`components/ui/Badge.jsx`)

```jsx
Props:
  variant: 'default' | 'success' | 'warning' | 'error' | 'info' | 'custom'  (default: 'default')
  children: ReactNode
  className: string

  For 'custom': pass color prop (e.g. 'violet') to use violet-50/200/700 trio

Variant colour mapping (bg / border / text):
  default:  grey-50  / grey-200  / grey-700
  success:  green-50 / green-200 / green-700
  warning:  yellow-50 / yellow-200 / yellow-800
  error:    red-50   / red-200   / red-700
  info:     blue-50  / blue-200  / blue-700

Style:
  display: inline-flex, align-items: center
  padding: 2px 8px
  border-radius: 4px
  border: 1px solid {border-color}
  background: {bg-color}
  color: {text-color}
  font-size: 12px
  font-weight: 500
  line-height: 18px
  white-space: nowrap

Usage:
  <Badge variant="success">Completed</Badge>
  <Badge variant="custom" color="violet">Custom</Badge>
```

---

## Tooltip (`components/ui/Tooltip.jsx`)

```jsx
'use client'

Props:
  content: string       ← tooltip text
  children: ReactNode   ← trigger element
  dismissible: boolean  (default: true)
  position: 'top' | 'bottom' | 'left' | 'right'  (default: 'top')

Behaviour:
  Shows on hover AND focus of children
  If dismissible=false: cannot be closed by clicking; only hides when trigger loses focus/hover
  If dismissible=true: hides when clicking outside OR pressing Escape

Implementation:
  Use CSS-only approach where possible (visibility + opacity):
  .tooltip-trigger:hover .tooltip-content,
  .tooltip-trigger:focus-within .tooltip-content { opacity: 1; visibility: visible; }

  For non-dismissible: pointer-events: none on tooltip-content so it never blocks hover

Tooltip box style:
  background: #25272B (grey-700)
  color: #FFFFFF
  font-size: 12px
  padding: 6px 10px
  border-radius: 6px
  max-width: 240px
  box-shadow: 0 2px 8px rgba(0,0,0,0.15)

Arrow:
  3px CSS triangle pointing toward trigger

ARIA:
  role="tooltip" on tooltip box
  aria-describedby={tooltipId} on trigger

Usage:
  <Tooltip content="Low confidence — verify in document." dismissible={false}>
    <AlertTriangle size={14} />
  </Tooltip>
```

---

## Input (`components/ui/Input.jsx`)

```jsx
Props:
  type: string           (default: 'text')
  placeholder: string
  value: string
  onChange: function
  error: string | null   ← shows error message below input
  label: string | null   ← shows label above input
  disabled: boolean
  className: string
  ...rest (passed to <input>)

Layout:
  <div (wrapper)>
    {label && <label style="font-size:12px; font-weight:500; color:#070A0E; margin-bottom:4px;">{label}</label>}
    <input style="..." {...rest} />
    {error && <span style="font-size:12px; color:#D13438; margin-top:4px;">{error}</span>}
  </div>

Input styles:
  Default:  border 1px solid #DADADB, bg white, color #070A0E
  Focus:    border 1px solid #115ACB (outline: 2px solid #115ACB offset 0)
  Error:    border 1px solid #D13438, bg #FAEBEB
  Disabled: bg #FAFAFA, color #8F9193, cursor not-allowed
  Padding: 8px 12px, border-radius: 6px, font-size: 16px, width: 100%
  Transition: border-color 100ms ease-out

Usage:
  <Input label="Email" type="email" value={email} onChange={...} error={emailError} />
```

---

## Textarea (`components/ui/Textarea.jsx`)

```jsx
Props: same as Input plus:
  rows: number  (default: 3)
  resize: 'none' | 'vertical' | 'both'  (default: 'vertical')

Same styling as Input.
resize: CSS resize property.
```

---

## Modal (`components/ui/Modal.jsx`)

```jsx
'use client'

Props:
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  size: 'sm' | 'md' | 'lg'  (default: 'md')

Sizes:
  sm: max-width 400px
  md: max-width 560px
  lg: max-width 720px

Behaviour:
  Closes on Escape key press
  Closes on backdrop click
  Traps focus inside modal when open (use focus-trap-react or manual implementation)
  Renders via React portal: document.body

Backdrop: rgba(0,0,0,0.4), position fixed, z-index 100
Modal box: position fixed, centered, z-index 101, bg white, border-radius 12px, padding 32px
Header: title (24px, 500, grey-900) + × close button (top-right)
Body: children
Animation: fade + slide-up (200ms ease-out on enter, 150ms ease-in on exit)

ARIA:
  role="dialog" aria-modal="true" aria-labelledby={titleId}
  Restore focus to trigger element on close

Usage:
  <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Confirm Delete">
    <p>Are you sure?</p>
    <Button variant="danger" onClick={handleDelete}>Delete</Button>
  </Modal>
```

---

## Spinner (`components/ui/Spinner.jsx`)

```jsx
Props:
  size: 'sm' | 'md' | 'lg'  (default: 'md')
  color: string              (default: '#115ACB')

Sizes:
  sm: 16px × 16px
  md: 24px × 24px
  lg: 32px × 32px

Implementation:
  SVG circle with stroke-dasharray animation
  OR: CSS border spinner (border: 2px solid {color}20; border-top: 2px solid {color})
  animation: spin 0.8s linear infinite

ARIA: role="status" aria-label="Loading"

Usage:
  <Spinner size="sm" />
  <Spinner size="lg" color="#FFFFFF" />
```

---

## Banner (`components/ui/Banner.jsx`)

```jsx
Props:
  variant: 'error' | 'warning' | 'success' | 'info'
  message: string
  action?: { label: string; onClick: () => void }
  dismissible: boolean  (default: true)
  onDismiss?: () => void

Variant colours (same as Badge):
  error:   bg red-50,    border red-200,    text red-700
  warning: bg yellow-50, border yellow-200, text yellow-800
  success: bg green-50,  border green-200,  text green-700
  info:    bg blue-50,   border blue-200,   text blue-700

Layout:
  Full-width, padding 12px 16px
  Left: icon + message text
  Right: action button (optional) + × dismiss button (optional)

Icons (Lucide):
  error: XCircle
  warning: AlertTriangle
  success: CheckCircle
  info: Info

Usage:
  <Banner
    variant="error"
    message="AI processing failed. Please try again."
    action={{ label: 'Try Again', onClick: handleRetry }}
  />
```

---

## Skeleton (`components/ui/Skeleton.jsx`)

```jsx
Props:
  width: string | number   (default: '100%')
  height: string | number  (default: '16px')
  className: string

Implementation:
  <div
    className={`skeleton ${className}`}
    style={{ width, height, borderRadius: 6 }}
    aria-hidden="true"
  />

Uses the `.skeleton` CSS class from globals.css (shimmer animation).

Composition for complex skeletons:
  // Key term card skeleton
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 16, border: '1px solid #DADADB', borderRadius: 8 }}>
    <Skeleton width="40%" height="12px" />
    <Skeleton width="70%" height="16px" />
    <Skeleton width="30%" height="12px" />
  </div>
```

---

## Acceptance Criteria

- [ ] All components render without errors in isolation
- [ ] Button shows Spinner when `loading={true}` and is non-interactive
- [ ] Tooltip shows on hover and focus; non-dismissible variant cannot be closed by click
- [ ] Modal closes on Escape, backdrop click; focus is trapped inside while open
- [ ] Input shows error state (red border + message) when `error` prop is set
- [ ] Skeleton shimmer animation is smooth (CSS, no JS)
- [ ] All components are keyboard navigable with visible focus ring (2px solid #115ACB)
- [ ] No hardcoded hex colours outside of the design-system token values from `docs/design.md`
