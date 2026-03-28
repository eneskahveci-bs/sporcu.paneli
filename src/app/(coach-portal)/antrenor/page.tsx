'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ThemeProvider, useTheme } from '@/providers/ThemeProvider'
import {
  LogOut, Sun, Moon, Calendar, Users, ClipboardCheck,
  User, Check, X, Minus, Save, Loader2, Clock, ChevronLeft, ChevronRight,
  MessageSquare, Send,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDate, getInitials } from '@/lib/utils/formatters'
import type { Class, Athlete } from '@/types'

type AttStatus = 'present' | 'absent' | 'excused'

const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']
const DAYS_SHORT = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

function getMondayOf(d: Date): Date {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const mon = new Date(d)
  mon.setDate(d.getDate() + diff)
  mon.setHours(0, 0, 0, 0)
  return mon
}

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

// Bugünün haftanın kaçıncı günü olduğunu döner (0=Pzt, 6=Paz)
function todayDayIndex(): number {
  const d = new Date().getDay() // 0=Sun, 1=Mon...6=Sat
  return d === 0 ? 6 : d - 1
}

function CoachPortal() {
  const supabase = createClient()
  const { theme, toggleTheme } = useTheme()

  const [loading, setLoading] = useState(true)
  const [coach, setCoach] = useState<Record<string, unknown> | null>(null)
  const [classes, setClasses] = useState<Class[]>([])
  const [athletesByClass, setAthletesByClass] = useState<Record<string, Athlete[]>>({})
  const [tab, setTab] = useState(0)

  // Haftalık takvim
  const [monday, setMonday] = useState<Date>(() => getMondayOf(new Date()))

  // Mesajlaşma state
  const [messages, setMessages] = useState<{id: string; receiver_id: string; subject: string; content: string; created_at: string; is_read: boolean}[]>([])
  const [composeOpen, setComposeOpen] = useState(false)
  const [msgForm, setMsgForm] = useState({ receiver_id: '', subject: '', content: '' })
  const [sendingMsg, setSendingMsg] = useState(false)

  // Yoklama state
  const [selectedClass, setSelectedClass] = useState<Class | null>(null)
  const [attendanceDate, setAttendanceDate] = useState(toISO(new Date()))
  const [statusMap, setStatusMap] = useState<Record<string, AttStatus>>({})
  const [savingAtt, setSavingAtt] = useState(false)
  const [attLoaded, setAttLoaded] = useState(false)

  const signOut = async () => { await supabase.auth.signOut(); window.location.href = '/' }

  // ── Veri yükleme ───────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/'; return }

    const orgId = user.user_metadata?.organization_id
    const coachId = user.user_metadata?.coach_id

    // Antrenör kaydını bul
    let coachQuery = supabase.from('coaches').select('*, sports(name), branches(name)')
    if (coachId) {
      coachQuery = coachQuery.eq('id', coachId)
    } else {
      coachQuery = coachQuery.eq('auth_user_id', user.id)
    }
    const { data: coachData } = await coachQuery.eq('organization_id', orgId).single()

    if (!coachData) {
      toast.error('Antrenör profili bulunamadı')
      setLoading(false)
      return
    }
    setCoach(coachData)

    // Bu antrenörün sınıfları
    const { data: clsData } = await supabase
      .from('classes')
      .select('*, sports(name)')
      .eq('organization_id', orgId)
      .eq('coach_id', coachData.id)
      .eq('is_active', true)
      .order('name')

    const cls = clsData || []
    setClasses(cls)

    // Her sınıftaki sporcular
    if (cls.length > 0) {
      const { data: athletes } = await supabase
        .from('athletes')
        .select('*')
        .eq('organization_id', orgId)
        .eq('status', 'active')
        .in('class_id', cls.map((c: Class) => c.id))

      const byClass: Record<string, Athlete[]> = {}
      ;(athletes || []).forEach((a: Athlete) => {
        if (a.class_id) {
          if (!byClass[a.class_id]) byClass[a.class_id] = []
          byClass[a.class_id].push(a)
        }
      })
      setAthletesByClass(byClass)
    }

    // Gönderilen mesajlar
    const { data: msgs } = await supabase.from('messages').select('*').eq('sender_id', user.id).order('created_at', { ascending: false }).limit(50)
    setMessages(msgs || [])

    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  // ── Yoklama yükle ─────────────────────────────────────────────────────────
  const loadAttendance = useCallback(async (cls: Class, date: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    const orgId = user?.user_metadata?.organization_id
    const athletes = athletesByClass[cls.id] || []

    const { data: att } = await supabase
      .from('attendance')
      .select('*')
      .eq('organization_id', orgId)
      .eq('date', date)
      .in('athlete_id', athletes.map(a => a.id))

    const map: Record<string, AttStatus> = {}
    ;(att || []).forEach((r: { athlete_id: string; status: AttStatus }) => { map[r.athlete_id] = r.status })
    athletes.forEach(a => { if (!map[a.id]) map[a.id] = 'present' })
    setStatusMap(map)
    setAttLoaded(true)
  }, [supabase, athletesByClass])

  const openAttendance = (cls: Class) => {
    setSelectedClass(cls)
    setAttLoaded(false)
    setStatusMap({})
    loadAttendance(cls, attendanceDate)
  }

  const saveAttendance = async () => {
    if (!selectedClass) return
    setSavingAtt(true)
    const { data: { user } } = await supabase.auth.getUser()
    const orgId = user?.user_metadata?.organization_id
    const athletes = athletesByClass[selectedClass.id] || []

    const records = athletes.map(a => ({
      organization_id: orgId,
      athlete_id: a.id,
      date: attendanceDate,
      status: statusMap[a.id] || 'present',
      recorded_by: user?.id,
    }))

    const { error } = await supabase.from('attendance').upsert(records, { onConflict: 'athlete_id,date' })
    setSavingAtt(false)
    if (error) { toast.error('Hata: ' + error.message); return }
    toast.success(`${records.length} sporcu için yoklama kaydedildi`)
    setSelectedClass(null)
  }

  // ── Render yardımcıları ────────────────────────────────────────────────────
  const todayIdx = todayDayIndex()
  const todayClasses = classes.filter(c => (c.schedule_days || []).includes(todayIdx))

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })

  const allAthletes = Object.values(athletesByClass).flat()
    .filter((a, i, arr) => arr.findIndex(x => x.id === a.id) === i) // dedupe

  const firstName = coach ? (coach.first_name as string) : ''
  const lastName = coach ? (coach.last_name as string) : ''
  const sportName = coach ? ((coach.sports as { name: string } | null)?.name || '') : ''

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ textAlign: 'center', color: 'var(--text3)' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎽</div>
          <div>Yükleniyor...</div>
        </div>
      </div>
    )
  }

  if (!coach) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', flexDirection: 'column', gap: '12px' }}>
        <div style={{ fontSize: '48px' }}>⚠️</div>
        <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>Antrenör profili bulunamadı</div>
        <div style={{ fontSize: '14px', color: 'var(--text3)' }}>Lütfen yöneticinizle iletişime geçin</div>
        <button className="btn bs" onClick={signOut}>Çıkış Yap</button>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <header style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)', padding: '0 20px', height: '60px', display: 'flex', alignItems: 'center', gap: '12px', position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(12px)' }}>
        <div style={{ fontSize: '22px' }}>🎽</div>
        <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text)' }}>Antrenör Paneli</div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <button onClick={toggleTheme} className="header-btn" aria-label="Tema">{theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}</button>
          <button onClick={signOut} className="header-btn" aria-label="Çıkış"><LogOut size={15} /></button>
        </div>
      </header>

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '20px 16px' }}>
        {/* Profil kartı */}
        <div className="card" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="avatar avatar-lg" style={{ background: 'var(--grad)' }}>{getInitials(firstName, lastName)}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '20px' }}>{firstName} {lastName}</div>
            <div style={{ fontSize: '13px', color: 'var(--text3)', marginTop: '2px' }}>
              {sportName && `${sportName} •`} Antrenör
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
              <span className="badge badge-blue" style={{ fontSize: '12px' }}>{classes.length} Sınıf</span>
              <span className="badge badge-green" style={{ fontSize: '12px' }}>{allAthletes.length} Sporcu</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs" style={{ marginBottom: '20px' }}>
          {[
            { label: 'Bugün', icon: <Calendar size={14} /> },
            { label: 'Program', icon: <Clock size={14} /> },
            { label: 'Sporcularım', icon: <Users size={14} /> },
            { label: 'Mesajlar', icon: <MessageSquare size={14} /> },
            { label: 'Profilim', icon: <User size={14} /> },
          ].map((t, i) => (
            <button key={t.label} className={`tab-btn${tab === i ? ' active' : ''}`} onClick={() => { setTab(i); setSelectedClass(null) }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── Bugün ── */}
        {tab === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text)' }}>
                📅 {new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px', alignItems: 'center' }}>
                <label style={{ fontSize: '13px', color: 'var(--text2)' }}>Tarih:</label>
                <input type="date" className="form-input" style={{ width: 'auto', minHeight: '36px', padding: '0 10px', fontSize: '13px' }}
                  value={attendanceDate} onChange={e => { setAttendanceDate(e.target.value); setSelectedClass(null) }}
                  max={toISO(new Date())} />
              </div>
            </div>

            {/* Yoklama modalı */}
            {selectedClass && (
              <div className="card" style={{ border: '2px solid var(--blue2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '16px' }}>{selectedClass.name} — Yoklama</div>
                    <div style={{ fontSize: '13px', color: 'var(--text3)' }}>{formatDate(attendanceDate)}</div>
                  </div>
                  <button className="btn bs btn-sm" onClick={() => setSelectedClass(null)}>İptal</button>
                </div>

                {!attLoaded ? (
                  <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text3)' }}>
                    <Loader2 size={22} style={{ animation: 'spin 1s linear infinite', margin: '0 auto' }} />
                  </div>
                ) : (athletesByClass[selectedClass.id] || []).length === 0 ? (
                  <div className="empty-state" style={{ padding: '24px' }}>
                    <div className="empty-state-icon">👥</div>
                    <div className="empty-state-title">Bu sınıfta sporcu yok</div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                      <button className="btn bsu btn-sm" onClick={() => {
                        const map: Record<string, AttStatus> = {}
                        ;(athletesByClass[selectedClass.id] || []).forEach(a => { map[a.id] = 'present' })
                        setStatusMap(p => ({ ...p, ...map }))
                      }}><Check size={12} /> Tümü Geldi</button>
                      <button className="btn bd btn-sm" onClick={() => {
                        const map: Record<string, AttStatus> = {}
                        ;(athletesByClass[selectedClass.id] || []).forEach(a => { map[a.id] = 'absent' })
                        setStatusMap(p => ({ ...p, ...map }))
                      }}><X size={12} /> Tümü Gelmedi</button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                      {(athletesByClass[selectedClass.id] || []).map(a => {
                        const status = statusMap[a.id] || 'present'
                        return (
                          <div key={a.id} style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '10px 14px', background: 'var(--bg3)', borderRadius: '8px',
                            borderLeft: `4px solid ${status === 'present' ? 'var(--green)' : status === 'absent' ? 'var(--red)' : 'var(--yellow)'}`,
                          }}>
                            <div className="avatar avatar-sm">{getInitials(a.first_name, a.last_name)}</div>
                            <div style={{ flex: 1, fontSize: '14px', fontWeight: 600 }}>{a.first_name} {a.last_name}</div>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              {([['present', 'Geldi', 'var(--green)', <Check key="c" size={11} />],
                                ['absent', 'Gelmedi', 'var(--red)', <X key="x" size={11} />],
                                ['excused', 'İzinli', 'var(--yellow)', <Minus key="m" size={11} />]] as const).map(([s, label, color, icon]) => (
                                <button key={s} className="btn btn-xs" onClick={() => setStatusMap(p => ({ ...p, [a.id]: s as AttStatus }))}
                                  style={{ background: status === s ? color : 'var(--bg4)', color: status === s ? '#fff' : 'var(--text2)', border: `1px solid ${status === s ? color : 'var(--border)'}` }}>
                                  {icon} {label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <button className="btn bp" onClick={saveAttendance} disabled={savingAtt} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      {savingAtt ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={15} />}
                      {savingAtt ? 'Kaydediliyor...' : 'Yoklamayı Kaydet'}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Bugünün sınıfları */}
            {todayClasses.length === 0 ? (
              <div className="card">
                <div className="empty-state" style={{ padding: '32px' }}>
                  <div className="empty-state-icon">☀️</div>
                  <div className="empty-state-title">Bugün antrenman yok</div>
                  <div style={{ fontSize: '13px', color: 'var(--text3)', marginTop: '8px' }}>
                    {DAYS[todayIdx]} günü için programlanmış sınıf bulunmuyor
                  </div>
                </div>
              </div>
            ) : (
              todayClasses.map(cls => {
                const sport = cls.sport as { name: string } | null
                const athletes = athletesByClass[cls.id] || []
                const time = cls.schedule_time && cls.schedule_time_end
                  ? `${cls.schedule_time} – ${cls.schedule_time_end}`
                  : cls.schedule_time || ''
                return (
                  <div key={cls.id} className="card">
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '16px' }}>{cls.name}</div>
                        <div style={{ fontSize: '13px', color: 'var(--text3)', marginTop: '4px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                          {sport && <span>🏅 {sport.name}</span>}
                          {time && <span>⏰ {time}</span>}
                          <span>👥 {athletes.length} sporcu</span>
                        </div>
                      </div>
                      <button
                        className="btn bp btn-sm"
                        onClick={() => openAttendance(cls)}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}
                      >
                        <ClipboardCheck size={14} /> Yoklama Al
                      </button>
                    </div>
                    {athletes.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                        {athletes.slice(0, 8).map(a => (
                          <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: 'var(--bg3)', borderRadius: '20px', fontSize: '12px', color: 'var(--text2)' }}>
                            <div className="avatar" style={{ width: '20px', height: '20px', fontSize: '9px', flexShrink: 0, background: 'var(--grad)' }}>{getInitials(a.first_name, a.last_name)}</div>
                            {a.first_name} {a.last_name}
                          </div>
                        ))}
                        {athletes.length > 8 && <div style={{ padding: '4px 10px', background: 'var(--bg3)', borderRadius: '20px', fontSize: '12px', color: 'var(--text3)' }}>+{athletes.length - 8} daha</div>}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* ── Haftalık Program ── */}
        {tab === 1 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <button className="btn bs btn-sm" onClick={() => { const d = new Date(monday); d.setDate(d.getDate() - 7); setMonday(d) }}><ChevronLeft size={15} /></button>
              <button className="btn bs btn-sm" onClick={() => setMonday(getMondayOf(new Date()))}>Bu Hafta</button>
              <button className="btn bs btn-sm" onClick={() => { const d = new Date(monday); d.setDate(d.getDate() + 7); setMonday(d) }}><ChevronRight size={15} /></button>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
                {monday.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} – {weekDates[6].toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
              {weekDates.map((date, dayIdx) => {
                const iso = toISO(date)
                const isToday = iso === toISO(new Date())
                const dayClasses = classes.filter(c => (c.schedule_days || []).includes(dayIdx))
                return (
                  <div key={dayIdx} style={{
                    display: 'flex', flexDirection: 'column', gap: '4px',
                    background: isToday ? 'rgba(45,92,179,0.06)' : 'transparent',
                    borderRadius: '10px', padding: '8px',
                    border: isToday ? '1px solid var(--border2)' : '1px solid transparent',
                  }}>
                    <div style={{ textAlign: 'center', marginBottom: '4px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: isToday ? 'var(--blue2)' : 'var(--text3)', textTransform: 'uppercase' }}>{DAYS_SHORT[dayIdx]}</div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: isToday ? 'var(--blue2)' : 'var(--text)' }}>{date.getDate()}</div>
                    </div>
                    {dayClasses.length === 0 ? (
                      <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text3)', opacity: 0.5, padding: '8px 0' }}>—</div>
                    ) : (
                      dayClasses.map(cls => {
                        const time = cls.schedule_time ? `${cls.schedule_time}${cls.schedule_time_end ? `–${cls.schedule_time_end}` : ''}` : ''
                        return (
                          <div key={cls.id} style={{ background: 'var(--grad)', borderRadius: '6px', padding: '6px 8px', cursor: 'default' }}>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>{cls.name}</div>
                            {time && <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.8)', marginTop: '2px' }}>{time}</div>}
                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)', marginTop: '1px' }}>👥 {(athletesByClass[cls.id] || []).length}</div>
                          </div>
                        )
                      })
                    )}
                  </div>
                )
              })}
            </div>

            {classes.filter(c => !c.schedule_days || c.schedule_days.length === 0).length > 0 && (
              <div className="card" style={{ marginTop: '16px', padding: '14px 16px', background: 'rgba(216,163,18,0.08)', border: '1px solid rgba(216,163,18,0.3)' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>⚠️ Program Girilmemiş Sınıflar</div>
                <div style={{ fontSize: '12px', color: 'var(--text2)' }}>
                  {classes.filter(c => !c.schedule_days || c.schedule_days.length === 0).map(c => c.name).join(', ')}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Sporcularım ── */}
        {tab === 2 && (
          <div>
            {allAthletes.length === 0 ? (
              <div className="card">
                <div className="empty-state" style={{ padding: '40px' }}>
                  <div className="empty-state-icon">👥</div>
                  <div className="empty-state-title">Henüz sporcu yok</div>
                  <div style={{ fontSize: '13px', color: 'var(--text3)', marginTop: '8px' }}>Sınıflarınıza sporcu eklendikçe burada görünecek</div>
                </div>
              </div>
            ) : (
              classes.map(cls => {
                const athletes = athletesByClass[cls.id] || []
                if (athletes.length === 0) return null
                const sport = cls.sport as { name: string } | null
                return (
                  <div key={cls.id} className="card" style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '15px' }}>{cls.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text3)' }}>{sport?.name || ''} • {athletes.length} sporcu</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {athletes.map(a => (
                        <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 10px', background: 'var(--bg3)', borderRadius: '8px' }}>
                          <div className="avatar avatar-sm">{getInitials(a.first_name, a.last_name)}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: '14px' }}>{a.first_name} {a.last_name}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text3)' }}>{a.phone || ''}</div>
                          </div>
                          <span className={`badge ${a.status === 'active' ? 'badge-green' : 'badge-gray'}`} style={{ fontSize: '11px' }}>
                            {a.status === 'active' ? 'Aktif' : 'Pasif'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* ── Mesajlar ── */}
        {tab === 3 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 className="m-tit">Gönderilen Mesajlar</h3>
              <button className="btn bp btn-sm" onClick={() => setComposeOpen(true)}>
                <Send size={13} /> Mesaj Gönder
              </button>
            </div>

            {messages.length === 0 ? (
              <div className="card">
                <div className="empty-state" style={{ padding: '40px' }}>
                  <div className="empty-state-icon">💬</div>
                  <div className="empty-state-title">Henüz mesaj gönderilmemiş</div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {messages.map(m => {
                  const receiver = allAthletes.find(a => a.auth_user_id === m.receiver_id)
                  return (
                    <div key={m.id} className="card" style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <MessageSquare size={16} style={{ color: 'var(--blue2)', flexShrink: 0, marginTop: '2px' }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: '14px' }}>{m.subject}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text3)', margin: '4px 0' }}>
                            Alıcı: {receiver ? `${receiver.first_name} ${receiver.last_name}` : 'Sporcu'} • {new Date(m.created_at).toLocaleDateString('tr-TR')}
                          </div>
                          <div style={{ fontSize: '13px', color: 'var(--text2)' }}>{m.content}</div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Mesaj Yazma Modalı */}
            {composeOpen && (
              <div className="modal-overlay" onClick={() => setComposeOpen(false)}>
                <div className="modal" onClick={e => e.stopPropagation()}>
                  <div className="modal-header">
                    <h2 className="modal-title">Sporcu&apos;ya Mesaj Gönder</h2>
                    <button onClick={() => setComposeOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '20px' }}>×</button>
                  </div>
                  <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div className="form-group">
                      <label className="form-label required">Sporcu</label>
                      <select className="form-select" value={msgForm.receiver_id} onChange={e => setMsgForm(p => ({ ...p, receiver_id: e.target.value }))}>
                        <option value="">Seçin</option>
                        {allAthletes.filter(a => a.auth_user_id).map(a => (
                          <option key={a.id} value={a.auth_user_id!}>{a.first_name} {a.last_name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label required">Konu</label>
                      <input className="form-input" value={msgForm.subject} onChange={e => setMsgForm(p => ({ ...p, subject: e.target.value }))} placeholder="Mesaj konusu" />
                    </div>
                    <div className="form-group">
                      <label className="form-label required">Mesaj</label>
                      <textarea className="form-input" style={{ minHeight: '100px' }} value={msgForm.content} onChange={e => setMsgForm(p => ({ ...p, content: e.target.value }))} placeholder="Mesajınızı yazın..." />
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button className="btn bs" onClick={() => setComposeOpen(false)}>İptal</button>
                    <button className="btn bp" disabled={sendingMsg || !msgForm.receiver_id || !msgForm.subject || !msgForm.content} onClick={async () => {
                      setSendingMsg(true)
                      const { data: { user } } = await supabase.auth.getUser()
                      const { error } = await supabase.from('messages').insert({
                        sender_id: user?.id,
                        receiver_id: msgForm.receiver_id,
                        subject: msgForm.subject,
                        content: msgForm.content,
                        sender_name: `${firstName} ${lastName}`,
                        is_read: false,
                        organization_id: user?.user_metadata?.organization_id,
                      })
                      setSendingMsg(false)
                      if (error) { toast.error('Gönderilemedi: ' + error.message); return }
                      toast.success('Mesaj gönderildi')
                      setComposeOpen(false)
                      setMsgForm({ receiver_id: '', subject: '', content: '' })
                      load()
                    }}>
                      {sendingMsg ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
                      {sendingMsg ? 'Gönderiliyor...' : 'Gönder'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Profilim ── */}
        {tab === 4 && (
          <div className="card">
            <h3 className="m-tit" style={{ marginBottom: '20px' }}>Profilim</h3>
            <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {[
                { label: 'Ad Soyad', value: `${firstName} ${lastName}` },
                { label: 'Spor Dalı', value: sportName || '-' },
                { label: 'Telefon', value: coach.phone as string || '-' },
                { label: 'E-posta', value: coach.email as string || '-' },
                { label: 'Uzmanlık', value: coach.specialization as string || '-' },
                { label: 'Lisans No', value: coach.license_number as string || '-' },
                { label: 'Başlangıç Tarihi', value: formatDate(coach.start_date as string) },
                { label: 'TC Kimlik', value: coach.tc as string || '-' },
              ].map(item => (
                <div key={item.label}>
                  <dt style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '2px' }}>{item.label}</dt>
                  <dd style={{ fontSize: '14px', fontWeight: 500 }}>{item.value}</dd>
                </div>
              ))}
            </dl>
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)', fontSize: '13px', color: 'var(--text3)' }}>
              Giriş: <strong style={{ color: 'var(--text2)' }}>{coach.tc ? `${coach.tc}@antrenor.tc` : '-'}</strong>
              &nbsp;/&nbsp;Şifre: <strong style={{ color: 'var(--text2)' }}>TC son 6 hane</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Page() {
  return <ThemeProvider><CoachPortal /></ThemeProvider>
}
