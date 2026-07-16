'use client'

import { useEffect, useRef, useState } from 'react'
import { Download, FileWarning } from 'lucide-react'
import { Spinner } from '@/components/ui/Spinner'

interface PDFViewerProps {
  signedUrl: string
  fileName: string
  targetPage: number
}

interface PageRender {
  canvas: HTMLCanvasElement
  rendered: boolean
}

export function PDFViewer({ signedUrl, fileName, targetPage }: PDFViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [numPages, setNumPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [renderError, setRenderError] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfDocRef = useRef<any>(null)
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({})
  const renderedPages = useRef<Set<number>>(new Set())

  useEffect(() => {
    let cancelled = false

    async function loadPDF() {
      try {
        const pdfjsLib = await import('pdfjs-dist')
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
        const doc = await pdfjsLib.getDocument(signedUrl).promise
        if (cancelled) return
        pdfDocRef.current = doc
        setNumPages(doc.numPages)
        setLoading(false)
      } catch {
        if (!cancelled) setRenderError(true)
      }
    }

    loadPDF()
    return () => { cancelled = true }
  }, [signedUrl])

  useEffect(() => {
    if (targetPage < 1 || !pageRefs.current[targetPage]) return
    pageRefs.current[targetPage]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [targetPage])

  useEffect(() => {
    if (numPages === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          const el = entry.target as HTMLDivElement
          const pageNum = parseInt(el.dataset.page ?? '0', 10)
          if (!pageNum || renderedPages.current.has(pageNum)) return
          renderedPages.current.add(pageNum)
          renderPage(pageNum, el)
        })
      },
      { root: containerRef.current, rootMargin: '200px', threshold: 0 },
    )

    Object.values(pageRefs.current).forEach((el) => { if (el) observer.observe(el) })
    return () => observer.disconnect()
  }, [numPages])

  async function renderPage(pageNum: number, container: HTMLDivElement) {
    if (!pdfDocRef.current) return
    try {
      const page = await pdfDocRef.current.getPage(pageNum)
      const viewport = page.getViewport({ scale: 1.5 })
      const canvas = document.createElement('canvas')
      canvas.width = viewport.width
      canvas.height = viewport.height
      canvas.style.display = 'block'
      canvas.style.width = '100%'
      canvas.style.boxShadow = '0 1px 4px rgba(0,0,0,0.10)'
      canvas.style.borderRadius = '4px'
      const ctx = canvas.getContext('2d')!
      await page.render({ canvasContext: ctx, viewport }).promise
      container.innerHTML = ''
      container.appendChild(canvas)
    } catch {
      // silently ignore single page render failure
    }
  }

  if (renderError) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 400, gap: 12 }}>
        <FileWarning size={32} color="#4A4C4F" />
        <p style={{ fontSize: 14, color: '#4A4C4F' }}>PDF preview unavailable</p>
        <a
          href={signedUrl}
          download={fileName}
          style={{ fontSize: 14, color: '#115ACB', fontWeight: 500, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Download size={14} /> Download PDF
        </a>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
        <Spinner size="lg" color="#115ACB" />
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 64px)', padding: '16px', background: '#E8E8E8' }}
    >
      {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
        <div
          key={pageNum}
          data-page={pageNum}
          ref={(el) => { pageRefs.current[pageNum] = el }}
          style={{ marginBottom: 8, minHeight: 200, background: '#FFFFFF', borderRadius: 4 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
            <Spinner size="md" color="#DADADB" />
          </div>
        </div>
      ))}
    </div>
  )
}
