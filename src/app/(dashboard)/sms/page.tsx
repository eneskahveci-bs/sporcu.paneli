'use client'

import { useState, useEffect, useCallback } from 'react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import { Send, MessageSquare, Users, CheckCircle, AlertCircle, Filter } from 'lucide-react'
import { formatDateTime } from '@/lib/utils/formatters'

interface SmsLog {
  id: string
  recipient_name: string
  recipient_phone: string
  message: string
  status: 'sent' | 'failed' | 'pending'
  sent_at: string
  type: 'sms' | 'whatsapp'
}

const TEMPLATES = [
  { label: 'Ödeme Hatırlatma', body: 'Sayın {ad_soyad}, {tutar} TL tutarındaki aidatınız {tarih} tarihinde son ödeme günüdür. Bilgilerinize sunarız. — Sporcu Paneli' },
  { label: 'Gecikmiş Ödeme', body: 'Sayın {ad_soyad}, {tutar} TL tutarındaki aidatınız gecikmiştir. Lütfen en kısa sürede ödemenizi gerçekleştiriniz. — Sporcu Paneli' },
  { label: 'Devam Uyarısı', body: 'Sayın {veli_ad}, {sporcu_ad} isimli sporcumuz son hafta {sayi} antrenman seansına katılmamıştır. Bilgi için lütfen bizimle iletişime geçiniz.' },
  { label: 'Etkinlik Duyurusu', body: 'Sayın velimiz, {tarih} tarihinde {etkinlik} etkinliğimiz gerçekleşecektir. Detaylı bilgi için lütfen akademimizi arayınız.' },
  { label: 'Genel Bilgilendirme', body: '' },
]

export default function SmsPage() {
  const supabase = createClient()
  const [logs, setLogs] = useState<SmsLog[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [tab, setTab] = useState<'send' | 'logs'>('send')

  const [form, setForm] = useState({
    target: 'all_active',
    message: '',
    type: 'sms',
    template: '',
  })

  const [athletes, setAthletes] = useState<Array<{ id: string; first_name: string; last_name: string; phone: string }>>([])
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([])
  const [preview, setPreview] = useState<string[]>([])

  const loadLogs = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('sms_logs').select('*').order('sent_at', { ascending: false }).limit(100)
    setLogs(data || [])
    setLoading(false)
  }, [supabase])

  const loadAthletes = useCallback(async () => {
    const { data } = await supabase.from('athletes').select('id, first_name, last_name, phone').eq('status', 'active').not('phone', 'is', null)
    setAthletes(data || [])
  }, [supabase])

  useEffect(() => {
    loadLogs()
    loadAthletes()
  }, [loadLogs, loadAthletes])

  const applyTemplate = (tpl: string) => {
    const found = TEMPLATES.find(t => t.label === tpl)
    if (found) setForm(f => ({ ...f, message: found.body, template: tpl }))
  }

  const getRecipients = () => {
    if (form.target === 'all_active') return athletes
    if (form.target === 'selected') return athletes.filter(a => selectedAthletes.includes(a.id))
    return []
  }

  const handlePreview = () => {
    const recipients = getRecipients()
    setPreview(recipients.slice(0, 5).map(r => `${r.first_name} ${r.last_name} — ${r.phone}`))
  }

  const handleSend = async () => {
    if (!form.message.trim()) return
    const recipients = getRecipients()
    if (recipients.length === 0) return

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
        alert(`${recipients.length} kişiye başarıyla gönderildi!`)
        setForm(f => ({ ...f, message: '' }))
        loadLogs()
        setTab('logs')
      } else {
        alert('Gönderim sırasında hata oluştu: ' + (data.error || 'Bilinmeyen hata'))
      }
    } catch {
      alert('Sunucu bağlantı hatası')
    } finally {
      setSending(false)
    }
  }

  const sentCount = logs.filter(l => l.status === 'sent').length
  const failedCount = logs.filter(l => l.status === 'failed').length

  return (
    <DashboardLayout>
      <div className="page-container">
        <div className="page-header">
          <div>
            <h1 className="page-title">SMS & Bildirimler</h1>
            <p className="page-subtitle">Sporculara ve velilere toplu mesaj gönderin</p>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { icon: MessageSquare, label: 'Toplam Mesaj', value: logs.length, color: 'var(--accent)' },
            { icon: CheckCircle, label: 'Başarılı', value: sentCount, color: '#22c55e' },
            { icon: AlertCircle, label: 'Başarısız', value: failedCount, color: '#ef4444' },
          ].map((s, i) => (
            <div key={i} className="stats-card" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: '0.75rem', background: s.color + '1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <s.icon size={22} style={{ color: s.color }} />
              </div>
              <div>
                <div style={{ fontSize: '1.625rem', fontWeight: 800 }}>{s.value}</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="tabs" style={{ marginBottom: '1.5rem' }}>
          <button className={`tab-btn ${tab === 'send' ? 'active' : ''}`} onClick={() => setTab('send')}>
            <Send size={15} /> Mesaj Gönder
          </button>
          <button className={`tab-btn ${tab === 'logs' ? 'active' : ''}`} onClick={() => setTab('logs')}>
            <MessageSquare size={15} /> Gönderim Geçmişi ({logs.length})
          </button>
        </div>

        {tab === 'send' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem', alignItems: 'start' }}>
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Type */}
              <div className="form-group">
                <label className="form-label">Gönderim Yöntemi</label>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  {[{ value: 'sms', label: '📱 SMS (NetGSM)' }, { value: 'whatsapp', label: '💬 WhatsApp Business' }].map(opt => (
                    <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.625rem 1rem', border: `1.5px solid ${form.type === opt.value ? 'var(--accent)' : 'var(--border-color)'}`, borderRadius: '0.5rem', background: form.type === opt.value ? 'var(--accent-light, rgba(59,130,246,0.08))' : 'transparent', flex: 1, fontSize: '0.875rem', fontWeight: 500 }}>
                      <input type="radio" name="type" value={opt.value} checked={form.type === opt.value} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={{ accentColor: 'var(--accent)' }} />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Template */}
              <div className="form-group">
                <label className="form-label">Şablon Seç</label>
                <select className="form-select" value={form.template} onChange={e => applyTemplate(e.target.value)}>
                  <option value="">Şablon seçin veya kendiniz yazın</option>
                  {TEMPLATES.map(t => <option key={t.label} value={t.label}>{t.label}</option>)}
                </select>
              </div>

              {/* Message */}
              <div className="form-group">
                <label className="form-label">Mesaj</label>
                <textarea
                  className="form-input"
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  rows={5}
                  placeholder="Göndermek istediğiniz mesajı yazın..."
                  style={{ resize: 'vertical' }}
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.375rem', textAlign: 'right' }}>
                  {form.message.length} karakter · {Math.ceil(form.message.length / 160)} SMS
                </div>
              </div>

              {/* Target */}
              <div className="form-group">
                <label className="form-label">Alıcılar</label>
                <select className="form-select" value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))}>
                  <option value="all_active">Tüm Aktif Sporcular ({athletes.length} kişi)</option>
                  <option value="selected">Seçili Sporcular</option>
                </select>
              </div>

              {form.target === 'selected' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto', padding: '0.75rem', background: 'var(--bg-primary)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                  {athletes.map(a => (
                    <label key={a.id} style={{ display: 'flex', gap: '0.625rem', cursor: 'pointer', fontSize: '0.875rem', alignItems: 'center' }}>
                      <input type="checkbox" checked={selectedAthletes.includes(a.id)} onChange={e => setSelectedAthletes(prev => e.target.checked ? [...prev, a.id] : prev.filter(id => id !== a.id))} style={{ accentColor: 'var(--accent)' }} />
                      {a.first_name} {a.last_name} — {a.phone}
                    </label>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={handlePreview} className="btn bd" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Filter size={16} /> Önizle
                </button>
                <button onClick={handleSend} disabled={sending || !form.message.trim()} className="btn bs" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <Send size={16} /> {sending ? 'Gönderiliyor...' : `Gönder (${getRecipients().length} kişi)`}
                </button>
              </div>
            </div>

            {/* Preview */}
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.25rem' }}>
              <h3 style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={16} /> Alıcı Önizleme
              </h3>
              {preview.length === 0 ? (
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem 0' }}>
                  Önizleme görmek için &quot;Önizle&quot; butonuna tıklayın
                </p>
              ) : (
                <>
                  {preview.map((p, i) => (
                    <div key={i} style={{ fontSize: '0.8125rem', padding: '0.5rem', borderRadius: '0.375rem', background: 'var(--bg-primary)', marginBottom: '0.375rem' }}>{p}</div>
                  ))}
                  {getRecipients().length > 5 && (
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                      +{getRecipients().length - 5} kişi daha
                    </p>
                  )}
                </>
              )}

              <div style={{ marginTop: '1.5rem', padding: '0.875rem', background: 'var(--bg-primary)', borderRadius: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                <strong style={{ display: 'block', marginBottom: '0.375rem' }}>Mesaj Önizleme</strong>
                {form.message || <em>Mesaj girilmedi</em>}
              </div>
            </div>
          </div>
        )}

        {tab === 'logs' && (
          <div className="table-container">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Yükleniyor...</div>
            ) : logs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📨</div>
                <div>Henüz mesaj gönderilmemiş</div>
              </div>
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
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{log.recipient_phone}</div>
                      </td>
                      <td style={{ maxWidth: '300px' }}>
                        <div style={{ fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.message}</div>
                      </td>
                      <td>
                        <span className="badge badge-info">{log.type === 'sms' ? '📱 SMS' : '💬 WA'}</span>
                      </td>
                      <td>
                        <span className={`badge ${log.status === 'sent' ? 'badge-success' : log.status === 'failed' ? 'badge-danger' : 'badge-warning'}`}>
                          {log.status === 'sent' ? 'Gönderildi' : log.status === 'failed' ? 'Başarısız' : 'Bekliyor'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{formatDateTime(log.sent_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
