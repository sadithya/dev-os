import Link from 'next/link'
import { FileText } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function EmptyState() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '64px 0',
        gap: 16,
      }}
    >
      <FileText size={48} color="#C1C2C3" />
      <h3 style={{ fontSize: 24, fontWeight: 500, color: '#070A0E', margin: 0 }}>
        No contracts reviewed yet
      </h3>
      <p style={{ fontSize: 16, color: '#4A4C4F', margin: 0 }}>
        Upload your first contract to get started.
      </p>
      <Link href="/upload">
        <Button variant="primary">Review a Contract</Button>
      </Link>
    </div>
  )
}
