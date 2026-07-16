import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ContractIQ — AI Contract Review',
  description:
    'Review NDAs and MSAs in minutes. AI-powered key term extraction, confidence scoring, and plain-English Q&A.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
