import './globals.css'

export const metadata = {
  title: 'ContractIQ — AI Contract Review',
  description: 'Review NDAs and MSAs in minutes. AI-powered key term extraction, confidence scoring, and plain-English Q&A.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}
