'use client'
import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ThemeProvider, useTheme } from '@/providers/ThemeProvider'
import { formatCurrency, formatDate, calculateAge, getInitials } from '@/lib/utils/formatters'
import {
  LogOut, Sun, Moon, User, CreditCard, ClipboardCheck, MessageSquare,
  CheckCircle, X, Minus, Clock, Loader2, Bell, Upload, Paperclip,
  Eye, EyeOff, KeyRound, Home, Calendar, Send, ChevronLeft, ChevronRight,
  TrendingUp, AlertCircle, BookOpen, ShoppingBag,
} from 'lucide-react'
import { toast } from 'sonner'
import { validatePassword } from '@/lib/password-validator'
import type { Payment, Attendance } from '@/types'

const DAYS_TR = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']
const MONTHS_TR = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık']

interface Msg { id: string; subject: string; content: string; sender_name: string; receiver_id?: string; sender_id?: string; is_read: boolean; created_at: string }
interface ClassInfo { id: string; name: string; schedule_days?: number[]; schedule_time?: string; schedule_time_end?: string; coach?: { id: string; first_name: string; last_name: string; auth_user_id?: string } }

// ── İlk Giriş Şifre ─────────────────────────────────────────────────────────
function SetPasswordScreen({ onDone }: { onDone: () => void }) {
  const supabase = createClient()
  const [newPw, setNewPw] = useState(''); const [confirmPw, setConfirmPw] = useState('')
  const [showPw, setShowPw] = useState(false); const [loading, setLoading] = useState(false); const [error, setError] = useState('')
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('')
    const pwCheck = validatePassword(newPw)
    if (!pwCheck.valid) { setError(pwCheck.errors[0]); return }
    if (newPw !== confirmPw) { setError('Şifreler eşleşmiyor'); return }
    setLoading(true)
    try {
      const { error: pwErr } = await supabase.auth.updateUser({ password: newPw })
      if (pwErr) { setError(pwErr.message); return }
      await supabase.auth.updateUser({ data: { must_change_password: false } })
      toast.success('Şifreniz belirlendi!'); onDone()
    } finally { setLoading(false) }
  }
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: 420, background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)' }}>
        <div style={{ padding: '2rem 2rem 0', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--grad)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}><KeyRound size={24} color="#fff" /></div>
          <h2 style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--text)', marginBottom: '0.5rem' }}>Şifrenizi Belirleyin</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text3)', lineHeight: 1.6 }}>İlk girişiniz! Güvenliğiniz için kendinize özel bir şifre belirleyin.</p>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem 2rem 2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={fg}><label style={fl}>Yeni Şifre</label>
            <div style={{ position: 'relative' }}>
              <input type={showPw ? 'text' : 'password'} placeholder="En az 8 karakter" value={newPw} onChange={e => setNewPw(e.target.value)} autoFocus style={fi} />
              <button type="button" onClick={() => setShowPw(p => !p)} style={eyeBtn}>{showPw ? <EyeOff size={15} /> : <Eye size={15} />}</button>
            </div>
          </div>
          <div style={fg}><label style={fl}>Şifre Tekrar</label><input type={showPw ? 'text' : 'password'} placeholder="Şifreyi tekrar girin" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} style={fi} /></div>
          {error && <div style={errBox}>{error}</div>}
          <button type="submit" disabled={loading} style={submitBtn}>
            {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
            {loading ? 'Kaydediliyor...' : 'Şifremi Belirle'}
          </button>
        </form>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ── Ana Portal ───────────────────────────────────────────────────────────────
function PortalPage() {
  const supabase = createClient()
  const { theme, toggleTheme } = useTheme()
  const [tab, setTab] = useState(0)
  const [athlete, setAthlete] = useState<Record<string, unknown> | null>(null)
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [orders, setOrders] = useState<{ id: string; total_amount: number; status: string; created_at: string; items: { product_name: string; quantity: number; unit_price: number }[] }[]>([])
  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [receivedMsgs, setReceivedMsgs] = useState<Msg[]>([])
  const [sentMsgs, setSentMsgs] = useState<Msg[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [mustSetPassword, setMustSetPassword] = useState(false)
  const [notifyingId, setNotifyingId] = useState<string | null>(null)
  const [notifyModalPayment, setNotifyModalPayment] = useState<Payment | null>(null)
  const [slipFile, setSlipFile] = useState<File | null>(null)
  const slipRef = useRef<HTMLInputElement>(null)
  const [calMonth, setCalMonth] = useState(() => new Date())
  // Mesaj compose
  const [composeOpen, setComposeOpen] = useState(false)
  const [msgForm, setMsgForm] = useState({ subject: '', content: '' })
  const [sendingMsg, setSendingMsg] = useState(false)
  const [expandedMsg, setExpandedMsg] = useState<string | null>(null)
  // Şifre değiştirme
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' })
  const [showPw, setShowPw] = useState(false)
  const [savingPw, setSavingPw] = useState(false)
  const [userEmail, setUserEmail] = useState('')

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }
    if (user.user_metadata?.must_change_password === true) { setMustSetPassword(true); setLoading(false); return }
    setUserEmail(user.email || '')
    const athleteId = user.user_metadata?.athlete_id
    if (!athleteId) { window.location.href = '/login'; return }

    // Kritik: sporcu profilini önce ve tek başına çek. Başarısızsa anlamlı hata göster.
    const { data: a, error: aErr } = await supabase
      .from('athletes')
      .select('*, sports(name), classes(id,name,schedule_days,schedule_time,schedule_time_end,coach:coaches(id,first_name,last_name,auth_user_id))')
      .eq('id', athleteId)
      .single()

    if (aErr || !a) {
      console.error('Sporcu profili yüklenemedi:', aErr)
      setLoadError(aErr?.message || 'Profil bulunamadı')
      setLoading(false)
      return
    }
    setAthlete(a)
    if (a?.classes) setClassInfo(a.classes as ClassInfo)

    // Opsiyonel veriler: biri (örn. orders tablosu yoksa) patlasa bile portal açık kalsın
    try {
      const [{ data: p }, { data: ord }, { data: att }, { data: recv }, { data: sent }] = await Promise.all([
        supabase.from('payments').select('*').eq('athlete_id', athleteId).order('created_at', { ascending: false }),
        supabase.from('orders').select('id, total_amount, status, created_at, items:order_items(product_name, quantity, unit_price)').eq('athlete_id', athleteId).order('created_at', { ascending: false }),
        supabase.from('attendance').select('*').eq('athlete_id', athleteId).order('date', { ascending: false }).limit(90),
        supabase.from('messages').select('*').eq('receiver_id', user.id).order('created_at', { ascending: false }),
        supabase.from('messages').select('*').eq('sender_id', user.id).order('created_at', { ascending: false }).limit(30),
      ])
      setPayments(p || [])
      setOrders((ord || []) as typeof orders)
      setAttendance(att || [])
      setReceivedMsgs(recv || [])
      setSentMsgs(sent || [])
    } catch (e) {
      console.error('Bazı portal verileri yüklenemedi (devam ediliyor):', e)
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const signOut = async () => { await supabase.auth.signOut(); window.location.href = '/' }

  const markRead = async (msgId: string) => {
    await supabase.from('messages').update({ is_read: true }).eq('id', msgId)
    setReceivedMsgs(prev => prev.map(m => m.id === msgId ? { ...m, is_read: true } : m))
  }

  const sendMessage = async () => {
    if (!msgForm.subject || !msgForm.content) { toast.error('Konu ve içerik zorunludur'); return }
    const coachAuthId = classInfo?.coach?.auth_user_id
    if (!coachAuthId) { toast.error('Antrenörünüz henüz sisteme kayıtlı değil'); return }
    setSendingMsg(true)
    const { data: { user } } = await supabase.auth.getUser()
    const fullName = (athlete?.first_name as string || '') + ' ' + (athlete?.last_name as string || '')
    const { error } = await supabase.from('messages').insert({
      sender_id: user?.id, receiver_id: coachAuthId,
      subject: msgForm.subject, content: msgForm.content,
      sender_name: fullName, is_read: false,
      organization_id: user?.user_metadata?.organization_id,
    })
    setSendingMsg(false)
    if (error) { toast.error('Gönderilemedi'); return }
    toast.success('Mesaj gönderildi')
    setComposeOpen(false); setMsgForm({ subject: '', content: '' }); load()
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
      if (!upErr) { const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path); slipUrl = publicUrl }
    }
    const { error } = await supabase.from('payments').insert({
      organization_id: orgId, athlete_id: p.athlete_id,
      athlete_name: `${athlete.first_name} ${athlete.last_name}`,
      amount: p.amount, type: 'income', category: p.category || 'Aidat',
      description: (p.description || p.category || 'Aidat') + ' — Veli Bildirimi',
      status: 'pending', source: 'parent_notification', notification_status: 'pending_approval',
      due_date: p.due_date, method: 'bank_transfer', slip_url: slipUrl,
    })
    setNotifyingId(null)
    if (error) { toast.error('Bildirim gönderilemedi'); return }
    toast.success('Ödeme bildirimi gönderildi'); setNotifyModalPayment(null); setSlipFile(null)
  }

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pwForm.current) { toast.error('Mevcut şifrenizi girin'); return }
    const pwCheck = validatePassword(pwForm.newPw)
    if (!pwCheck.valid) { toast.error(pwCheck.errors[0]); return }
    if (pwForm.newPw !== pwForm.confirm) { toast.error('Şifreler eşleşmiyor'); return }
    setSavingPw(true)
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email: userEmail, password: pwForm.current })
    if (signInErr) { setSavingPw(false); toast.error('Mevcut şifre hatalı'); return }
    const { error } = await supabase.auth.updateUser({ password: pwForm.newPw })
    setSavingPw(false)
    if (error) { toast.error(error.message); return }
    setPwForm({ current: '', newPw: '', confirm: '' }); toast.success('Şifreniz değiştirildi')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🏅</div>
        <Loader2 size={24} style={{ margin: '0 auto', color: 'var(--text3)', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  )

  if (mustSetPassword) return <SetPasswordScreen onDone={() => { setMustSetPassword(false); window.location.reload() }} />

  if (!athlete) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 24 }}>
      <div style={{ maxWidth: 420, textAlign: 'center' }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>⚠️</div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Profiliniz yüklenemedi</h2>
        <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 20 }}>
          Sporcu profiliniz bulunamadı. Hesabınız akademiye bağlı olmayabilir ya da
          oturum bilgileriniz güncel değil. Lütfen tekrar giriş yapmayı deneyin.
        </p>
        {loadError && <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 16, fontFamily: 'monospace' }}>{loadError}</p>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button className="btn bs" onClick={() => window.location.reload()}>Tekrar Dene</button>
          <button className="btn bp" onClick={signOut}>Çıkış Yap</button>
        </div>
      </div>
    </div>
  )

  const firstName = athlete.first_name as string
  const lastName = athlete.last_name as string
  const sportName = (athlete.sports as { name: string } | null)?.name || ''
  const totalDebt = payments.filter(p => p.status === 'overdue' || p.status === 'pending').reduce((s, p) => s + p.amount, 0)
  const overdueCount = payments.filter(p => p.status === 'overdue').length
  const attendanceRate = attendance.length ? Math.round(attendance.filter(a => a.status === 'present').length / attendance.length * 100) : 0
  const unreadCount = receivedMsgs.filter(m => !m.is_read).length
  const totalMsgs = receivedMsgs.length + sentMsgs.length

  // Yoklama map (tarihe göre)
  const attMap: Record<string, string> = {}
  attendance.forEach(a => { attMap[a.date] = a.status })

  // Takvim hesapla
  const calYear = calMonth.getFullYear()
  const calMonthIdx = calMonth.getMonth()
  const firstDay = new Date(calYear, calMonthIdx, 1)
  const lastDay = new Date(calYear, calMonthIdx + 1, 0)
  const startOffset = (firstDay.getDay() + 6) % 7 // Pazartesi başlangıç
  const calDays: (number | null)[] = [...Array(startOffset).fill(null), ...Array.from({ length: lastDay.getDate() }, (_, i) => i + 1)]
  while (calDays.length % 7 !== 0) calDays.push(null)

  // Bu ayki devam istatistikleri
  const monthStr = `${calYear}-${String(calMonthIdx + 1).padStart(2, '0')}`
  const monthAtt = attendance.filter(a => a.date.startsWith(monthStr))
  const monthPresent = monthAtt.filter(a => a.status === 'present').length
  const monthAbsent = monthAtt.filter(a => a.status === 'absent').length
  const monthExcused = monthAtt.filter(a => a.status === 'excused').length

  // Bugünkü antrenman
  const todayIdx = (() => { const d = new Date().getDay(); return d === 0 ? 6 : d - 1 })()
  const hasTrainingToday = classInfo?.schedule_days?.includes(todayIdx)
  const nextTrainingDay = classInfo?.schedule_days?.length
    ? (() => {
        for (let i = 1; i <= 7; i++) {
          const next = (todayIdx + i) % 7
          if (classInfo.schedule_days!.includes(next)) return { day: DAYS_TR[next], daysUntil: i }
        }
        return null
      })()
    : null

  const PAY_BADGE: Record<string, string> = { completed: 'badge-green', pending: 'badge-yellow', overdue: 'badge-red', cancelled: 'badge-gray' }
  const PAY_LABEL: Record<string, string> = { completed: 'Ödendi', pending: 'Bekliyor', overdue: 'Gecikmiş', cancelled: 'İptal' }
  const ATT_COLOR: Record<string, string> = { present: '#10b981', absent: '#ef4444', excused: '#f59e0b' }

  const TABS = [
    { label: 'Özet', icon: <Home size={14} /> },
    { label: 'Ödemeler', icon: <CreditCard size={14} /> },
    { label: 'Devam', icon: <ClipboardCheck size={14} /> },
    { label: 'Mesajlar', icon: <MessageSquare size={14} />, badge: unreadCount },
    { label: 'Profilim', icon: <User size={14} /> },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <header style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)', padding: '0 20px', height: 60, display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 }}>
        <span style={{ fontSize: 22 }}>🏅</span>
        <span style={{ fontWeight: 700, fontSize: 15 }}>Sporcu Paneli</span>
        {unreadCount > 0 && (
          <span style={{ background: 'var(--red)', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }} onClick={() => setTab(3)}>
            {unreadCount} yeni mesaj
          </span>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <a href="/portal/features" className="header-btn" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'inherit' }} title="Ek Özellikler">⚙️</a>
          <button onClick={toggleTheme} className="header-btn">{theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}</button>
          <button onClick={signOut} className="header-btn"><LogOut size={15} /></button>
        </div>
      </header>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px' }}>
        {/* Profil Kartı */}
        <div className="card" style={{ marginBottom: 20, background: 'var(--bg2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--grad)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 18, flexShrink: 0 }}>
              {getInitials(firstName, lastName)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 18 }}>{firstName} {lastName}</div>
              <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 2 }}>
                {sportName}{athlete.birth_date ? ` • ${calculateAge(athlete.birth_date as string)} yaş` : ''}
                {classInfo && ` • ${classInfo.name}`}
              </div>
            </div>
          </div>
          {/* Özet stat çubuğu */}
          <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 100, background: totalDebt > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)', border: `1px solid ${totalDebt > 0 ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.25)'}`, borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: totalDebt > 0 ? '#ef4444' : '#10b981' }}>{totalDebt > 0 ? formatCurrency(totalDebt) : '✓'}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{totalDebt > 0 ? `${overdueCount > 0 ? overdueCount + ' gecikmiş' : 'bekleyen'} ödeme` : 'Borç yok'}</div>
            </div>
            <div style={{ flex: 1, minWidth: 100, background: 'rgba(45,92,179,0.08)', border: '1px solid rgba(45,92,179,0.2)', borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--blue2)' }}>%{attendanceRate}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Devam oranı</div>
            </div>
            <div style={{ flex: 1, minWidth: 100, background: hasTrainingToday ? 'rgba(16,185,129,0.08)' : 'var(--bg3)', border: `1px solid ${hasTrainingToday ? 'rgba(16,185,129,0.25)' : 'var(--border)'}`, borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: hasTrainingToday ? '#10b981' : 'var(--text2)' }}>{hasTrainingToday ? 'Bugün' : nextTrainingDay ? nextTrainingDay.day : '-'}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{hasTrainingToday ? classInfo?.schedule_time || 'Antrenman var' : nextTrainingDay ? `${nextTrainingDay.daysUntil} gün sonra` : 'Program girilmemiş'}</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs" style={{ marginBottom: 20 }}>
          {TABS.map((t, i) => (
            <button key={i} className={`tab-btn${tab === i ? ' active' : ''}`} onClick={() => setTab(i)} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              {t.icon} {t.label}
              {t.badge && t.badge > 0 && <span style={{ background: 'var(--red)', color: '#fff', borderRadius: 10, padding: '0 5px', fontSize: 10, fontWeight: 700 }}>{t.badge}</span>}
            </button>
          ))}
        </div>

        {/* ── Tab 0: Özet ── */}
        {tab === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Antrenman bilgisi */}
            {classInfo && (
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--grad)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><BookOpen size={16} color="#fff" /></div>
                  <div><div style={{ fontWeight: 700 }}>{classInfo.name}</div><div style={{ fontSize: 12, color: 'var(--text3)' }}>{sportName}</div></div>
                  {hasTrainingToday && <span className="badge badge-green" style={{ marginLeft: 'auto' }}>Bugün antrenman var!</span>}
                </div>
                {classInfo.schedule_days && classInfo.schedule_days.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {DAYS_TR.map((d, i) => (
                      <div key={i} style={{ padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: classInfo.schedule_days!.includes(i) ? 'var(--grad)' : 'var(--bg3)', color: classInfo.schedule_days!.includes(i) ? '#fff' : 'var(--text3)', border: classInfo.schedule_days!.includes(i) ? 'none' : '1px solid var(--border)' }}>{d}</div>
                    ))}
                    {classInfo.schedule_time && <div style={{ padding: '4px 10px', borderRadius: 20, fontSize: 12, background: 'var(--bg3)', color: 'var(--text2)', border: '1px solid var(--border)' }}>⏰ {classInfo.schedule_time}{classInfo.schedule_time_end ? `–${classInfo.schedule_time_end}` : ''}</div>}
                  </div>
                )}
              </div>
            )}

            {/* Son ödemeler özeti */}
            {totalDebt > 0 && (
              <div className="card" style={{ borderLeft: '4px solid var(--red)', background: 'rgba(239,68,68,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <AlertCircle size={18} style={{ color: 'var(--red)', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>Bekleyen Ödeme</div>
                    <div style={{ fontSize: 13, color: 'var(--text3)' }}>{overdueCount > 0 ? `${overdueCount} gecikmiş` : 'Bekliyor'} — {formatCurrency(totalDebt)}</div>
                  </div>
                  <button className="btn bp btn-sm" onClick={() => setTab(1)}>Görüntüle</button>
                </div>
              </div>
            )}

            {/* Son 5 yoklama */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Son Devam Kayıtları</div>
                <button className="btn bs btn-sm" onClick={() => setTab(2)}>Tümü</button>
              </div>
              {attendance.slice(0, 5).length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--text3)', textAlign: 'center', padding: '16px 0' }}>Kayıt yok</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {attendance.slice(0, 5).map(a => (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', background: 'var(--bg3)', borderRadius: 8, borderLeft: `3px solid ${ATT_COLOR[a.status] || 'var(--border)'}` }}>
                      <span style={{ fontSize: 13, flex: 1 }}>{formatDate(a.date)}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: ATT_COLOR[a.status] }}>{a.status === 'present' ? 'Geldi' : a.status === 'absent' ? 'Gelmedi' : 'İzinli'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Son mesaj */}
            {receivedMsgs.length > 0 && (
              <div className="card" style={{ cursor: 'pointer' }} onClick={() => setTab(3)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(45,92,179,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><MessageSquare size={16} style={{ color: 'var(--blue2)' }} /></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{receivedMsgs[0].subject}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)' }}>{receivedMsgs[0].sender_name} • {formatDate(receivedMsgs[0].created_at?.slice(0, 10))}</div>
                  </div>
                  {unreadCount > 0 && <span className="badge badge-blue">{unreadCount} yeni</span>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Tab 1: Ödemeler & Satışlar ── */}
        {tab === 1 && (
          <PortalPaymentsTab
            payments={payments}
            orders={orders}
            totalDebt={totalDebt}
            overdueCount={overdueCount}
            onNotify={(p) => { setNotifyModalPayment(p); setSlipFile(null) }}
          />
        )}

        {/* ── Tab 2: Devam ── */}
        {tab === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Ay navigasyonu */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <button className="btn bs btn-sm" onClick={() => { const d = new Date(calMonth); d.setMonth(d.getMonth() - 1); setCalMonth(d) }}><ChevronLeft size={15} /></button>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{MONTHS_TR[calMonthIdx]} {calYear}</div>
                <button className="btn bs btn-sm" disabled={calMonth >= new Date()} onClick={() => { const d = new Date(calMonth); d.setMonth(d.getMonth() + 1); setCalMonth(d) }}><ChevronRight size={15} /></button>
              </div>
              {/* İstatistikler */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {[{ label: 'Geldi', count: monthPresent, color: '#10b981' }, { label: 'Gelmedi', count: monthAbsent, color: '#ef4444' }, { label: 'İzinli', count: monthExcused, color: '#f59e0b' }].map(s => (
                  <div key={s.label} style={{ flex: 1, background: s.color + '12', border: `1px solid ${s.color}30`, borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.count}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{s.label}</div>
                  </div>
                ))}
              </div>
              {/* Takvim */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                {DAYS_TR.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text3)', padding: '4px 0' }}>{d}</div>)}
                {calDays.map((day, i) => {
                  if (!day) return <div key={`e${i}`} />
                  const iso = `${calYear}-${String(calMonthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  const status = attMap[iso]
                  const isToday = iso === new Date().toISOString().slice(0, 10)
                  return (
                    <div key={iso} style={{ aspectRatio: '1', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: isToday ? 800 : 500, background: status ? ATT_COLOR[status] + '25' : 'var(--bg3)', border: `1px solid ${status ? ATT_COLOR[status] + '60' : isToday ? 'var(--border2)' : 'transparent'}`, color: status ? ATT_COLOR[status] : isToday ? 'var(--blue2)' : 'var(--text2)', cursor: 'default' }}>
                      {day}
                    </div>
                  )
                })}
              </div>
              {/* Lejant */}
              <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
                {[['#10b981', 'Geldi'], ['#ef4444', 'Gelmedi'], ['#f59e0b', 'İzinli']].map(([c, l]) => (
                  <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text3)' }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: c + '50', border: `1px solid ${c}80` }} /> {l}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Tab 3: Mesajlar ── */}
        {tab === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Mesajlar</div>
              {classInfo?.coach?.auth_user_id && (
                <button className="btn bp btn-sm" onClick={() => setComposeOpen(true)}>
                  <Send size={13} /> Antrenöre Yaz
                </button>
              )}
            </div>
            {totalMsgs === 0 ? (
              <div className="empty-state card"><div className="empty-state-icon">💬</div><div className="empty-state-title">Mesaj yok</div><div className="empty-state-text">Antrenörünüzden mesaj geldiğinde burada görünür</div></div>
            ) : (
              <>
                {receivedMsgs.length > 0 && <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gelen ({receivedMsgs.length})</div>}
                {receivedMsgs.map(m => (
                  <div key={m.id} className="card" style={{ borderLeft: `3px solid ${m.is_read ? 'var(--border)' : 'var(--blue2)'}`, cursor: 'pointer' }}
                    onClick={() => { setExpandedMsg(expandedMsg === m.id ? null : m.id); if (!m.is_read) markRead(m.id) }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      {!m.is_read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--blue2)', flexShrink: 0, marginTop: 5 }} />}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: m.is_read ? 500 : 700, fontSize: 14 }}>{m.subject || '(Konu yok)'}</div>
                        <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{m.sender_name} • {formatDate(m.created_at?.slice(0, 10))}</div>
                      </div>
                    </div>
                    {expandedMsg === m.id && <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', fontSize: 14, color: 'var(--text2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{m.content}</div>}
                  </div>
                ))}
                {sentMsgs.length > 0 && <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>Gönderilen ({sentMsgs.length})</div>}
                {sentMsgs.map(m => (
                  <div key={m.id} className="card" style={{ borderLeft: '3px solid var(--border)', opacity: 0.85, cursor: 'pointer' }}
                    onClick={() => setExpandedMsg(expandedMsg === m.id ? null : m.id)}>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{m.subject}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{formatDate(m.created_at?.slice(0, 10))}</div>
                    {expandedMsg === m.id && <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', fontSize: 14, color: 'var(--text2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{m.content}</div>}
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* ── Tab 4: Profilim ── */}
        {tab === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card">
              <h3 className="m-tit" style={{ marginBottom: 16 }}>Kişisel Bilgilerim</h3>
              <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {[
                  { label: 'TC Kimlik', value: athlete.tc as string },
                  { label: 'Doğum Tarihi', value: formatDate(athlete.birth_date as string) },
                  { label: 'Cinsiyet', value: athlete.gender === 'male' ? 'Erkek' : athlete.gender === 'female' ? 'Kadın' : '-' },
                  { label: 'Telefon', value: athlete.phone as string || '-' },
                  { label: 'E-posta', value: athlete.email as string || '-' },
                  { label: 'Okul', value: athlete.school as string || '-' },
                  { label: 'Kan Grubu', value: athlete.blood_type as string || '-' },
                  { label: 'Kayıt Tarihi', value: formatDate(athlete.registration_date as string) },
                ].map(item => (
                  <div key={item.label}>
                    <dt style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 2 }}>{item.label}</dt>
                    <dd style={{ fontSize: 14, fontWeight: 500 }}>{item.value}</dd>
                  </div>
                ))}
              </dl>
              {!!(athlete.parent_name || athlete.parent_phone) && (
                <>
                  <div style={{ margin: '16px 0', borderTop: '1px solid var(--border)' }} />
                  <h3 className="m-tit" style={{ marginBottom: 12 }}>Veli Bilgileri</h3>
                  <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    {[
                      { label: 'Ad Soyad', value: athlete.parent_name as string || '-' },
                      { label: 'Telefon', value: athlete.parent_phone as string || '-' },
                      { label: 'E-posta', value: athlete.parent_email as string || '-' },
                    ].map(item => (
                      <div key={item.label}>
                        <dt style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 2 }}>{item.label}</dt>
                        <dd style={{ fontSize: 14, fontWeight: 500 }}>{item.value}</dd>
                      </div>
                    ))}
                  </dl>
                </>
              )}
            </div>

            {/* Şifre değiştirme */}
            <div className="card">
              <h3 className="m-tit" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><KeyRound size={16} /> Şifre Değiştir</h3>
              <form onSubmit={changePassword} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="form-group"><label className="form-label">Mevcut Şifre</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showPw ? 'text' : 'password'} className="form-input" style={{ paddingRight: 40 }} value={pwForm.current} onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))} />
                    <button type="button" onClick={() => setShowPw(v => !v)} style={eyeBtn}>{showPw ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                  </div>
                </div>
                <div className="form-group"><label className="form-label">Yeni Şifre <span style={{ color: 'var(--text3)', fontWeight: 400, fontSize: 11 }}>(min 8 karakter)</span></label>
                  <input type={showPw ? 'text' : 'password'} className="form-input" value={pwForm.newPw} onChange={e => setPwForm(p => ({ ...p, newPw: e.target.value }))} />
                </div>
                <div className="form-group"><label className="form-label">Yeni Şifre Tekrar</label>
                  <input type={showPw ? 'text' : 'password'} className="form-input" value={pwForm.confirm} onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} />
                  {pwForm.confirm && pwForm.newPw !== pwForm.confirm && <div style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>Şifreler eşleşmiyor</div>}
                </div>
                <button type="submit" className="btn bp" disabled={savingPw}>
                  {savingPw ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <KeyRound size={14} />}
                  {savingPw ? 'Değiştiriliyor...' : 'Şifreyi Değiştir'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Mesaj Yazma Modal */}
      {composeOpen && (
        <div className="modal-overlay" onClick={() => setComposeOpen(false)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Antrenöre Mesaj Gönder</h2>
              <button onClick={() => setComposeOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text3)' }}>×</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {classInfo?.coach && <div style={{ padding: '8px 12px', background: 'var(--bg3)', borderRadius: 8, fontSize: 13, color: 'var(--text2)' }}>Alıcı: <strong>{classInfo.coach.first_name} {classInfo.coach.last_name}</strong></div>}
              <div className="form-group"><label className="form-label required">Konu</label><input className="form-input" value={msgForm.subject} onChange={e => setMsgForm(p => ({ ...p, subject: e.target.value }))} placeholder="Mesaj konusu" /></div>
              <div className="form-group"><label className="form-label required">Mesaj</label><textarea className="form-input" style={{ minHeight: 100 }} value={msgForm.content} onChange={e => setMsgForm(p => ({ ...p, content: e.target.value }))} placeholder="Mesajınızı yazın..." /></div>
            </div>
            <div className="modal-footer">
              <button className="btn bs" onClick={() => setComposeOpen(false)}>İptal</button>
              <button className="btn bp" disabled={sendingMsg} onClick={sendMessage}>
                {sendingMsg ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
                {sendingMsg ? 'Gönderiliyor...' : 'Gönder'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dekont Modal */}
      {notifyModalPayment && (
        <div className="modal-overlay" onClick={() => setNotifyModalPayment(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Ödeme Bildirimi</h2>
              <button onClick={() => setNotifyModalPayment(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text3)' }}>×</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ padding: '12px 14px', background: 'var(--bg3)', borderRadius: 8, fontSize: 14 }}>
                <div style={{ fontWeight: 600 }}>{notifyModalPayment.description || notifyModalPayment.category || 'Aidat'}</div>
                <div style={{ color: 'var(--text3)', fontSize: 13, marginTop: 4 }}>Tutar: {formatCurrency(notifyModalPayment.amount)}</div>
              </div>
              <div className="form-group">
                <label className="form-label">Dekont (İsteğe bağlı)</label>
                <button className="btn bs btn-sm" onClick={() => slipRef.current?.click()}><Upload size={13} /> Dosya Seç</button>
                {slipFile && <span style={{ fontSize: 12, color: 'var(--text2)', marginLeft: 8 }}><Paperclip size={12} style={{ display: 'inline' }} /> {slipFile.name}</span>}
                <input ref={slipRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => setSlipFile(e.target.files?.[0] || null)} />
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

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ── Paylaşılan stiller ───────────────────────────────────────────────────────
const fg: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4 }
const fl: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: 'var(--text2)' }
const fi: React.CSSProperties = { width: '100%', padding: '0.75rem 1rem', background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 'var(--radius-sm)', fontSize: 15, color: 'var(--text)', outline: 'none', boxSizing: 'border-box' }
const errBox: React.CSSProperties = { fontSize: 13, color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', padding: '10px 14px', borderRadius: 8 }
const submitBtn: React.CSSProperties = { padding: '0.875rem', background: 'var(--grad)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 16, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }
const eyeBtn: React.CSSProperties = { position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', display: 'flex' }

export default function Page() {
  return <ThemeProvider><PortalPage /></ThemeProvider>
}

// ════════════════════════════════════════════════════
// PORTAL ÖDEMELER & MAĞAZA TAB — Akordiyon ay-bazlı
// ════════════════════════════════════════════════════
type OrderPortal = { id: string; total_amount: number; status: string; created_at: string; items: { product_name: string; quantity: number; unit_price: number }[] }

function PortalPaymentsTab({
  payments, orders, totalDebt, overdueCount, onNotify,
}: {
  payments: Payment[]
  orders: OrderPortal[]
  totalDebt: number
  overdueCount: number
  onNotify: (p: Payment) => void
}) {
  const PAY_BADGE: Record<string, string> = { completed: 'badge-green', pending: 'badge-yellow', overdue: 'badge-red', cancelled: 'badge-gray' }
  const PAY_LABEL: Record<string, string> = { completed: 'Ödendi', pending: 'Bekliyor', overdue: 'Gecikmiş', cancelled: 'İptal' }
  const ORDER_LABEL: Record<string, string> = {
    pending: 'Bekliyor', paid: 'Ödendi', preparing: 'Hazırlanıyor',
    shipped: 'Kargoda', delivered: 'Teslim', cancelled: 'İptal',
  }
  const MONTHS = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık']

  // İki listeyi birleştirip ay bazlı grupla
  type Item =
    | { kind: 'payment'; id: string; date: string; amount: number; status: string; payment: Payment }
    | { kind: 'order'; id: string; date: string; amount: number; status: string; order: OrderPortal }

  const items: Item[] = useMemo(() => {
    const merged: Item[] = []
    payments.forEach(p => merged.push({
      kind: 'payment', id: p.id, date: p.due_date || p.created_at,
      amount: p.amount, status: p.status, payment: p,
    }))
    orders.forEach(o => merged.push({
      kind: 'order', id: o.id, date: o.created_at,
      amount: o.total_amount, status: o.status, order: o,
    }))
    return merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [payments, orders])

  // Yıl-ay key gruplama
  const grouped = useMemo(() => {
    const map = new Map<string, Item[]>()
    items.forEach(it => {
      const d = new Date(it.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(it)
    })
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [items])

  const [openKeys, setOpenKeys] = useState<Set<string>>(() => new Set(grouped[0] ? [grouped[0][0]] : []))

  useEffect(() => {
    // İlk yüklemede en güncel ayı aç
    if (grouped.length > 0 && openKeys.size === 0) {
      setOpenKeys(new Set([grouped[0][0]]))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grouped.length])

  const toggle = (k: string) => setOpenKeys(s => {
    const next = new Set(s)
    if (next.has(k)) next.delete(k); else next.add(k)
    return next
  })

  const totalSpent = payments.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0)
    + orders.reduce((s, o) => s + o.total_amount, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Özet */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {[
          { label: 'Toplam Borç', value: formatCurrency(totalDebt), color: totalDebt > 0 ? '#ef4444' : '#10b981' },
          { label: 'Gecikmiş', value: overdueCount + ' ödeme', color: '#f59e0b' },
          { label: 'Toplam Harcama', value: formatCurrency(totalSpent), color: '#3b82f6' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {grouped.length === 0 ? (
        <div className="empty-state card"><div className="empty-state-icon">💳</div><div className="empty-state-title">Kayıt yok</div><div className="empty-state-text">Henüz ödeme veya satış yok.</div></div>
      ) : (
        grouped.map(([key, monthItems]) => {
          const [y, m] = key.split('-')
          const isOpen = openKeys.has(key)
          const monthTotal = monthItems.reduce((s, it) => s + it.amount, 0)
          const debtCount = monthItems.filter(it => it.kind === 'payment' && (it.status === 'pending' || it.status === 'overdue')).length
          return (
            <div key={key} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <button
                onClick={() => toggle(key)}
                aria-expanded={isOpen}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 16px', background: 'transparent', border: 'none',
                  cursor: 'pointer', textAlign: 'left', color: 'var(--text)',
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: 'var(--bg3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  fontSize: 11, fontWeight: 700, color: 'var(--text2)', lineHeight: 1.1, textAlign: 'center',
                }}>
                  <div>{MONTHS[parseInt(m) - 1].slice(0, 3)}<br /><span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600 }}>{y}</span></div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{MONTHS[parseInt(m) - 1]} {y}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                    {monthItems.length} işlem
                    {debtCount > 0 && <span style={{ marginLeft: 6, color: '#f59e0b' }}>· {debtCount} bekleyen</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{formatCurrency(monthTotal)}</div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--text3)', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none', flexShrink: 0 }}>
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {isOpen && (
                <div style={{ borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
                  {monthItems.map(it => {
                    if (it.kind === 'payment') {
                      const p = it.payment
                      return (
                        <div key={`p-${p.id}`} style={{
                          padding: '12px 16px',
                          borderBottom: '1px solid var(--border)',
                          display: 'flex', alignItems: 'center', gap: 10,
                          borderLeft: `3px solid ${p.status === 'completed' ? '#10b981' : p.status === 'overdue' ? '#ef4444' : '#f59e0b'}`,
                        }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: 8,
                            background: 'rgba(45,92,179,0.12)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          }}>
                            <CreditCard size={14} color="var(--blue2)" />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{p.description || p.category || 'Aidat'}</div>
                            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                              {p.due_date ? `Son: ${formatDate(p.due_date)}` : formatDate(p.created_at)}
                              <span style={{ marginLeft: 6 }}>· {p.category || 'Aidat'}</span>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>{formatCurrency(p.amount)}</div>
                            <span className={`badge ${PAY_BADGE[p.status]}`} style={{ fontSize: 10 }}>{PAY_LABEL[p.status]}</span>
                          </div>
                        </div>
                      )
                    }
                    const o = it.order
                    const itemList = o.items?.map(i => `${i.quantity}× ${i.product_name}`).join(', ') || 'Sipariş'
                    return (
                      <div key={`o-${o.id}`} style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid var(--border)',
                        display: 'flex', alignItems: 'center', gap: 10,
                        borderLeft: '3px solid #8b5cf6',
                      }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 8,
                          background: 'rgba(139,92,246,0.14)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          <ShoppingBag size={14} color="#8b5cf6" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>Mağaza Sipariş</div>
                          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {itemList}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{formatCurrency(o.total_amount)}</div>
                          <span className={`badge ${o.status === 'paid' || o.status === 'delivered' ? 'badge-green' : o.status === 'cancelled' ? 'badge-red' : 'badge-yellow'}`} style={{ fontSize: 10 }}>
                            {ORDER_LABEL[o.status] || o.status}
                          </span>
                        </div>
                      </div>
                    )
                  })}

                  {/* Bekleyen ödemeler için "Ödedim" butonları */}
                  {monthItems.filter(it => it.kind === 'payment' && (it.status === 'pending' || it.status === 'overdue') && it.payment.notification_status !== 'pending_approval').map(it => {
                    const p = (it as Extract<Item, { kind: 'payment' }>).payment
                    return (
                      <div key={`btn-${p.id}`} style={{ padding: '8px 16px', background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderBottom: '1px solid var(--border)' }}>
                        <span style={{ fontSize: 12, color: 'var(--text2)' }}>{p.description || 'Aidat'} · {formatCurrency(p.amount)}</span>
                        <button className="btn bp btn-sm" onClick={() => onNotify(p)}>
                          <Bell size={11} /> Ödedim
                        </button>
                      </div>
                    )
                  })}

                  {monthItems.some(it => it.kind === 'payment' && it.payment.notification_status === 'pending_approval') && (
                    <div style={{ padding: '10px 16px', fontSize: 12, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(245,158,11,0.06)' }}>
                      <Clock size={12} /> Bu aydaki bazı bildirimler onay bekliyor
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
