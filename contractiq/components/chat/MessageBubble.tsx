'use client'

interface MessageBubbleProps {
  role: 'user' | 'assistant'
  content: string
  createdAt?: string
  onPageClick: (page: number) => void
}

function formatTimestamp(iso?: string): string {
  if (!iso) return ''
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin} min ago`
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const PAGE_CITATION_RE = /\[Page (\d+)\]/gi

function renderContent(content: string, onPageClick: (page: number) => void): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let foundCitation = false
  let match: RegExpExecArray | null
  const re = new RegExp(PAGE_CITATION_RE.source, 'gi')

  while ((match = re.exec(content)) !== null) {
    foundCitation = true
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index))
    }
    const pageNum = parseInt(match[1], 10)
    parts.push(
      <button
        key={match.index}
        type="button"
        onClick={() => onPageClick(pageNum)}
        style={{
          color: '#115ACB',
          textDecoration: 'underline',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: 'inherit',
          padding: 0,
          fontFamily: 'inherit',
        }}
      >
        {match[0]}
      </button>,
    )
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex))
  }

  if (!foundCitation) {
    parts.push(
      <span key="unknown-source" style={{ color: '#9B9C9E', fontSize: 'inherit' }}>
        {' '}Source: unknown
      </span>,
    )
  }

  return parts
}

export function MessageBubble({ role, content, createdAt, onPageClick }: MessageBubbleProps) {
  const isUser = role === 'user'
  const isNotFound = content === 'I cannot find this in the document.'

  const bubbleStyle: React.CSSProperties = isUser
    ? {
        background: '#115ACB',
        color: '#FFFFFF',
        borderRadius: '12px 12px 0 12px',
        padding: '10px 14px',
        maxWidth: '80%',
        fontSize: 14,
        lineHeight: 1.5,
        alignSelf: 'flex-end',
      }
    : {
        background: '#FFFFFF',
        color: isNotFound ? '#9B9C9E' : '#070A0E',
        border: '1px solid #F0F0F1',
        borderRadius: '12px 12px 12px 0',
        padding: '10px 14px',
        maxWidth: '85%',
        fontSize: 14,
        lineHeight: 1.5,
        fontStyle: isNotFound ? 'italic' : 'normal',
        alignSelf: 'flex-start',
      }

  const timestamp = formatTimestamp(createdAt)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        gap: 4,
      }}
    >
      <div style={bubbleStyle} title={timestamp}>
        {isUser || isNotFound
          ? content
          : renderContent(content, onPageClick)}
      </div>
      {timestamp && (
        <span style={{ fontSize: 11, color: '#9B9C9E', paddingLeft: isUser ? 0 : 4, paddingRight: isUser ? 4 : 0 }}>
          {timestamp}
        </span>
      )}
    </div>
  )
}
