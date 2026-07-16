'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'

interface Contract {
  id: string
  file_name: string
  contract_type: 'nda' | 'msa'
  status: 'pending' | 'processing' | 'completed' | 'error'
  page_count: number
  created_at: string
}

interface ContractTableProps {
  contracts: Contract[]
}

type SortKey = 'file_name' | 'contract_type' | 'created_at' | 'status'

const STATUS_VARIANT: Record<string, 'default' | 'warning' | 'success' | 'error'> = {
  pending:    'default',
  processing: 'warning',
  completed:  'success',
  error:      'error',
}

const STATUS_LABEL: Record<string, string> = {
  pending:    'Pending',
  processing: 'Processing',
  completed:  'Completed',
  error:      'Error',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function ContractTable({ contracts }: ContractTableProps) {
  const router = useRouter()
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sorted = [...contracts].sort((a, b) => {
    const aVal = a[sortKey] as string
    const bVal = b[sortKey] as string
    const dir = sortDir === 'asc' ? 1 : -1
    return aVal < bVal ? -dir : aVal > bVal ? dir : 0
  })

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronDown size={12} color="#C1C2C3" />
    return sortDir === 'asc' ? <ChevronUp size={12} color="#115ACB" /> : <ChevronDown size={12} color="#115ACB" />
  }

  const thStyle: React.CSSProperties = {
    textAlign: 'left',
    fontSize: 12,
    fontWeight: 500,
    color: '#4A4C4F',
    padding: '8px 16px',
    borderBottom: '1px solid #DADADB',
    background: '#FAFAFA',
    cursor: 'pointer',
    userSelect: 'none',
    whiteSpace: 'nowrap',
  }

  const tdStyle: React.CSSProperties = {
    fontSize: 14,
    color: '#070A0E',
    padding: '14px 16px',
    borderBottom: '1px solid #F0F0F1',
  }

  return (
    <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #DADADB', background: '#FFFFFF' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {([
              ['file_name', 'Contract Name'],
              ['contract_type', 'Type'],
              ['created_at', 'Date Uploaded'],
              ['status', 'Status'],
            ] as [SortKey, string][]).map(([key, label]) => (
              <th key={key} style={thStyle} onClick={() => handleSort(key)}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  {label} <SortIcon col={key} />
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((c) => (
            <tr
              key={c.id}
              onClick={() => router.push(`/contracts/${c.id}`)}
              onKeyDown={(e) => e.key === 'Enter' && router.push(`/contracts/${c.id}`)}
              role="button"
              tabIndex={0}
              style={{ cursor: 'pointer' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#FAFAFA')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <td style={tdStyle}>
                <span style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                  {c.file_name}
                </span>
              </td>
              <td style={tdStyle}>
                <Badge variant="info">{c.contract_type.toUpperCase()}</Badge>
              </td>
              <td style={{ ...tdStyle, color: '#4A4C4F' }}>{formatDate(c.created_at)}</td>
              <td style={tdStyle}>
                <Badge variant={STATUS_VARIANT[c.status]}>{STATUS_LABEL[c.status]}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
