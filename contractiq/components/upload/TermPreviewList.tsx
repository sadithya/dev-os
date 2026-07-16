'use client'

import { NDA_STANDARD_TERMS } from '@/lib/ai/prompts/nda-extraction'
import { MSA_STANDARD_TERMS } from '@/lib/ai/prompts/msa-extraction'
import { Badge } from '@/components/ui/Badge'

interface TermPreviewListProps {
  contractType: 'nda' | 'msa'
  customTerms: string[]
}

export function TermPreviewList({ contractType, customTerms }: TermPreviewListProps) {
  const standardTerms = contractType === 'nda' ? NDA_STANDARD_TERMS : MSA_STANDARD_TERMS

  return (
    <div>
      <p style={{ fontSize: 14, fontWeight: 500, color: '#070A0E', marginBottom: 10 }}>
        Terms to Extract
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {standardTerms.map((term) => (
          <div
            key={term}
            style={{
              fontSize: 12,
              color: '#070A0E',
              background: '#F0F0F1',
              border: '1px solid #DADADB',
              borderRadius: 6,
              padding: '4px 10px',
              fontWeight: 500,
            }}
          >
            {term}
          </div>
        ))}
        {customTerms.map((term) => (
          <div key={term} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div
              style={{
                fontSize: 12,
                color: '#070A0E',
                background: '#EEF4FF',
                border: '1px solid #B3CAED',
                borderRadius: 6,
                padding: '4px 10px',
                fontWeight: 500,
              }}
            >
              {term}
            </div>
            <Badge variant="info">Custom</Badge>
          </div>
        ))}
      </div>
    </div>
  )
}
