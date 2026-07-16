interface SourceSentenceProps {
  sourceSentence: string
  isExpanded: boolean
  onToggle: () => void
}

export function SourceSentence({ sourceSentence, isExpanded, onToggle }: SourceSentenceProps) {
  if (!sourceSentence) return null

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: 12,
          color: '#4A4C4F',
          fontWeight: 500,
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
        aria-expanded={isExpanded}
      >
        {isExpanded ? '▲' : '▼'} Why?
      </button>
      {isExpanded && (
        <blockquote
          style={{
            borderLeft: '2px solid #DADADB',
            paddingLeft: 12,
            marginTop: 8,
            marginLeft: 0,
            marginRight: 0,
            marginBottom: 0,
          }}
        >
          <p style={{ fontSize: 12, color: '#4A4C4F', fontStyle: 'italic', margin: 0, lineHeight: 1.6 }}>
            {sourceSentence}
          </p>
        </blockquote>
      )}
    </div>
  )
}
