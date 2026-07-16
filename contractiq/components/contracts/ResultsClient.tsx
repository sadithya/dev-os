'use client'

import { useEffect, useState } from 'react'
import { MessageCircle, X } from 'lucide-react'
import { PDFViewer } from '@/components/viewer/PDFViewer'
import { TextViewerFallback } from '@/components/viewer/TextViewerFallback'
import { KeyTermsPanel } from '@/components/contracts/KeyTermsPanel'
import { ChatInterface } from '@/components/chat/ChatInterface'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { Banner } from '@/components/ui/Banner'
import { Button } from '@/components/ui/Button'

interface KeyTerm {
  id: string
  term_name: string
  value: string
  ai_value: string | null
  page_number: number
  confidence_score: number
  source_sentence: string
  is_manual: boolean
  is_edited: boolean
}

interface Contract {
  id: string
  file_name: string
  contract_type: 'nda' | 'msa'
  status: string
  page_count: number
  created_at: string
  contract_text: string
  signed_url: string | null
}

interface ResultsClientProps {
  contract: Contract
  keyTerms: KeyTerm[]
  chatSessionId: string | null
  existingFeedback: { rating: string } | null
}

const POLL_INTERVAL = 3000

export function ResultsClient({ contract: initialContract, keyTerms: initialTerms, chatSessionId, existingFeedback }: ResultsClientProps) {
  const [contract, setContract] = useState(initialContract)
  const [keyTerms, setKeyTerms] = useState(initialTerms)
  const [targetPage, setTargetPage] = useState(1)
  const [reprocessing, setReprocessing] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)

  const isProcessing = contract.status === 'processing' || contract.status === 'pending'
  const isError = contract.status === 'error'

  useEffect(() => {
    if (!isProcessing) return
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/contracts/${contract.id}`)
        if (!res.ok) return
        const json = await res.json()
        if (json.data.contract.status !== 'processing' && json.data.contract.status !== 'pending') {
          setContract(json.data.contract)
          setKeyTerms(json.data.key_terms)
          clearInterval(interval)
        }
      } catch { /* ignore */ }
    }, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [isProcessing, contract.id])

  const handleReprocess = async () => {
    setReprocessing(true)
    try {
      const res = await fetch('/api/contracts/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract_id: contract.id, custom_terms: [] }),
      })
      if (res.ok) {
        setContract((c) => ({ ...c, status: 'processing' }))
      }
    } catch { /* ignore */ }
    setReprocessing(false)
  }

  if (isProcessing) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
        <Spinner size="lg" color="#115ACB" />
        <p style={{ fontSize: 16, color: '#4A4C4F' }}>Still processing your contract…</p>
        <p style={{ fontSize: 13, color: '#9B9C9E' }}>This page will update automatically</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      {/* Left: viewer (60%) */}
      <div style={{ flex: '0 0 60%', borderRight: '1px solid #DADADB', overflow: 'hidden' }}>
        {isError ? (
          <div style={{ padding: 40, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Banner
              variant="error"
              message="AI processing failed. Please try reprocessing the contract."
              dismissible={false}
            />
            <Button variant="primary" onClick={handleReprocess} disabled={reprocessing}>
              {reprocessing ? 'Reprocessing…' : 'Reprocess Contract'}
            </Button>
          </div>
        ) : contract.signed_url ? (
          <PDFViewer
            signedUrl={contract.signed_url}
            fileName={contract.file_name}
            targetPage={targetPage}
          />
        ) : (
          <TextViewerFallback
            contractText={contract.contract_text}
            targetPage={targetPage}
          />
        )}
      </div>

      {/* Right: key terms panel (40%) */}
      <div style={{ flex: '0 0 40%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Panel header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #F0F0F1', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#070A0E', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {contract.file_name}
            </span>
            <Badge variant="info">{contract.contract_type.toUpperCase()}</Badge>
          </div>
        </div>

        <KeyTermsPanel
          initialTerms={keyTerms}
          onPageClick={setTargetPage}
          contractId={contract.id}
          chatSessionId={chatSessionId}
          existingFeedback={existingFeedback}
        />
      </div>

      {/* Floating chat panel */}
      {isChatOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: 80,
            right: 24,
            width: 380,
            height: 520,
            background: '#FFFFFF',
            border: '1px solid #DADADB',
            borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 50,
            overflow: 'hidden',
          }}
        >
          <ChatInterface
            contractId={contract.id}
            initialSessionId={chatSessionId}
            onPageClick={(page) => { setTargetPage(page); setIsChatOpen(false) }}
          />
        </div>
      )}

      {/* Chat toggle button */}
      <button
        type="button"
        onClick={() => setIsChatOpen((v) => !v)}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: '#115ACB',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(17,90,203,0.3)',
          zIndex: 51,
        }}
        aria-label={isChatOpen ? 'Close chat' : 'Open chat'}
      >
        {isChatOpen ? <X size={20} color="#FFFFFF" /> : <MessageCircle size={20} color="#FFFFFF" />}
      </button>
    </div>
  )
}
