'use client'
import { useEffect, useState, useRef } from 'react'
import { QrCode, RefreshCw, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

// qr-creator CDN — küçük (~10KB), pure JS
declare global {
  interface Window {
    QrCreator?: {
      render: (config: { text: string; radius?: number; ecLevel?: string; fill?: string; background?: string; size: number }, el: HTMLElement) => void
    }
  }
}

function loadQrLib(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.QrCreator) return resolve()
    const existing = document.querySelector('script[data-qr-creator]')
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('qr lib load failed')))
      return
    }
    const s = document.createElement('script')
    s.src = 'https://cdn.jsdelivr.net/npm/qr-creator@1.0.0/dist/qr-creator.min.js'
    s.async = true
    s.dataset.qrCreator = '1'
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('qr lib load failed'))
    document.head.appendChild(s)
  })
}

export function QRDisplay() {
  const [token, setToken] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [rotating, setRotating] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const fetchToken = async (rotate = false) => {
    try {
      const res = await fetch('/api/qr/my-token', { method: rotate ? 'POST' : 'GET' })
      const j = await res.json()
      if (!res.ok) {
        toast.error('Hata: ' + (j.error || res.status))
        return
      }
      setToken(j.token)
      if (j.name) setName(j.name)
    } catch (e) {
      toast.error('Hata: ' + (e as Error).message)
    }
  }

  useEffect(() => {
    (async () => {
      await fetchToken()
      setLoading(false)
    })()
  }, [])

  useEffect(() => {
    if (!token || !containerRef.current) return
    let cancelled = false
    loadQrLib().then(() => {
      if (cancelled || !containerRef.current || !window.QrCreator) return
      containerRef.current.innerHTML = ''
      window.QrCreator.render({
        text: token,
        radius: 0.0,
        ecLevel: 'H',
        fill: '#0f172a',
        background: '#ffffff',
        size: 256,
      }, containerRef.current)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [token])

  const handleRotate = async () => {
    setRotating(true)
    await fetchToken(true)
    setRotating(false)
    toast.success('QR yenilendi')
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}><Loader2 className="spin" size={24} /></div>
  }

  return (
    <div className="card" style={{ padding: 20, textAlign: 'center', maxWidth: 360, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 14 }}>
        <QrCode size={20} color="var(--blue2)" />
        <h3 style={{ fontSize: 16, fontWeight: 700 }}>QR Yoklama Kodum</h3>
      </div>
      {name && <div style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 12 }}>{name}</div>}

      <div ref={containerRef} style={{ display: 'inline-block', padding: 12, background: '#fff', borderRadius: 10 }} />

      <p style={{ marginTop: 14, color: 'var(--text3)', fontSize: 12, lineHeight: 1.5 }}>
        Antrenörünüze QR kodunu tarattırın, yoklama otomatik kaydedilir.
      </p>

      <button onClick={handleRotate} disabled={rotating}
        style={{
          marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'var(--bg3)', border: '1px solid var(--border2)',
          color: 'var(--text2)', padding: '6px 12px', borderRadius: 6,
          fontSize: 12, cursor: 'pointer',
        }}>
        {rotating ? <Loader2 size={12} className="spin" /> : <RefreshCw size={12} />}
        QR&apos;ı Yenile
      </button>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .spin{animation:spin 1s linear infinite}`}</style>
    </div>
  )
}
