import Link from 'next/link'
import { createPageClient } from '@/lib/supabase/server'
import { StatCard } from '@/components/dashboard/StatCard'
import { ContractTable } from '@/components/dashboard/ContractTable'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = createPageClient()

  const { data: { session } } = await supabase.auth.getSession()

  const { data: contracts } = await supabase
    .from('contracts')
    .select('id, file_name, contract_type, status, page_count, created_at')
    .eq('user_id', session?.user.id ?? '')
    .order('created_at', { ascending: false })

  const contractList = contracts ?? []
  const total = contractList.length
  const ndaCount = contractList.filter((c) => c.contract_type === 'nda').length
  const msaCount = contractList.filter((c) => c.contract_type === 'msa').length

  return (
    <div style={{ padding: '40px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <h1 style={{ fontSize: 30, fontWeight: 600, color: '#070A0E', margin: 0 }}>Dashboard</h1>
        <Link href="/upload">
          <Button variant="primary">Review a Contract</Button>
        </Link>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 40, flexWrap: 'wrap' }}>
        <StatCard label="Total Contracts" value={total} />
        <StatCard label="NDAs" value={ndaCount} />
        <StatCard label="MSAs" value={msaCount} />
      </div>

      <div>
        <h2 style={{ fontSize: 24, fontWeight: 500, color: '#070A0E', margin: '0 0 16px' }}>
          Your Contracts
        </h2>
        {contractList.length === 0 ? (
          <EmptyState />
        ) : (
          <ContractTable contracts={contractList} />
        )}
      </div>
    </div>
  )
}
