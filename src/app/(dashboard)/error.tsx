'use client'
import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Production'da hata logla (Sentry vb. eklenebilir)
    console.error('Dashboard error:', error)
  }, [error])

  return (
    <div style={{
      minHeight: '60vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{ maxWidth: 480, textAlign: 'center' }}>
        <div style={{
          width: 72, height: 72, borderRadius: 18,
          background: 'rgba(239,68,68,0.12)',
          color: 'var(--red)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <AlertTriangle size={32} />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>
          Beklenmeyen bir hata oluştu
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 8, lineHeight: 1.6 }}>
          Üzgünüz, bu sayfa yüklenemedi. Lütfen tekrar deneyin.
        </p>
        {error.digest && (
          <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 24, fontFamily: 'monospace' }}>
            Hata kimliği: {error.digest}
          </p>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button onClick={reset} className="btn bp">
            <RefreshCw size={14} /> Tekrar Dene
          </button>
          <Link href="/dashboard" className="btn bs" style={{ textDecoration: 'none' }}>
            <Home size={14} /> Ana Sayfa
          </Link>
        </div>
      </div>
    </div>
  )
}
