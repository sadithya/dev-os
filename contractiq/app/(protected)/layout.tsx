import { Nav } from '@/components/layout/Nav'

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main style={{ minHeight: 'calc(100vh - 64px)', backgroundColor: '#FAFAFA' }}>
        {children}
      </main>
    </>
  )
}
