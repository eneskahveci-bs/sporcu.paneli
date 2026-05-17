'use client'
import { useState } from 'react'
import { Calendar, Copy, Download, Loader2, Check } from 'lucide-react'
import { toast } from 'sonner'

export function CalendarExportButton() {
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [copied, setCopied] = useState(false)

  const fetchUrl = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/calendar/feed-url')
      const j = await res.json()
      if (!res.ok) {
        toast.error(j.error === 'not_configured' ? 'Takvim servisi yapılandırılmamış' : 'Hata: ' + (j.error || res.status))
        return
      }
      setUrl(j.feedUrl)
      setOpen(true)
    } catch (e) {
      toast.error('Hata: ' + (e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const copy = async () => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    toast.success('Link kopyalandı')
    setTimeout(() => setCopied(false), 2000)
  }

  const download = () => {
    window.open(url, '_blank')
  }

  return (
    <>
      <button onClick={fetchUrl} disabled={loading}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
          background: 'var(--bg3)', border: '1px solid var(--border2)',
          color: 'var(--text)', borderRadius: 8, fontSize: 13, cursor: 'pointer',
        }}>
        {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Calendar size={14} />}
        Takvime Ekle
      </button>

      {open && (
        <div onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 14, padding: 24, maxWidth: 520, width: '100%' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Antrenman Takvimi</h3>
            <p style={{ color: 'var(--text3)', fontSize: 13, marginBottom: 16 }}>
              Bu linki Google/Apple Calendar&apos;a ekleyin; antrenman programınız otomatik senkronize olur.
            </p>
            <div style={{ background: 'var(--bg3)', padding: 10, borderRadius: 8, fontSize: 11, wordBreak: 'break-all', color: 'var(--text2)', marginBottom: 12, fontFamily: 'monospace' }}>
              {url}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={copy} className="btn bs" style={{ flex: 1 }}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Kopyalandı' : 'Linki Kopyala'}
              </button>
              <button onClick={download} className="btn bp" style={{ flex: 1 }}>
                <Download size={14} /> .ics İndir
              </button>
            </div>
            <button onClick={() => setOpen(false)} style={{ marginTop: 12, width: '100%', background: 'transparent', border: 'none', color: 'var(--text3)', padding: 8, cursor: 'pointer' }}>
              Kapat
            </button>
          </div>
        </div>
      )}
    </>
  )
}
