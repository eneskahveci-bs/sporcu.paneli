'use client'

import { useState, useEffect, useCallback } from 'react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import { Send, MessageSquare, Users, CheckCircle, AlertCircle, Loader2, Check, X } from 'lucide-react'
import { formatDate, formatDateTime, formatCurrency } from '@/lib/utils/formatters'
import { toast } from 'sonner'
import type { Payment } from '@/types'

const TEMPLATES = [
  { label: 'Ödeme Hatırlatma', body: 'Sayın {ad_soyad}, {tutar} TL tutarındaki aidatınız {tarih} tarihinde son ödeme günüdür. Bilgilerinize sunarız.' },
  { label: 'Gecikmiş Ödeme', body: 'Sayın {ad_soyad}, {tutar} TL tutarındaki aidatınız gecikmiştir. Lütfen en kısa sürede ödemenizi gerçekleştiriniz.' },
  { label: 'Devam Uyarısı', body: 'Sayın {veli_ad}, {sporcu_ad} isimli sporcumuz son hafta {sayi} antrenman seansına katılmamıştır. Bilgi için lütfen bizimle iletişime geçiniz.' },
  { label: 'Etkinlik Duyurusu', body: 'Sayın velimiz, {tarih} tarihinde {etkinlik} etkinliğimiz gerçekleşecektir. Detaylı bilgi için lütfen akademimizi arayınız.' },
  { label: 'Genel Bilgilendirme', body: '' },
]

const METHOD_LABEL: Record<string, string> = { cash: 'Nakit', card: 'Kart', bank_transfer: 'Havale/EFT', paytr: 'Online' }

export default function SmsPage() {
  const supabase = createClient()
  const [tab, setTab] = useState<'notifications' | 'send' | 'logs'>('notifications')
  const [logs, setLogs] = useState<{ id: string; recipient_name: string; recipient_phone: string; message: string; status: string; sent_at: string; type: string }[]>([])
  const [pendingPayments, setPendingPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [approving, setApproving] = useState<string | null>(null)

  const [form, setForm] = useState({ target: 'all_active', message: '', type: 'sms', template: '' })
  const [athletes, setAthletes] = useState<{ id: string; first_name: string; last_name: string; phone: string }[]>([])
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([])
  const [preview, setPreview] = useState<string[]>([])

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const orgId = user?.user_metadata?.organization_id

    const [{ data: logsData }, { data: pending }, { data: a }] = await Promise.all([
      supabase.from('sms_logs').select('*').eq('organization_id', orgId).order('sent_at', { ascending: false }).limit(100),
      supabase.from('payments').select('*').eq('organization_id', orgId).eq('notification_status', 'pending_approval').order('created_at', { ascending: false }),
      supabase.from('athletes').select('id, first_name, last_name, phone').eq('organization_id', orgId).eq('status', 'active').not('phone', 'is', null),
    ])

    setLogs(logsData || [])
    setPendingPayments(pending || [])
    setAthletes(a || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  const approvePayment = async (payment: Payment) => {
    setApproving(payment.id)
    const { error } = await supabase.from('payments').update({
      status: 'completed',
      notification_status: 'approved',
      paid_date: payment.due_date || new Date().toISOString().slice(0, 10),
    }).eq('id', payment.id)

    if (error) { toast.error('Hata: ' + error.message); setApproving(null); return }

    // Also mark the matching plan payment as completed
    if (payment.source === 'parent_notification' && payment.athlete_id && payment.due_date) {
      await supabase.from('payments').update({ status: 'completed' })
        .eq('athlete_id', payment.athlete_id)
        .eq('due_date', payment.due_date)
        .eq('source', 'plan')
        .neq('id', payment.id)
    }

    toast.success(`${payment.athlete_name} ödemesi onaylandı`)
    setApproving(null)
    fetchData()
  }

  const rejectPayment = async (payment: Payment) => {
    if (!confirm(`${payment.athlete_name} tarafından yapılan ${formatCurrency(payment.amount)} tutarındaki bildirimi reddetmek istiyor musunuz?`)) return
    setApproving(payment.id)
    const { error } = await supabase.from('payments').delete().eq('id', payment.id)
    if (error) { toast.error('Hata: ' + error.message); setApproving(null); return }
    toast.success('Bildirim reddedildi')
    setApproving(null)
    fetchData()
  }

  const getRecipients = () => {
    if (form.target === 'all_active') return athletes
    if (form.target === 'selected') return athletes.filter(a => selectedAthletes.includes(a.id))
    return []
  }

  const handleSend = async () => {
    if (!form.message.trim()) { toast.error('Mesaj boş olamaz'); return }
    const recipients = getRecipients()
    if (!recipients.length) { toast.error('Alıcı seçilmedi'); return }
    if (!confirm(`${recipients.length} kişiye mesaj gönderilecek. Onaylıyor musunuz?`)) return

    setSending(true)
    try {
      const res = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: recipients.map(r => ({ phone: r.phone, name: `${r.first_name} ${r.last_name}` })),
          message: form.message,
          type: form.type,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`${data.sent} kişiye başarıyla gönderildi${data.failed > 0 ? `, ${data.failed} başarısız` : ''}`)
        setForm(f => ({ ...f, message: '' }))
        setTab('logs')
        fetchData()
      } else {
        toast.error(data.error || 'Gönderim hatası')
      }
    } catch {
      toast.error('Sunucu bağlantı hatası')
    } finally {
      setSending(false)
    }
  }

  const sentCount = logs.filter(l => l.status === 'sent').length
  const failedCount = logs.filter(l => l.status === 'failed').length

  const TABS = [
    { key: 'notifications', label: `Onay Bekleyenler${pendingPayments.length > 0 ? ` (${pendingPayments.length})` : ''}` },
    { key: 'send', label: 'Mesaj Gönder' },
    { key: 'logs', label: `Gönderim Geçmişi (${logs.length})` },
  ]

  return (
    <DashboardLayout title="Bildirimler">
      <div className="page-header">
        <div>
          <h1 className="page-title">Bildirimler</h1>
          <p className="page-subtitle">Ödeme onayları ve toplu mesaj gönderimi</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: '20px' }}>
        {[
          { icon: <AlertCircle size={22} color="var(--yellow)" />, label: 'Onay Bekleyen', value: pendingPayments.length, bg: 'rgba(216,163,18,0.15)' },
          { icon: <MessageSquare size={22} color="var(--blue2)" />, label: 'Toplam Mesaj', value: logs.length, bg: 'rgba(45,92,179,0.15)' },
          { icon: <CheckCircle size={22} color="var(--green)" />, label: 'Başarılı', value: sentCount, bg: 'rgba(34,197,94,0.15)' },
          { icon: <AlertCircle size={22} color="var(--red)" />, label: 'Başarısız', value: failedCount, bg: 'rgba(239,68,68,0.15)' },
        ].map(s => (
          <div key={s.label} className="stats-card">
            <div className="stats-icon" style={{ background: s.bg }}>{s.icon}</div>
            <div><div className="stats-label">{s.label}</div><div className="stats-value">{s.value}</div></div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', padding: '4px', background: 'var(--bg3)', borderRadius: '10px', width: 'fit-content' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
            style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, transition: 'all 0.2s',
              background: tab === t.key ? 'var(--grad)' : 'none',
              color: tab === t.key ? '#fff' : 'var(--text2)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Onay Bekleyen Bildirimler */}
      {tab === 'notifications' && (
        loading ? (
          <div style={{ padding: '48px', textAlign: 'center' }}><Loader2 size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto', color: 'var(--text3)' }} /></div>
        ) : pendingPayments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">✅</div>
            <div className="empty-state-title">Onay bekleyen bildirim yok</div>
            <div className="empty-state-sub">Veli/sporcu ödeme bildirimleri burada görünür</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {pendingPayments.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderLeft: '4px solid var(--yellow)', borderRadius: '10px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '14px' }}>{p.athlete_name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>
                    {formatCurrency(p.amount)} • {p.description || p.category || 'Aidat'} • {formatDate(p.due_date)}
                    {p.method && <> • {METHOD_LABEL[p.method] || p.method}</>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn bsu btn-sm"
                    onClick={() => approvePayment(p)}
                    disabled={approving === p.id}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {approving === p.id ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={13} />} Onayla
                  </button>
                  <button
                    className="btn bd btn-sm"
                    onClick={() => rejectPayment(p)}
                    disabled={approving === p.id}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <X size={13} /> Reddet
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Mesaj Gönder */}
      {tab === 'send' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px', alignItems: 'start' }}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Gönderim Yöntemi</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {[{ value: 'sms', label: '📱 SMS (NetGSM)' }, { value: 'whatsapp', label: '💬 WhatsApp Business' }].map(opt => (
                  <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '8px 14px', border: `1.5px solid ${form.type === opt.value ? 'var(--blue2)' : 'var(--border)'}`, borderRadius: '8px', background: form.type === opt.value ? 'rgba(45,92,179,0.1)' : 'transparent', flex: 1, fontSize: '13px', fontWeight: 500 }}>
                    <input type="radio" name="type" value={opt.value} checked={form.type === opt.value} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Şablon Seç</label>
              <select className="form-select" value={form.template} onChange={e => {
                const found = TEMPLATES.find(t => t.label === e.target.value)
                setForm(f => ({ ...f, template: e.target.value, message: found?.body || f.message }))
              }}>
                <option value="">Şablon seçin veya kendiniz yazın</option>
                {TEMPLATES.map(t => <option key={t.label} value={t.label}>{t.label}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Mesaj</label>
              <textarea className="form-input" value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} rows={5} placeholder="Göndermek istediğiniz mesajı yazın..." style={{ resize: 'vertical' }} />
              <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '4px', textAlign: 'right' }}>
                {form.message.length} karakter · {Math.ceil(Math.max(form.message.length, 1) / 160)} SMS
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Alıcılar</label>
              <select className="form-select" value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))}>
                <option value="all_active">Tüm Aktif Sporcular ({athletes.length} kişi)</option>
                <option value="selected">Seçili Sporcular</option>
              </select>
            </div>

            {form.target === 'selected' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto', padding: '10px', background: 'var(--bg3)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                {athletes.map(a => (
                  <label key={a.id} style={{ display: 'flex', gap: '8px', cursor: 'pointer', fontSize: '13px', alignItems: 'center' }}>
                    <input type="checkbox" checked={selectedAthletes.includes(a.id)} onChange={e => setSelectedAthletes(prev => e.target.checked ? [...prev, a.id] : prev.filter(id => id !== a.id))} />
                    {a.first_name} {a.last_name} — {a.phone}
                  </label>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setPreview(getRecipients().slice(0, 5).map(r => `${r.first_name} ${r.last_name} — ${r.phone}`))} className="btn bs btn-sm">
                <Users size={14} /> Önizle
              </button>
              <button onClick={handleSend} disabled={sending || !form.message.trim()} className="btn bp" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                {sending ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={15} />}
                {sending ? 'Gönderiliyor...' : `Gönder (${getRecipients().length} kişi)`}
              </button>
            </div>
          </div>

          <div className="card">
            <h3 className="m-tit" style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={16} /> Alıcı Önizleme
            </h3>
            {preview.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--text3)', textAlign: 'center', padding: '16px 0' }}>
                Önizleme görmek için &quot;Önizle&quot; butonuna tıklayın
              </p>
            ) : (
              <>
                {preview.map((p, i) => (
                  <div key={i} style={{ fontSize: '12px', padding: '6px 10px', borderRadius: '6px', background: 'var(--bg3)', marginBottom: '4px' }}>{p}</div>
                ))}
                {getRecipients().length > 5 && <p style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '6px' }}>+{getRecipients().length - 5} kişi daha</p>}
              </>
            )}
            <div style={{ marginTop: '16px', padding: '12px', background: 'var(--bg3)', borderRadius: '8px', fontSize: '12px', color: 'var(--text2)' }}>
              <strong style={{ display: 'block', marginBottom: '6px' }}>Mesaj Önizleme</strong>
              {form.message || <em style={{ color: 'var(--text3)' }}>Mesaj girilmedi</em>}
            </div>
          </div>
        </div>
      )}

      {/* Gönderim Geçmişi */}
      {tab === 'logs' && (
        <div className="table-container">
          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center' }}><Loader2 size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto', color: 'var(--text3)' }} /></div>
          ) : logs.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">📨</div><div className="empty-state-title">Henüz mesaj gönderilmemiş</div></div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Alıcı</th>
                  <th>Mesaj</th>
                  <th>Tür</th>
                  <th>Durum</th>
                  <th>Tarih</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{log.recipient_name}</div>
                      <div className="ts text-faint">{log.recipient_phone}</div>
                    </td>
                    <td style={{ maxWidth: '300px' }}>
                      <div style={{ fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.message}</div>
                    </td>
                    <td><span className="badge badge-gray">{log.type === 'sms' ? '📱 SMS' : '💬 WA'}</span></td>
                    <td>
                      <span className={`badge ${log.status === 'sent' ? 'badge-green' : log.status === 'failed' ? 'badge-red' : 'badge-yellow'}`}>
                        {log.status === 'sent' ? 'Gönderildi' : log.status === 'failed' ? 'Başarısız' : 'Bekliyor'}
                      </span>
                    </td>
                    <td className="ts text-faint">{formatDateTime(log.sent_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </DashboardLayout>
  )
}
