'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, ChevronRight, Calendar, Users, Clock } from 'lucide-react'
import type { Class } from '@/types'

const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']
const DAYS_SHORT = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

// Get Monday of the week containing 'd'
function getMondayOf(d: Date): Date {
  const day = d.getDay() // 0=Sun
  const diff = day === 0 ? -6 : 1 - day
  const mon = new Date(d)
  mon.setDate(d.getDate() + diff)
  mon.setHours(0, 0, 0, 0)
  return mon
}

// Get ISO date string YYYY-MM-DD
function toISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

// Format schedule_time for display
function timeLabel(cls: Class): string {
  const s = cls.schedule_time || ''
  const e = cls.schedule_time_end || ''
  if (s && e) return `${s}–${e}`
  if (s) return s
  return ''
}

export default function CalendarPage() {
  const router = useRouter()
  const supabase = createClient()
  const [monday, setMonday] = useState<Date>(() => getMondayOf(new Date()))
  const [classes, setClasses] = useState<Class[]>([])
  const [athleteCounts, setAthleteCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const today = toISO(new Date())

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const orgId = user?.user_metadata?.organization_id
    setLoading(true)

    const [{ data: cls }, { data: athletes }] = await Promise.all([
      supabase.from('classes')
        .select('*, sports(name), coaches(first_name, last_name)')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .order('name'),
      supabase.from('athletes')
        .select('id, class_id')
        .eq('organization_id', orgId)
        .eq('status', 'active'),
    ])

    setClasses(cls || [])

    // Count athletes per class
    const counts: Record<string, number> = {}
    ;(athletes || []).forEach(a => {
      if (a.class_id) counts[a.class_id] = (counts[a.class_id] || 0) + 1
    })
    setAthleteCounts(counts)
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  const prevWeek = () => {
    const d = new Date(monday)
    d.setDate(d.getDate() - 7)
    setMonday(d)
  }

  const nextWeek = () => {
    const d = new Date(monday)
    d.setDate(d.getDate() + 7)
    setMonday(d)
  }

  const goToday = () => setMonday(getMondayOf(new Date()))

  // Build the 7 dates for this week
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })

  // Get classes for a specific day index (0=Mon...6=Sun)
  const classesForDay = (dayIndex: number) => {
    return classes
      .filter(c => {
        const days = c.schedule_days || []
        return days.includes(dayIndex)
      })
      .sort((a, b) => (a.schedule_time || '').localeCompare(b.schedule_time || ''))
  }

  // Format week range label
  const weekLabel = () => {
    const end = weekDates[6]
    const startFmt = monday.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })
    const endFmt = end.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
    return `${startFmt} – ${endFmt}`
  }

  const handleClassClick = (cls: Class, date: Date) => {
    router.push(`/attendance?date=${toISO(date)}&class=${cls.id}`)
  }

  const noScheduleClasses = classes.filter(c => !c.schedule_days || c.schedule_days.length === 0)

  return (
    <DashboardLayout title="Takvim">
      <div className="page-header">
        <div>
          <h1 className="page-title">Takvim</h1>
          <p className="page-subtitle">Haftalık antrenman programı</p>
        </div>
        <a href="/classes" style={{ textDecoration: 'none' }} className="btn bd btn-sm">
          Sınıfları Yönet
        </a>
      </div>

      {/* Week navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <button className="btn bs btn-sm" onClick={prevWeek}><ChevronLeft size={16} /></button>
        <button className="btn bs btn-sm" onClick={goToday}>Bugün</button>
        <button className="btn bs btn-sm" onClick={nextWeek}><ChevronRight size={16} /></button>
        <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text)' }}>{weekLabel()}</span>
      </div>

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text3)' }}>
          <Calendar size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
          <div>Yükleniyor...</div>
        </div>
      ) : (
        <>
          {/* Weekly grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '24px' }}>
            {weekDates.map((date, dayIndex) => {
              const iso = toISO(date)
              const isToday = iso === today
              const dayClasses = classesForDay(dayIndex)
              return (
                <div key={dayIndex} style={{
                  display: 'flex', flexDirection: 'column', gap: '6px',
                  background: isToday ? 'rgba(45,92,179,0.06)' : 'transparent',
                  borderRadius: '10px', padding: '8px',
                  border: isToday ? '1px solid var(--border2)' : '1px solid transparent',
                }}>
                  {/* Day header */}
                  <div style={{ textAlign: 'center', marginBottom: '4px' }}>
                    <div style={{
                      fontSize: '12px', fontWeight: 700, color: isToday ? 'var(--blue2)' : 'var(--text3)',
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>{DAYS_SHORT[dayIndex]}</div>
                    <div style={{
                      fontSize: '18px', fontWeight: 800, lineHeight: 1.2,
                      color: isToday ? 'var(--blue2)' : 'var(--text)',
                    }}>
                      {date.getDate()}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text3)' }}>
                      {date.toLocaleDateString('tr-TR', { month: 'short' })}
                    </div>
                  </div>

                  {/* Classes */}
                  {dayClasses.length === 0 ? (
                    <div style={{ flex: 1, minHeight: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text3)', opacity: 0.5 }}>—</span>
                    </div>
                  ) : (
                    dayClasses.map(cls => {
                      const sport = cls.sport as { name: string } | null
                      const coach = cls.coach as { first_name: string; last_name: string } | null
                      const count = athleteCounts[cls.id] || 0
                      const time = timeLabel(cls)
                      return (
                        <button
                          key={cls.id}
                          onClick={() => handleClassClick(cls, date)}
                          style={{
                            width: '100%', background: 'var(--bg2)', border: '1px solid var(--border2)',
                            borderRadius: '8px', padding: '8px', cursor: 'pointer', textAlign: 'left',
                            transition: 'all 0.15s', display: 'flex', flexDirection: 'column', gap: '4px',
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--blue2)'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border2)'; (e.currentTarget as HTMLButtonElement).style.transform = '' }}
                        >
                          <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text)', lineHeight: 1.3 }}>{cls.name}</div>
                          {sport && <div style={{ fontSize: '11px', color: 'var(--blue2)', fontWeight: 600 }}>{sport.name}</div>}
                          {time && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: 'var(--text3)' }}>
                              <Clock size={10} /> {time}
                            </div>
                          )}
                          {coach && (
                            <div style={{ fontSize: '11px', color: 'var(--text3)' }}>
                              {coach.first_name} {coach.last_name}
                            </div>
                          )}
                          {count > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: 'var(--text3)' }}>
                              <Users size={10} /> {count} sporcu
                            </div>
                          )}
                        </button>
                      )
                    })
                  )}
                </div>
              )
            })}
          </div>

          {/* Hint */}
          <div style={{ fontSize: '12px', color: 'var(--text3)', textAlign: 'center', marginBottom: '16px' }}>
            Bir sınıfa tıklayarak o gün için yoklama sayfasına geçebilirsiniz.
          </div>

          {/* Unscheduled classes */}
          {noScheduleClasses.length > 0 && (
            <div className="card" style={{ marginTop: '8px' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '10px', color: 'var(--text2)' }}>
                📋 Program Girilmemiş Sınıflar ({noScheduleClasses.length})
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {noScheduleClasses.map(cls => (
                  <a key={cls.id} href="/classes" style={{
                    padding: '6px 12px', background: 'var(--bg4)', borderRadius: '6px',
                    fontSize: '13px', color: 'var(--text2)', textDecoration: 'none',
                    border: '1px solid var(--border)',
                  }}>
                    {cls.name}
                  </a>
                ))}
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '8px' }}>
                <a href="/classes" style={{ color: 'var(--blue2)', textDecoration: 'none' }}>Sınıfları düzenle</a> → antrenman günlerini seçin
              </p>
            </div>
          )}
        </>
      )}

      <style>{`
        @media (max-width: 900px) {
          .cal-grid { grid-template-columns: repeat(4, 1fr) !important; }
        }
        @media (max-width: 640px) {
          .cal-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </DashboardLayout>
  )
}
