'use client'
import { useEffect, useState, useCallback } from 'react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import { Bell, Send, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { confirmDialog } from '@/components/ui/ConfirmDialog'
import { formatDateTime } from '@/lib/utils/formatters'

interface Broadcast {
  id: string
  title: string
  body: string
  target: string
  sent_count: number
  failed_count: number
  created_at: string
}

export default function NotificationsPage() {
  const supabase = createClient()
  const [tab, setTab] = useState<'send' | 'logs'>('send')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [target, setTarget] = useState<'all' | 'custom'>('all')
  const [sending, setSending] = useState(false)
  const [logs, setLogs] = useState<Broadcast[]>([])
  const [subscriberCount, setSubscriberCount] = useState(0)

  const loadStats = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const orgId = user?.user_metadata?.organization_id
    if (!orgId) return
    const [{ count }, { data: logsData }] = await Promise.all([
      supabase.from('push_subscriptions').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
      supabase.from('push_broadcasts').select('*').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(50),
    ])
    setSubscriberCount(count || 0)
    setLogs(logsData || [])
  }, [supabase])

  useEffect(() => { loadStats() }, [loadStats])

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error('Başlık ve mesaj gerekli')
      return
    }
    if (!await confirmDialog({ title: 'Bildirim Gönder', message: `${subscriberCount} aboneye gönderilecek. Devam edilsin mi?`, variant: 'info', confirmText: 'Gönder' })) return

    setSending(true)
    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-push-broadcast`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title, message, target }),
      })
      const result = await res.json()
      if (!res.ok) {
        toast.error('Gönderim hatası: ' + (result.error || res.status))
      } else {
        toast.success(`${result.sent} bildirim gönderildi (${result.failed} başarısız)`)
        setTitle(''); setMessage('')
        loadStats()
      }
    } catch (e) {
      toast.error('Gönderim hatası: ' + (e as Error).message)
    } finally {
      setSending(false)
    }
  }

  return (
    <DashboardLayout title="Push Bildirimleri">
      <div className="page-header">
        <div>
          <h1 className="page-title">Push Bildirimleri</h1>
          <p className="page-subtitle">{subscriberCount} aktif abone</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: '1px solid var(--border)' }}>
        {([['send', 'Bildirim Gönder'], ['logs', 'Geçmiş']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={`btn bs ${tab === key ? 'btn-active' : ''}`}
            style={{ borderRadius: 0, borderBottom: tab === key ? '2px solid var(--blue2)' : '2px solid transparent', background: 'transparent' }}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'send' && (
        <div className="card" style={{ maxWidth: 600, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--grad)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bell size={20} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Toplu Bildirim</div>
              <div style={{ color: 'var(--text3)', fontSize: 13 }}>Abone olan kullanıcılara push gönderir</div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label required">Başlık</label>
            <input className="form-input" type="text" maxLength={60} value={title}
              onChange={e => setTitle(e.target.value)} placeholder="Örn: Yarın antrenman iptal" />
          </div>

          <div className="form-group">
            <label className="form-label required">Mesaj</label>
            <textarea className="form-input" maxLength={200} value={message}
              onChange={e => setMessage(e.target.value)} placeholder="Detaylı bilgi..." style={{ minHeight: 90 }} />
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{message.length}/200</div>
          </div>

          <div className="form-group">
            <label className="form-label">Hedef</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="radio" checked={target === 'all'} onChange={() => setTarget('all')} /> Tüm aboneler
              </label>
            </div>
          </div>

          <button className="btn bp" disabled={sending || subscriberCount === 0} onClick={handleSend} style={{ width: '100%' }}>
            {sending ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
            {sending ? 'Gönderiliyor...' : `${subscriberCount} aboneye gönder`}
          </button>

          {subscriberCount === 0 && (
            <div style={{ marginTop: 12, padding: 10, background: 'rgba(245,158,11,0.1)', borderRadius: 8, fontSize: 12, color: 'var(--text2)' }}>
              Henüz push aboneniz yok. Sporcuların portalde &quot;Bildirim Aboneliği&quot; aktifleştirmesi gerekir.
            </div>
          )}
        </div>
      )}

      {tab === 'logs' && (
        <div className="card">
          {logs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Bell size={40} color="var(--text3)" /></div>
              <div className="empty-state-title">Henüz gönderim yok</div>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>Başlık</th>
                  <th>Mesaj</th>
                  <th>Gönderildi</th>
                  <th>Başarısız</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id}>
                    <td style={{ fontSize: 12, color: 'var(--text3)' }}>{formatDateTime(l.created_at)}</td>
                    <td style={{ fontWeight: 600 }}>{l.title}</td>
                    <td style={{ color: 'var(--text2)', fontSize: 13 }}>{l.body.slice(0, 60)}{l.body.length > 60 ? '…' : ''}</td>
                    <td><span style={{ color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle size={14} /> {l.sent_count}</span></td>
                    <td><span style={{ color: l.failed_count ? 'var(--red)' : 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4 }}><XCircle size={14} /> {l.failed_count}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .spin{animation:spin 1s linear infinite}`}</style>
    </DashboardLayout>
  )
}
