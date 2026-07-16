'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ContractTypeSelector } from '@/components/upload/ContractTypeSelector'
import { DropZone } from '@/components/upload/DropZone'
import { TermPreviewList } from '@/components/upload/TermPreviewList'
import { CustomTermInput } from '@/components/upload/CustomTermInput'
import { ProcessingProgress } from '@/components/upload/ProcessingProgress'
import { Button } from '@/components/ui/Button'
import { Banner } from '@/components/ui/Banner'

type Step = 'configure' | 'processing'

export default function UploadPage() {
  const router = useRouter()

  const [step, setStep] = useState<Step>('configure')
  const [contractType, setContractType] = useState<'nda' | 'msa' | ''>('')
  const [file, setFile] = useState<File | null>(null)
  const [customTerms, setCustomTerms] = useState<string[]>([])
  const [uploadError, setUploadError] = useState<string | null>(null)

  const [processingStep, setProcessingStep] = useState<0 | 1 | 2>(0)
  const [processingError, setProcessingError] = useState<string | null>(null)

  const canSubmit = contractType !== '' && file !== null

  const handleAddTerm = (term: string) => {
    setCustomTerms((prev) => [...prev, term])
  }

  const handleRemoveTerm = (term: string) => {
    setCustomTerms((prev) => prev.filter((t) => t !== term))
  }

  const handleSubmit = async () => {
    if (!canSubmit || !contractType) return
    setUploadError(null)
    setProcessingError(null)
    setStep('processing')
    setProcessingStep(0)

    // Step 1 — Upload
    const formData = new FormData()
    formData.append('file', file!)
    formData.append('contract_type', contractType)

    let contractId: string
    try {
      const uploadRes = await fetch('/api/contracts/upload', { method: 'POST', body: formData })
      const uploadJson = await uploadRes.json()

      if (!uploadRes.ok) {
        const msg = uploadJson?.error?.message ?? 'Upload failed. Please try again.'
        setProcessingError(msg)
        return
      }
      contractId = uploadJson.data.contract_id
    } catch {
      setProcessingError('Network error. Please check your connection and try again.')
      return
    }

    setProcessingStep(1)

    // Step 2 — Save custom terms
    if (customTerms.length > 0) {
      try {
        await Promise.all(
          customTerms.map((term) =>
            fetch('/api/contracts/custom-terms', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contract_id: contractId, term_name: term }),
            }),
          ),
        )
      } catch {
        // Non-fatal — extraction will use only standard terms
      }
    }

    setProcessingStep(2)

    // Step 3 — Process
    try {
      const processRes = await fetch('/api/contracts/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract_id: contractId, custom_terms: customTerms }),
      })
      const processJson = await processRes.json()

      if (!processRes.ok) {
        const code = processJson?.error?.code
        const message = processJson?.error?.message ?? 'Processing failed. Please try again.'
        if (code === 'RATE_LIMIT_EXCEEDED') {
          setProcessingError('You have reached the processing limit. Please wait before processing another contract.')
        } else {
          setProcessingError(message)
        }
        return
      }
    } catch {
      setProcessingError('Processing failed. Please try again.')
      return
    }

    router.push(`/contracts/${contractId}`)
  }

  if (step === 'processing') {
    return (
      <div style={{ padding: '60px 40px', maxWidth: 560, margin: '0 auto' }}>
        <ProcessingProgress currentStep={processingStep} error={processingError} />
        {processingError && (
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <Button
              variant="secondary"
              onClick={() => {
                setStep('configure')
                setProcessingError(null)
                setProcessingStep(0)
              }}
            >
              Try Again
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ padding: '40px', maxWidth: 640, margin: '0 auto' }}>
      <h1 style={{ fontSize: 30, fontWeight: 600, color: '#070A0E', marginBottom: 4 }}>
        Review a Contract
      </h1>
      <p style={{ fontSize: 15, color: '#4A4C4F', marginBottom: 32 }}>
        Upload a PDF and we'll extract the key terms automatically.
      </p>

      {uploadError && (
        <div style={{ marginBottom: 20 }}>
          <Banner variant="error" message={uploadError} onDismiss={() => setUploadError(null)} />
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        <ContractTypeSelector
          value={contractType}
          onChange={setContractType}
        />

        <DropZone
          file={file}
          onFile={setFile}
          onClear={() => setFile(null)}
          disabled={contractType === ''}
        />

        {contractType !== '' && (
          <>
            <CustomTermInput
              terms={customTerms}
              onAdd={handleAddTerm}
              onRemove={handleRemoveTerm}
            />

            <TermPreviewList
              contractType={contractType}
              customTerms={customTerms}
            />
          </>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8 }}>
          <Button
            variant="primary"
            size="lg"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            Analyse Contract
          </Button>
        </div>
      </div>
    </div>
  )
}
