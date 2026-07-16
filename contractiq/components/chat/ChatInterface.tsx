'use client'

import { useEffect, useRef, useState } from 'react'
import { Send, MessageCircle } from 'lucide-react'
import { MessageBubble } from './MessageBubble'
import { Spinner } from '@/components/ui/Spinner'
import { Banner } from '@/components/ui/Banner'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at?: string
}

interface ChatInterfaceProps {
  contractId: string
  initialSessionId: string | null
  onPageClick: (page: number) => void
}

const SUGGESTIONS = [
  'What are the key obligations of each party?',
  'What happens if either party breaches this agreement?',
  'What are the termination conditions?',
]

const MAX_CHARS = 4000

export function ChatInterface({ contractId, initialSessionId, onPageClick }: ChatInterfaceProps) {
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [initLoading, setInitLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const optimisticIdRef = useRef(0)

  useEffect(() => {
    async function init() {
      try {
        let sid = initialSessionId
        if (!sid) {
          const res = await fetch('/api/chat/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contract_id: contractId }),
          })
          const json = await res.json()
          if (!res.ok) throw new Error(json?.error?.message)
          sid = json.data.session_id
          setSessionId(sid)
        }

        if (sid) {
          const res = await fetch(`/api/chat/${sid}/messages`)
          const json = await res.json()
          if (res.ok) setMessages(json.data.messages ?? [])
        }
      } catch {
        setError('Failed to load chat. Please refresh.')
      } finally {
        setInitLoading(false)
      }
    }

    init()
  }, [contractId, initialSessionId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    const trimmed = inputValue.trim()
    if (!trimmed || !sessionId || isLoading) return

    const optimisticId = `opt-${++optimisticIdRef.current}`
    const optimisticMsg: Message = { id: optimisticId, role: 'user', content: trimmed }
    setMessages((prev) => [...prev, optimisticMsg])
    setInputValue('')
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract_id: contractId, session_id: sessionId, content: trimmed }),
      })
      const json = await res.json()

      if (!res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId))
        setError(json?.error?.message ?? 'Failed to send message. Try again.')
        setInputValue(trimmed)
        return
      }

      setMessages((prev) => [
        ...prev,
        {
          id: json.data.message_id,
          role: 'assistant',
          content: json.data.content,
          created_at: json.data.created_at,
        },
      ])
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId))
      setError('Network error. Please try again.')
      setInputValue(trimmed)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const charCount = inputValue.length
  const isOverLimit = charCount > MAX_CHARS

  if (initLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Spinner size="md" color="#115ACB" />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #F0F0F1', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MessageCircle size={16} color="#115ACB" />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#070A0E' }}>Chat with this contract</span>
        </div>
      </div>

      {/* Messages */}
      <div
        aria-live="polite"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {messages.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 16, padding: '32px 0' }}>
            <MessageCircle size={32} color="#DADADB" />
            <p style={{ fontSize: 14, color: '#4A4C4F', textAlign: 'center', margin: 0 }}>
              Ask anything about this contract.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setInputValue(s)}
                  style={{
                    textAlign: 'left',
                    padding: '10px 12px',
                    background: '#FAFAFA',
                    border: '1px solid #F0F0F1',
                    borderRadius: 8,
                    fontSize: 13,
                    color: '#4A4C4F',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              role={msg.role}
              content={msg.content}
              createdAt={msg.created_at}
              onPageClick={onPageClick}
            />
          ))
        )}
        {isLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
            <Spinner size="sm" color="#115ACB" />
            <span style={{ fontSize: 13, color: '#9B9C9E' }}>Thinking…</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '0 16px 8px' }}>
          <Banner variant="error" message={error} onDismiss={() => setError(null)} />
        </div>
      )}

      {/* Input area */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid #F0F0F1', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question… (Enter to send)"
              rows={1}
              disabled={isLoading}
              style={{
                width: '100%',
                border: `1px solid ${isOverLimit ? '#D13438' : '#DADADB'}`,
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 14,
                resize: 'none',
                outline: 'none',
                color: '#070A0E',
                fontFamily: 'inherit',
                maxHeight: 120,
                overflowY: 'auto',
                boxSizing: 'border-box',
              }}
            />
            {charCount > MAX_CHARS * 0.8 && (
              <div style={{ fontSize: 11, color: isOverLimit ? '#D13438' : '#9B9C9E', textAlign: 'right', marginTop: 2 }}>
                {charCount} / {MAX_CHARS}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading || isOverLimit}
            style={{
              width: 38,
              height: 38,
              flexShrink: 0,
              background: !inputValue.trim() || isLoading || isOverLimit ? '#DADADB' : '#115ACB',
              border: 'none',
              borderRadius: 8,
              cursor: !inputValue.trim() || isLoading || isOverLimit ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Send message"
          >
            <Send size={16} color="#FFFFFF" />
          </button>
        </div>
      </div>
    </div>
  )
}
