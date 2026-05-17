'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Camera, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

declare global {
  interface Window {
    Html5Qrcode?: new (elementId: string) => {
      start: (cameraIdOrConfig: unknown, config: { fps: number; qrbox: { width: number; height: number } }, onSuccess: (decoded: string) => void, onError?: (e: string) => void) => Promise<void>
      stop: () => Promise<void>
      clear: () => void
    }
    Html5QrcodeScannerState?: unknown
  }
}

function loadScanner(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Html5Qrcode) return resolve()
    const s = document.createElement('script')
    s.src = 'https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js'
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('scanner lib load failed'))
    document.head.appendChild(s)
  })
}

interface ScanResult { ok: boolean; athlete?: string; error?: string; time: number }

export default function QRScanPage() {
  const supabase = createClient()
  const [classes, setClasses] = useState<{ id: string; name: string; sport?: { name: string } | null }[]>([])
  const [classId, setClassId] = useState('')
  const [scanning, setScanning] = useState(false)
  const [history, setHistory] = useState<ScanResult[]>([])
  const [error, setError] = useState('')
  const scannerRef = useRef<InstanceType<NonNullable<typeof window.Html5Qrcode>> | null>(null)
  const recentTokensRef = useRef<Map<string, number>>(new Map())

  const loadClasses = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: coach } = await supabase.from('coaches').select('id, organization_id').eq('auth_user_id', user.id).maybeSingle()
    if (!coach) return
    const { data } = await supabase
      .from('classes')
      .select('id, name, sport:sports(name)')
      .eq('coach_id', coach.id)
      .eq('is_active', true)
      .order('name')
    setClasses(((data || []) as unknown) as { id: string; name: string; sport?: { name: string } | null }[])
  }, [supabase])

  useEffect(() => { loadClasses() }, [loadClasses])

  const startScan = async () => {
    if (!classId) { toast.error('Önce sınıf seçin'); return }
    setError('')
    try {
      await loadScanner()
      if (!window.Html5Qrcode) throw new Error('Tarayıcı yüklenemedi')

      const Html5Qrcode = window.Html5Qrcode
      scannerRef.current = new Html5Qrcode('qr-reader')

      await scannerRef.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decoded) => onScan(decoded),
        () => {}
      )
      setScanning(true)
    } catch (e) {
      setError('Kamera açılamadı: ' + (e as Error).message)
      toast.error('Kamera açılamadı. İzin verdiniz mi?')
    }
  }

  const stopScan = useCallback(async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); scannerRef.current.clear() } catch {}
      scannerRef.current = null
    }
    setScanning(false)
  }, [])

  useEffect(() => () => { stopScan() }, [stopScan])

  const onScan = async (token: string) => {
    // Aynı tokeni 3 saniye içinde tekrar işleme
    const now = Date.now()
    const last = recentTokensRef.current.get(token) || 0
    if (now - last < 3000) return
    recentTokensRef.current.set(token, now)

    const { data, error: rpcErr } = await supabase.rpc('mark_attendance_by_qr', {
      p_token: token,
      p_class_id: classId,
    })

    const result: ScanResult = { ok: false, time: now }
    if (rpcErr) {
      result.error = rpcErr.message
    } else if (data?.ok) {
      result.ok = true
      result.athlete = data.athlete
      if (navigator.vibrate) navigator.vibrate(80)
      toast.success(`✓ ${data.athlete} yoklamada`)
    } else if (data?.error === 'already_marked') {
      result.error = `${data.athlete} bugün zaten kayıtlı`
      toast.info(result.error)
    } else if (data?.error === 'invalid_token') {
      result.error = 'Geçersiz QR kodu'
    } else {
      result.error = 'Bilinmeyen hata'
    }
    setHistory(h => [result, ...h.slice(0, 19)])
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: 12 }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Link href="/antrenor" style={{ color: 'var(--text2)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
            <ArrowLeft size={18} /> Geri
          </Link>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Camera size={24} color="var(--blue2)" />
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>QR ile Yoklama</h1>
        </div>

        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <label className="form-label required">Sınıf</label>
          <select className="form-input" value={classId} onChange={e => setClassId(e.target.value)} disabled={scanning}>
            <option value="">Seçin...</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} {c.sport?.name ? `- ${c.sport.name}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div id="qr-reader" style={{
          width: '100%', maxWidth: 400, margin: '0 auto', minHeight: scanning ? 300 : 0,
          background: scanning ? '#000' : 'transparent', borderRadius: 12, overflow: 'hidden',
        }} />

        <div style={{ marginTop: 16, textAlign: 'center' }}>
          {!scanning ? (
            <button className="btn bp" onClick={startScan} disabled={!classId} style={{ width: '100%', padding: '14px' }}>
              <Camera size={18} /> Taramayı Başlat
            </button>
          ) : (
            <button className="btn bd" onClick={stopScan} style={{ width: '100%', padding: '14px' }}>
              Taramayı Durdur
            </button>
          )}
        </div>

        {error && (
          <div style={{ marginTop: 12, padding: 12, background: 'rgba(239,68,68,0.1)', borderRadius: 8, color: 'var(--red, #ef4444)', fontSize: 13 }}>
            {error}
          </div>
        )}

        {history.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text2)', marginBottom: 8 }}>Son Taramalar</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {history.map((h, i) => (
                <div key={i} className="card" style={{
                  padding: 10, display: 'flex', alignItems: 'center', gap: 8,
                  borderLeft: `3px solid ${h.ok ? 'var(--green, #22c55e)' : 'var(--text3)'}`,
                }}>
                  {h.ok ? <CheckCircle size={16} color="#22c55e" /> : <AlertCircle size={16} color="#f59e0b" />}
                  <div style={{ flex: 1, fontSize: 13 }}>
                    {h.ok ? h.athlete : h.error}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                    {new Date(h.time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
