'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ThemeProvider, useTheme } from '@/providers/ThemeProvider'
import { formatCurrency, formatDate, calculateAge, getInitials } from '@/lib/utils/formatters'
import { LogOut, Sun, Moon, User, CreditCard, ClipboardCheck, MessageSquare, CheckCircle, X, Minus, Clock, Loader2, Bell, Upload, Paperclip } from 'lucide-react'
import { toast } from 'sonner'
import type { Payment, Attendance } from '@/types'

interface Msg {
  id: string
  subject: string
  content: string
  sender_name: string
  is_read: boolean
  created_at: string
}

function PortalPage() {
  const supabase = createClient()
  const { theme, toggleTheme } = useTheme()
  const [tab, setTab] = useState(0)
  const [athlete, setAthlete] = useState<Record<string, unknown> | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [messages, setMessages] = useState<Msg[]>([])
  const [loading, setLoading] = useState(true)
  const [notifyingId, setNotifyingId] = useState<string | null>(null)
  const [expandedMsg, setExpandedMsg] = useState<string | null>(null)
  const [notifyModalPayment, setNotifyModalPayment] = useState<Payment | null>(null)
  const [slipFile, setSlipFile] = useState<File | null>(null)
  const slipRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      const athleteId = user.user_metadata?.athlete_id
      if (!athleteId) { window.location.href = '/login'; return }

      const [{ data: a }, { data: p }, { data: att }, { data: msgs }] = await Promise.all([
        supabase.from('athletes').select('*, sports(name), classes(name)').eq('id', athleteId).single(),
        supabase.from('payments').select('*').eq('athlete_id', athleteId).order('created_at', { ascending: false }),
        supabase.from('attendance').select('*').eq('athlete_id', athleteId).order('date', { ascending: false }).limit(60),
        supabase.from('messages').select('*').eq('receiver_id', user.id).order('created_at', { ascending: false }),
      ])
      setAthlete(a)
      setPayments(p || [])
      setAttendance(att || [])
      setMessages(msgs || [])
      setLoading(false)
    }
    load()
  }, [supabase])

  const signOut = async () => { await supabase.auth.signOut(); window.location.href = '/' }

  const markRead = async (msgId: string) => {
    await supabase.from('messages').update({ is_read: true }).eq('id', msgId)
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, is_read: true } : m))
  }

  const sendPaymentNotification = async (p: Payment, file: File | null) => {
    if (!athlete) return
    setNotifyingId(p.id)
    const { data: { user } } = await supabase.auth.getUser()
    const orgId = user?.user_metadata?.organization_id

    let slipUrl: string | null = null
    if (file) {
      const ext = file.name.split('.').pop()
      const path = `slips/${p.athlete_id}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('documents').upload(path, file)
      if (!upErr) {
        const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)
        slipUrl = publicUrl
      }
    }

    const { error } = await supabase.from('payments').insert({
      organization_id: orgId,
      athlete_id: p.athlete_id,
      athlete_name: `${athlete.first_name} ${athlete.last_name}`,
      amount: p.amount,
      type: 'income',
      category: p.category || 'Aidat',
      description: (p.description || p.category || 'Aidat') + ' — Veli Bildirimi',
      status: 'pending',
      source: 'parent_notification',
      notification_status: 'pending_approval',
      due_date: p.due_date,
      method: 'bank_transfer',
      slip_url: slipUrl,
    })
    setNotifyingId(null)
    if (error) { toast.error('Bildirim gönderilemedi: ' + error.message); return }
    toast.success('Ödeme bildirimi gönderildi. Admin onayı bekleniyor.')
    setNotifyModalPayment(null)
    setSlipFile(null)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center', color: 'var(--text3)' }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>🏅</div>
        <div>Yükleniyor...</div>
      </div>
    </div>
  )

  if (!athlete) return null

  const totalDebt = payments.filter(p => p.status === 'overdue' || p.status === 'pending').reduce((s, p) => s + p.amount, 0)
  const attendanceRate = attendance.length ? Math.round((attendance.filter(a => a.status === 'present').length / attendance.length) * 100) : 0
  const unreadCount = messages.filter(m => !m.is_read).length

  const STATUS_ICON: Record<string, React.ReactNode> = {
    present: <CheckCircle size={14} color="var(--green)" />,
    absent: <X size={14} color="var(--red)" />,
    excused: <Minus size={14} color="var(--yellow)" />,
    late: <Clock size={14} color="var(--orange)" />,
  }
  const STATUS_LABEL: Record<string, string> = { present: 'Geldi', absent: 'Gelmedi', excused: 'İzinli', late: 'Geç' }
  const PAY_BADGE: Record<string, string> = { completed: 'badge-green', pending: 'badge-yellow', overdue: 'badge-red', cancelled: 'badge-gray' }
  const PAY_LABEL: Record<string, string> = { completed: 'Ödendi', pending: 'Bekliyor', overdue: 'Gecikmiş', cancelled: 'İptal' }

  const firstName = athlete.first_name as string
  const lastName = athlete.last_name as string

  const TABS = [
    { label: 'Profilim', icon: <User size={14} /> },
    { label: 'Ödemeler', icon: <CreditCard size={14} /> },
    { label: 'Yoklama', icon: <ClipboardCheck size={14} /> },
    { label: 'Mesajlar', icon: <MessageSquare size={14} />, badge: unreadCount },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <header style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)', padding: '0 20px', height: '60px', display: 'flex', alignItems: 'center', gap: '12px', position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(12px)' }}>
        <div style={{ fontSize: '22px' }}>🏅</div>
        <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text)' }}>Sporcu Paneli</div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <button onClick={toggleTheme} className="header-btn" aria-label="Tema">{theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}</button>
          <button onClick={signOut} className="header-btn" aria-label="Çıkış"><LogOut size={15} /></button>
        </div>
      </header>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '20px 16px' }}>
        {/* Profile card */}
        <div className="card" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="avatar avatar-lg">{getInitials(firstName, lastName)}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '20px' }}>{firstName} {lastName}</div>
            <div style={{ fontSize: '13px', color: 'var(--text3)', marginTop: '2px' }}>
              {(athlete.sports as { name: string } | null)?.name || ''} • {athlete.birth_date ? `${calculateAge(athlete.birth_date as string)} yaş` : ''}
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
              <span className={`badge ${totalDebt > 0 ? 'badge-red' : 'badge-green'}`} style={{ fontSize: '12px' }}>
                {totalDebt > 0 ? `Borç: ${formatCurrency(totalDebt)}` : 'Borç yok ✓'}
              </span>
              <span className="badge badge-blue" style={{ fontSize: '12px' }}>Devam: %{attendanceRate}</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs" style={{ marginBottom: '20px' }}>
          {TABS.map((t, i) => (
            <button key={t.label} className={`tab-btn${tab === i ? ' active' : ''}`} onClick={() => setTab(i)}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', position: 'relative' }}>
              {t.icon} {t.label}
              {t.badge && t.badge > 0 && (
                <span style={{ background: 'var(--red)', color: '#fff', borderRadius: '10px', padding: '0 5px', fontSize: '10px', fontWeight: 700, minWidth: '16px', textAlign: 'center' }}>{t.badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {tab === 0 && (
          <div className="card">
            <h3 className="m-tit" style={{ marginBottom: '16px' }}>Kişisel Bilgilerim</h3>
            <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {[
                { label: 'TC Kimlik', value: athlete.tc as string },
                { label: 'Doğum Tarihi', value: formatDate(athlete.birth_date as string) },
                { label: 'Telefon', value: athlete.phone as string || '-' },
                { label: 'E-posta', value: athlete.email as string || '-' },
                { label: 'Sınıf', value: (athlete.classes as { name: string } | null)?.name || '-' },
                { label: 'Kayıt Tarihi', value: formatDate(athlete.registration_date as string) },
                { label: 'Kan Grubu', value: athlete.blood_type as string || '-' },
                { label: 'Okul', value: athlete.school as string || '-' },
              ].map(item => (
                <div key={item.label}>
                  <dt style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '2px' }}>{item.label}</dt>
                  <dd style={{ fontSize: '14px', fontWeight: 500 }}>{item.value}</dd>
                </div>
              ))}
            </dl>
            {!!(athlete.parent_name || athlete.parent_phone) && (
              <>
                <div style={{ margin: '16px 0', borderTop: '1px solid var(--border)' }} />
                <h3 className="m-tit" style={{ marginBottom: '12px' }}>Veli Bilgileri</h3>
                <dl style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { label: 'Ad', value: athlete.parent_name as string },
                    { label: 'Telefon', value: athlete.parent_phone as string || '-' },
                    { label: 'E-posta', value: athlete.parent_email as string || '-' },
                  ].map(item => (
                    <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <dt style={{ fontSize: '13px', color: 'var(--text3)' }}>{item.label}</dt>
                      <dd style={{ fontSize: '13px', fontWeight: 500 }}>{item.value}</dd>
                    </div>
                  ))}
                </dl>
              </>
            )}
          </div>
        )}

        {/* Payments Tab */}
        {tab === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {payments.length === 0 && (
              <div className="empty-state card"><div className="empty-state-icon">💳</div><div className="empty-state-title">Ödeme kaydı yok</div></div>
            )}
            {payments.map(p => (
              <div key={p.id} className="card" style={{ borderLeft: `4px solid ${p.status === 'completed' ? 'var(--green)' : p.status === 'overdue' ? 'var(--red)' : 'var(--yellow)'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{p.description || p.category || 'Aidat'}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>Son tarih: {formatDate(p.due_date)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: '16px' }}>{formatCurrency(p.amount)}</div>
                    <span className={`badge ${PAY_BADGE[p.status]}`} style={{ fontSize: '11px', marginTop: '4px' }}>{PAY_LABEL[p.status]}</span>
                  </div>
                </div>
                {(p.status === 'pending' || p.status === 'overdue') && p.notification_status !== 'pending_approval' && (
                  <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
                    <button
                      className="btn bp btn-sm"
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px' }}
                      onClick={() => { setNotifyModalPayment(p); setSlipFile(null) }}
                    >
                      <Bell size={12} />
                      Ödedim — Bildirim Gönder
                    </button>
                  </div>
                )}
                {p.notification_status === 'pending_approval' && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--yellow)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Clock size={12} /> Bildiriminiz onay bekliyor...
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Attendance Tab */}
        {tab === 2 && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 className="m-tit">Yoklama Geçmişim</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span className="badge badge-green">%{attendanceRate} Devam</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {attendance.slice(0, 30).map(a => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  {STATUS_ICON[a.status]}
                  <span style={{ fontSize: '14px', flex: 1 }}>{formatDate(a.date)}</span>
                  <span style={{ fontSize: '13px', color: 'var(--text2)', fontWeight: 500 }}>{STATUS_LABEL[a.status]}</span>
                </div>
              ))}
              {attendance.length === 0 && <div className="text-faint ts" style={{ textAlign: 'center', padding: '24px' }}>Yoklama kaydı yok</div>}
            </div>
          </div>
        )}

        {/* Messages Tab */}
        {tab === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {messages.length === 0 && (
              <div className="empty-state card">
                <div className="empty-state-icon">💬</div>
                <div className="empty-state-title">Mesaj yok</div>
                <div className="empty-state-text" style={{ fontSize: '13px', color: 'var(--text3)' }}>Antrenörünüzden veya akademiden mesaj geldiğinde burada görünür</div>
              </div>
            )}
            {messages.map(m => (
              <div key={m.id} className="card"
                style={{ borderLeft: `3px solid ${m.is_read ? 'var(--border)' : 'var(--blue2)'}`, cursor: 'pointer', opacity: m.is_read ? 0.85 : 1 }}
                onClick={() => {
                  setExpandedMsg(expandedMsg === m.id ? null : m.id)
                  if (!m.is_read) markRead(m.id)
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      {!m.is_read && <span style={{ width: '8px', height: '8px', background: 'var(--blue2)', borderRadius: '50%', flexShrink: 0 }} />}
                      <div style={{ fontWeight: m.is_read ? 500 : 700, fontSize: '14px' }}>{m.subject || '(Konu yok)'}</div>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text3)' }}>
                      {m.sender_name} • {formatDate(m.created_at?.slice(0, 10))}
                    </div>
                  </div>
                </div>
                {expandedMsg === m.id && (
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)', fontSize: '14px', color: 'var(--text2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {m.content}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dekont Yükleme Modalı */}
      {notifyModalPayment && (
        <div className="modal-overlay" onClick={() => setNotifyModalPayment(null)}>
          <div className="modal" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Ödeme Bildirimi</h2>
              <button onClick={() => setNotifyModalPayment(null)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '20px' }}>×</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ padding: '12px 14px', background: 'var(--bg3)', borderRadius: '8px', fontSize: '14px' }}>
                <div style={{ fontWeight: 600 }}>{notifyModalPayment.description || notifyModalPayment.category || 'Aidat'}</div>
                <div style={{ color: 'var(--text3)', fontSize: '13px', marginTop: '4px' }}>Tutar: {formatCurrency(notifyModalPayment.amount)}</div>
              </div>
              <div className="form-group">
                <label className="form-label">Dekont (İsteğe bağlı)</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button className="btn bs btn-sm" onClick={() => slipRef.current?.click()}>
                    <Upload size={13} /> Dosya Seç
                  </button>
                  {slipFile && <span style={{ fontSize: '12px', color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: '4px' }}><Paperclip size={12} />{slipFile.name}</span>}
                </div>
                <input ref={slipRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => setSlipFile(e.target.files?.[0] || null)} />
                <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '6px' }}>Varsa banka dekontunuzu yükleyebilirsiniz</div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn bs" onClick={() => setNotifyModalPayment(null)}>İptal</button>
              <button className="btn bp" disabled={!!notifyingId} onClick={() => sendPaymentNotification(notifyModalPayment, slipFile)}>
                {notifyingId ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Bell size={14} />}
                {notifyingId ? 'Gönderiliyor...' : 'Bildirim Gönder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Page() {
  return <ThemeProvider><PortalPage /></ThemeProvider>
}
