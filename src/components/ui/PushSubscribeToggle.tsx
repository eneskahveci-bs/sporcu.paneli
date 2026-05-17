'use client'
import { useEffect, useState } from 'react'
import { Bell, BellOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { isPushSupported, getCurrentSubscription, subscribePush, unsubscribePush } from '@/lib/push'

export function PushSubscribeToggle() {
  const [supported, setSupported] = useState(false)
  const [active, setActive] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    (async () => {
      const ok = await isPushSupported()
      setSupported(ok)
      if (ok) {
        const sub = await getCurrentSubscription()
        setActive(!!sub)
      }
    })()
  }, [])

  if (!supported) return null

  const handle = async () => {
    setBusy(true)
    try {
      if (active) {
        await unsubscribePush()
        setActive(false)
        toast.success('Bildirim aboneliği iptal edildi')
      } else {
        const r = await subscribePush()
        if (r.ok) {
          setActive(true)
          toast.success('Bildirim aboneliği aktifleşti')
        } else if (r.error === 'permission_denied') {
          toast.error('Bildirim izni reddedildi')
        } else if (r.error === 'no_vapid_key') {
          toast.error('Push servisi yapılandırılmamış')
        } else {
          toast.error('Abonelik hatası: ' + r.error)
        }
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <button onClick={handle} disabled={busy}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 14px', borderRadius: 8, fontSize: 13,
        background: active ? 'var(--grad)' : 'var(--bg3)',
        color: active ? '#fff' : 'var(--text)',
        border: '1px solid var(--border2)', cursor: 'pointer',
      }}>
      {busy ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> :
        active ? <Bell size={14} /> : <BellOff size={14} />}
      {active ? 'Bildirimler Aktif' : 'Bildirimleri Aç'}
    </button>
  )
}
