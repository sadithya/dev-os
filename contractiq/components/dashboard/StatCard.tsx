interface StatCardProps {
  label: string
  value: number
}

export function StatCard({ label, value }: StatCardProps) {
  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #DADADB',
        borderRadius: 8,
        padding: 24,
        flex: '1 0 0',
        minWidth: 140,
      }}
    >
      <div style={{ fontSize: 36, fontWeight: 700, color: '#070A0E', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: '#4A4C4F', marginTop: 6, fontWeight: 400 }}>{label}</div>
    </div>
  )
}
