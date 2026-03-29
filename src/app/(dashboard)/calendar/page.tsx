'use client'

import { useEffect, useState, useCallback } from 'react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import {
  ChevronLeft, ChevronRight, Clock, Users, ClipboardCheck,
  LayoutList, Grid3X3, Plus, X, BookOpen, Loader2,
} from 'lucide-react'
import type { Class } from '@/types'

const DAY_SHORT  = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']
const MONTHS     = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']

const PALETTE = [
  { bg: 'rgba(45,92,179,0.13)', border: '#2d5cb3', dot: '#2d5cb3' },
  { bg: 'rgba(34,197,94,0.13)',  border: '#16a34a', dot: '#16a34a' },
  { bg: 'rgba(168,85,247,0.13)', border: '#9333ea', dot: '#9333ea' },
  { bg: 'rgba(251,146,60,0.13)', border: '#ea7629', dot: '#ea7629' },
  { bg: 'rgba(239,68,68,0.13)',  border: '#dc2626', dot: '#dc2626' },
  { bg: 'rgba(20,184,166,0.13)', border: '#0d9488', dot: '#0d9488' },
  { bg: 'rgba(236,72,153,0.13)', border: '#db2777', dot: '#db2777' },
]

// Helpers
function toISO(d: Date) { return d.toISOString().slice(0, 10) }
function getDOW(d: Date) { const w = d.getDay(); return w === 0 ? 6 : w - 1 } // 0=Mon
function getMondayOf(d: Date) {
  const m = new Date(d); m.setDate(d.getDate() - getDOW(d)); m.setHours(0, 0, 0, 0); return m
}
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r }

function buildMiniCal(year: number, month: number) {
  const firstDOW = getDOW(new Date(year, month, 1))
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevTotal  = new Date(year, month, 0).getDate()
  const cells: { d: number; iso: string; cur: boolean }[] = []
  for (let i = firstDOW - 1; i >= 0; i--)
    cells.push({ d: prevTotal - i, iso: toISO(new Date(year, month - 1, prevTotal - i)), cur: false })
  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ d, iso: toISO(new Date(year, month, d)), cur: true })
  let nd = 1
  while (cells.length % 7 !== 0)
    cells.push({ d: nd++, iso: toISO(new Date(year, month + 1, nd - 1)), cur: false })
  return cells
}

type ClassWithJoins = Class & {
  sport?: { name: string } | null
  coach?: { first_name: string; last_name: string } | null
  branch?: { name: string } | null
}

export default function CalendarPage() {
  const supabase = createClient()
  const today = toISO(new Date())

  const [view, setView] = useState<'agenda' | 'week'>('agenda')
  const [agendaStart, setAgendaStart] = useState(() => new Date(today))
  const [weekMon, setWeekMon] = useState(() => getMondayOf(new Date()))
  const [miniMonth, setMiniMonth] = useState(() => new Date())
  const [classes, setClasses] = useState<ClassWithJoins[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [expandedKey, setExpandedKey] = useState<string | null>(null) // "classId_dateISO"
  const [colorMap, setColorMap] = useState<Record<string, number>>({})

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const orgId = user?.user_metadata?.organization_id
    setLoading(true)
    const [{ data: cls }, { data: athletes }] = await Promise.all([
      supabase.from('classes')
        .select('*, sports(name), coaches(first_name, last_name), branches(name)')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .order('name'),
      supabase.from('athletes')
        .select('id, class_id')
        .eq('organization_id', orgId)
        .eq('status', 'active'),
    ])
    const list = (cls || []) as ClassWithJoins[]
    setClasses(list)
    const cm: Record<string, number> = {}
    list.forEach((c, i) => { cm[c.id] = i % PALETTE.length })
    setColorMap(cm)
    const cntMap: Record<string, number> = {}
    ;(athletes || []).forEach(a => { if (a.class_id) cntMap[a.class_id] = (cntMap[a.class_id] || 0) + 1 })
    setCounts(cntMap)
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  // Classes for a given date
  function classesForDate(date: Date) {
    const dow = getDOW(date)
    return classes
      .filter(c => c.schedule_days?.includes(dow))
      .sort((a, b) => (a.schedule_time || '99').localeCompare(b.schedule_time || '99'))
  }

  // Days with classes in a given month (set of day-of-week)
  const activeDOWs = new Set(classes.flatMap(c => c.schedule_days || []))
  function dateHasClass(iso: string) {
    const d = new Date(iso)
    return activeDOWs.has(getDOW(d))
  }

  // Mini-cal cells
  const miniCells = buildMiniCal(miniMonth.getFullYear(), miniMonth.getMonth())

  // Agenda: 14 days from agendaStart
  const agendaDays = Array.from({ length: 14 }, (_, i) => addDays(agendaStart, i))

  // Week view: 7 days from weekMon
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekMon, i))

  // Classes without any schedule (no days set)
  const unscheduled = classes.filter(c => !c.schedule_days || c.schedule_days.length === 0)

  const renderCard = (cls: ClassWithJoins, date: Date, compact = false) => {
    const key = `${cls.id}_${toISO(date)}`
    const expanded = expandedKey === key
    const pal = PALETTE[colorMap[cls.id] ?? 0]
    const sport = cls.sport as { name: string } | null
    const coach = cls.coach as { first_name: string; last_name: string } | null
    const time = cls.schedule_time
      ? `${cls.schedule_time}${cls.schedule_time_end ? `–${cls.schedule_time_end}` : ''}`
      : ''
    const athleteCount = counts[cls.id] || 0

    if (compact) {
      // Week view: compact card
      return (
        <button
          onClick={() => setExpandedKey(expanded ? null : key)}
          style={{
            width: '100%', textAlign: 'left', border: `1px solid ${pal.border}`,
            borderLeft: `3px solid ${pal.border}`,
            background: pal.bg, borderRadius: '7px', padding: '6px 8px',
            cursor: 'pointer', transition: 'all 0.15s', marginBottom: '4px',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: '11px', color: 'var(--text)', lineHeight: 1.3 }}>{cls.name}</div>
          {sport && <div style={{ fontSize: '10px', color: pal.dot, fontWeight: 600 }}>{sport.name}</div>}
          {time && <div style={{ fontSize: '10px', color: 'var(--text3)', marginTop: '1px', display: 'flex', alignItems: 'center', gap: '2px' }}><Clock size={9} />{time}</div>}
          <div style={{ fontSize: '10px', color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: '2px' }}><Users size={9} />{athleteCount}</div>
        </button>
      )
    }

    return (
      <div style={{
        border: `1px solid ${pal.border}`,
        borderLeft: `4px solid ${pal.border}`,
        background: pal.bg,
        borderRadius: '10px',
        overflow: 'hidden',
        transition: 'box-shadow 0.15s',
        boxShadow: expanded ? '0 4px 16px rgba(0,0,0,0.1)' : 'none',
      }}>
        <button
          onClick={() => setExpandedKey(expanded ? null : key)}
          style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '12px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
        >
          {/* Color dot */}
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: pal.dot, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)' }}>{cls.name}</div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '2px', flexWrap: 'wrap' }}>
              {sport && <span style={{ fontSize: '12px', color: pal.dot, fontWeight: 600 }}>{sport.name}</span>}
              {time && <span style={{ fontSize: '12px', color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: '3px' }}><Clock size={11} />{time}</span>}
              <span style={{ fontSize: '12px', color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: '3px' }}><Users size={11} />{athleteCount} sporcu</span>
            </div>
          </div>
          <div style={{ color: 'var(--text3)', fontSize: '16px', transition: 'transform 0.2s', transform: expanded ? 'rotate(90deg)' : '' }}>›</div>
        </button>

        {expanded && (
          <div style={{ padding: '0 14px 14px', borderTop: `1px solid ${pal.border}`, paddingTop: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              {coach && (
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '2px' }}>Antrenör</div>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>{coach.first_name} {coach.last_name}</div>
                </div>
              )}
              {cls.age_group && (
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '2px' }}>Yaş Grubu</div>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>{cls.age_group}</div>
                </div>
              )}
              {cls.max_students && (
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '2px' }}>Kapasite</div>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>
                    {athleteCount}/{cls.max_students}
                    {athleteCount >= cls.max_students && <span style={{ color: 'var(--red)', fontSize: '11px', marginLeft: '6px' }}>Dolu</span>}
                  </div>
                </div>
              )}
              {cls.branch && (
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '2px' }}>Şube</div>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>{(cls.branch as { name: string }).name}</div>
                </div>
              )}
            </div>
            {cls.description && (
              <div style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '12px', lineHeight: 1.5 }}>{cls.description}</div>
            )}
            <div style={{ display: 'flex', gap: '8px' }}>
              <a
                href={`/attendance?date=${toISO(date)}&class=${cls.id}`}
                className="btn bp btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none', flex: 1, justifyContent: 'center' }}
              >
                <ClipboardCheck size={13} /> Yoklama Al
              </a>
              <a
                href="/classes"
                className="btn bs btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
              >
                <BookOpen size={13} /> Düzenle
              </a>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <DashboardLayout title="Takvim">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Takvim</h1>
          <p className="page-subtitle">{classes.length} aktif sınıf programlanmış</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <a href="/classes" className="btn bs btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}>
            <Plus size={14} /> Sınıf Ekle
          </a>
          {/* View toggle */}
          <div style={{ display: 'flex', background: 'var(--bg3)', borderRadius: '8px', padding: '3px', border: '1px solid var(--border)' }}>
            <button onClick={() => setView('agenda')} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, background: view === 'agenda' ? 'var(--bg2)' : 'transparent', color: view === 'agenda' ? 'var(--blue2)' : 'var(--text3)', boxShadow: view === 'agenda' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}>
              <LayoutList size={14} /> Ajanda
            </button>
            <button onClick={() => setView('week')} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, background: view === 'week' ? 'var(--bg2)' : 'transparent', color: view === 'week' ? 'var(--blue2)' : 'var(--text3)', boxShadow: view === 'week' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}>
              <Grid3X3 size={14} /> Haftalık
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '80px', textAlign: 'center' }}>
          <Loader2 size={28} style={{ margin: '0 auto', color: 'var(--text3)', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>

          {/* ── Left: Mini Calendar ── */}
          <div style={{ width: '220px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="card" style={{ padding: '14px' }}>
              {/* Month nav */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <button className="btn bs btn-xs" onClick={() => setMiniMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}>
                  <ChevronLeft size={13} />
                </button>
                <span style={{ fontWeight: 700, fontSize: '13px' }}>
                  {MONTHS[miniMonth.getMonth()]} {miniMonth.getFullYear()}
                </span>
                <button className="btn bs btn-xs" onClick={() => setMiniMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}>
                  <ChevronRight size={13} />
                </button>
              </div>

              {/* Day headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '1px', marginBottom: '4px' }}>
                {DAY_SHORT.map(d => (
                  <div key={d} style={{ textAlign: 'center', fontSize: '10px', fontWeight: 700, color: 'var(--text3)', padding: '2px 0' }}>{d}</div>
                ))}
              </div>

              {/* Cells */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '1px' }}>
                {miniCells.map((cell, i) => {
                  const isToday = cell.iso === today
                  const hasClass = cell.cur && dateHasClass(cell.iso)
                  const isSelected = view === 'agenda'
                    ? cell.iso >= toISO(agendaStart) && cell.iso <= toISO(addDays(agendaStart, 13))
                    : cell.iso >= toISO(weekMon) && cell.iso <= toISO(addDays(weekMon, 6))

                  return (
                    <button
                      key={i}
                      onClick={() => {
                        if (!cell.cur) return
                        if (view === 'agenda') setAgendaStart(new Date(cell.iso))
                        else setWeekMon(getMondayOf(new Date(cell.iso)))
                        setMiniMonth(new Date(cell.iso))
                      }}
                      style={{
                        width: '100%', aspectRatio: '1', border: 'none', cursor: cell.cur ? 'pointer' : 'default',
                        borderRadius: '50%', fontSize: '11px', fontWeight: isToday || isSelected ? 700 : 400,
                        background: isToday ? 'var(--grad)' : isSelected ? 'rgba(45,92,179,0.12)' : 'transparent',
                        color: isToday ? '#fff' : cell.cur ? 'var(--text)' : 'var(--text3)',
                        opacity: cell.cur ? 1 : 0.35,
                        position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.1s',
                      }}
                    >
                      {cell.d}
                      {hasClass && !isToday && (
                        <span style={{ position: 'absolute', bottom: '2px', left: '50%', transform: 'translateX(-50%)', width: '4px', height: '4px', borderRadius: '50%', background: 'var(--blue2)' }} />
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Jump to today */}
              <button
                className="btn bs btn-sm"
                style={{ width: '100%', marginTop: '10px', fontSize: '12px' }}
                onClick={() => {
                  const now = new Date()
                  setAgendaStart(now)
                  setWeekMon(getMondayOf(now))
                  setMiniMonth(now)
                }}
              >
                Bugüne Git
              </button>
            </div>

            {/* Legend */}
            {classes.length > 0 && (
              <div className="card" style={{ padding: '12px 14px' }}>
                <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text2)', marginBottom: '10px' }}>Sınıflar</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {classes.map(cls => {
                    const pal = PALETTE[colorMap[cls.id] ?? 0]
                    const sport = cls.sport as { name: string } | null
                    return (
                      <div key={cls.id} style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: pal.dot, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '12px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cls.name}</div>
                          {sport && <div style={{ fontSize: '10px', color: 'var(--text3)' }}>{sport.name}</div>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Unscheduled warning */}
            {unscheduled.length > 0 && (
              <div style={{ padding: '10px 12px', background: 'rgba(216,163,18,0.1)', border: '1px solid rgba(216,163,18,0.3)', borderRadius: '10px', fontSize: '12px' }}>
                <div style={{ fontWeight: 700, color: 'var(--yellow)', marginBottom: '6px' }}>⚠️ Program girilmemiş</div>
                {unscheduled.map(c => (
                  <div key={c.id} style={{ color: 'var(--text2)', marginTop: '3px' }}>• {c.name}</div>
                ))}
                <a href="/classes" style={{ display: 'block', marginTop: '8px', color: 'var(--blue2)', fontSize: '11px', textDecoration: 'none' }}>Sınıfları düzenle →</a>
              </div>
            )}
          </div>

          {/* ── Right: Main View ── */}
          <div style={{ flex: 1, minWidth: 0 }}>

            {/* ── AGENDA VIEW ── */}
            {view === 'agenda' && (
              <div>
                {/* Nav */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                  <button className="btn bs btn-sm" onClick={() => setAgendaStart(d => addDays(d, -7))}><ChevronLeft size={15} /> Önceki</button>
                  <button className="btn bs btn-sm" onClick={() => setAgendaStart(d => addDays(d, 7))}>Sonraki <ChevronRight size={15} /></button>
                  <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text)' }}>
                    {agendaStart.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
                    {' – '}
                    {addDays(agendaStart, 13).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>

                {/* Day sections */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {agendaDays.map(date => {
                    const iso = toISO(date)
                    const isToday = iso === today
                    const isPast = iso < today
                    const dayClasses = classesForDate(date)
                    const dow = getDOW(date)

                    return (
                      <div key={iso} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', opacity: isPast && !isToday ? 0.65 : 1 }}>
                        {/* Date column */}
                        <div style={{
                          width: '68px', flexShrink: 0, paddingTop: '10px',
                          textAlign: 'center',
                        }}>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: isToday ? 'var(--blue2)' : 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {DAY_SHORT[dow]}
                          </div>
                          <div style={{
                            fontSize: '26px', fontWeight: 800, lineHeight: 1,
                            color: isToday ? '#fff' : isPast ? 'var(--text3)' : 'var(--text)',
                            background: isToday ? 'var(--grad)' : 'transparent',
                            borderRadius: '10px', padding: isToday ? '4px 8px' : '4px 0',
                            display: 'inline-block', minWidth: '44px',
                          }}>
                            {date.getDate()}
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text3)', marginTop: '1px' }}>
                            {MONTHS[date.getMonth()].slice(0, 3)}
                          </div>
                        </div>

                        {/* Classes column */}
                        <div style={{ flex: 1, paddingTop: '8px', paddingBottom: '4px', borderTop: `1px solid ${isToday ? 'var(--blue2)' : 'var(--border)'}` }}>
                          {dayClasses.length === 0 ? (
                            <div style={{ padding: '10px 0', fontSize: '13px', color: 'var(--text3)', fontStyle: 'italic' }}>
                              Antrenman yok
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {dayClasses.map(cls => (
                                <div key={cls.id}>{renderCard(cls, date)}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── WEEK VIEW ── */}
            {view === 'week' && (
              <div>
                {/* Nav */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                  <button className="btn bs btn-sm" onClick={() => setWeekMon(d => addDays(d, -7))}><ChevronLeft size={15} /></button>
                  <button className="btn bs btn-sm" onClick={() => { const m = getMondayOf(new Date()); setWeekMon(m); setMiniMonth(m) }}>Bu Hafta</button>
                  <button className="btn bs btn-sm" onClick={() => setWeekMon(d => addDays(d, 7))}><ChevronRight size={15} /></button>
                  <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text)' }}>
                    {weekMon.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
                    {' – '}
                    {addDays(weekMon, 6).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>

                {/* Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
                  {weekDays.map((date, i) => {
                    const iso = toISO(date)
                    const isToday = iso === today
                    const dayClasses = classesForDate(date)

                    return (
                      <div key={i} style={{
                        background: isToday ? 'rgba(45,92,179,0.05)' : 'var(--bg2)',
                        border: `1px solid ${isToday ? 'var(--blue2)' : 'var(--border)'}`,
                        borderRadius: '10px', padding: '10px 8px', minHeight: '120px',
                      }}>
                        {/* Day header */}
                        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                          <div style={{ fontSize: '10px', fontWeight: 700, color: isToday ? 'var(--blue2)' : 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {DAY_SHORT[i]}
                          </div>
                          <div style={{
                            fontSize: '20px', fontWeight: 800,
                            color: isToday ? '#fff' : 'var(--text)',
                            background: isToday ? 'var(--grad)' : 'transparent',
                            borderRadius: '8px', padding: isToday ? '2px 6px' : '2px 0',
                            display: 'inline-block', minWidth: '32px', textAlign: 'center',
                          }}>
                            {date.getDate()}
                          </div>
                        </div>

                        {/* Class cards */}
                        {dayClasses.length === 0 ? (
                          <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text3)', opacity: 0.4, marginTop: '8px' }}>—</div>
                        ) : (
                          dayClasses.map(cls => (
                            <div key={cls.id}>{renderCard(cls, date, true)}</div>
                          ))
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Expanded class detail below grid */}
                {expandedKey && (() => {
                  const [clsId, dateISO] = expandedKey.split('_')
                  const cls = classes.find(c => c.id === clsId)
                  if (!cls) return null
                  const date = new Date(dateISO)
                  const pal = PALETTE[colorMap[cls.id] ?? 0]
                  const sport = cls.sport as { name: string } | null
                  const coach = cls.coach as { first_name: string; last_name: string } | null
                  return (
                    <div className="card" style={{ marginTop: '12px', border: `2px solid ${pal.border}` }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: pal.dot }} />
                            <div style={{ fontWeight: 700, fontSize: '16px' }}>{cls.name}</div>
                            {sport && <span className="badge" style={{ background: pal.bg, color: pal.dot, border: `1px solid ${pal.border}`, fontSize: '11px' }}>{sport.name}</span>}
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '12px' }}>
                            {coach && <div><div style={{ fontSize: '11px', color: 'var(--text3)' }}>Antrenör</div><div style={{ fontWeight: 600, fontSize: '13px' }}>{coach.first_name} {coach.last_name}</div></div>}
                            {cls.age_group && <div><div style={{ fontSize: '11px', color: 'var(--text3)' }}>Yaş Grubu</div><div style={{ fontWeight: 600, fontSize: '13px' }}>{cls.age_group}</div></div>}
                            <div><div style={{ fontSize: '11px', color: 'var(--text3)' }}>Sporcu</div><div style={{ fontWeight: 600, fontSize: '13px' }}>{counts[cls.id] || 0}{cls.max_students ? `/${cls.max_students}` : ''}</div></div>
                            {cls.schedule_time && <div><div style={{ fontSize: '11px', color: 'var(--text3)' }}>Saat</div><div style={{ fontWeight: 600, fontSize: '13px' }}>{cls.schedule_time}{cls.schedule_time_end ? `–${cls.schedule_time_end}` : ''}</div></div>}
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <a href={`/attendance?date=${dateISO}&class=${cls.id}`} className="btn bp btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}>
                              <ClipboardCheck size={13} /> Yoklama Al — {date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                            </a>
                            <a href="/classes" className="btn bs btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}>
                              <BookOpen size={13} /> Sınıfı Düzenle
                            </a>
                          </div>
                        </div>
                        <button onClick={() => setExpandedKey(null)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: '4px' }}>
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
