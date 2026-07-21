'use client'

interface MessageBubbleProps {
  role: 'user' | 'assistant'
  content: string
  createdAt?: string
  queryType?: 'contract' | 'history' | 'both'
  onPageClick: (page: number) => void
}

function formatTimestamp(iso?: string): string {
  if (!iso) return ''
  const date = new Date(iso)
  const now = new Date()
  const diffMin = Math.floor((now.getTime() - date.getTime()) / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin} min ago`
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const PAGE_CITATION_RE = /\[Page (\d+)\]/gi
const FROM_CONVERSATION_RE = /\[From conversation\]/gi

function renderContent(
  content: string,
  queryType: 'contract' | 'history' | 'both' | undefined,
  onPageClick: (page: number) => void,
): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let foundPageCitation = false
  let foundConversationTag = false

  // Build a combined regex that matches either citation type.
  const combinedRe = /\[Page (\d+)\]|\[From conversation\]/gi
  let match: RegExpExecArray | null

  while ((match = combinedRe.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index))
    }

    if (match[1] !== undefined) {
      // [Page N] citation — clickable
      foundPageCitation = true
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
    } else {
      // [From conversation] tag — styled non-clickable badge
      foundConversationTag = true
      parts.push(
        <span
          key={match.index}
          style={{
            display: 'inline-block',
            fontSize: 11,
            fontWeight: 500,
            color: '#4A4C4F',
            background: '#F0F0F1',
            borderRadius: 4,
            padding: '1px 6px',
            marginLeft: 4,
            verticalAlign: 'middle',
          }}
        >
          From conversation
        </span>,
      )
    }

    lastIndex = match.index + match[0].length
  }

  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex))
  }

  // "Source: unknown" only applies to contract queries that produced no page citation.
  if (!foundPageCitation && !foundConversationTag && queryType !== 'history' && queryType !== 'both') {
    parts.push(
      <span key="unknown-source" style={{ color: '#9B9C9E', fontSize: 'inherit' }}>
        {' '}Source: unknown
      </span>,
    )
  }

  return parts
}

const SOURCE_LABELS: Record<string, string> = {
  history: 'Answered from conversation history',
  both: 'Answered from contract and conversation',
}

export function MessageBubble({ role, content, createdAt, queryType, onPageClick }: MessageBubbleProps) {
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
  const sourceLabel = !isUser && queryType ? SOURCE_LABELS[queryType] : undefined

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
          : renderContent(content, queryType, onPageClick)}
      </div>
      {sourceLabel && (
        <span style={{ fontSize: 11, color: '#9B9C9E', paddingLeft: 4 }}>
          {sourceLabel}
        </span>
      )}
      {timestamp && (
        <span style={{ fontSize: 11, color: '#9B9C9E', paddingLeft: isUser ? 0 : 4, paddingRight: isUser ? 4 : 0 }}>
          {timestamp}
        </span>
      )}
    </div>
  )
}
