'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import type { Class } from '@/types'
import type { Calendar } from '@fullcalendar/core'

const CLASS_COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#f97316', '#22c55e', '#ec4899', '#f59e0b']
const TR_DAYS = ['pazar', 'pazartesi', 'sali', 'carsamba', 'persembe', 'cuma', 'cumartesi']

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function timeLabel(cls: Class): string {
  const s = cls.schedule_time || ''
  const e = cls.schedule_time_end || ''
  if (s && e) return `${s}-${e}`
  return s
}

export default function CalendarPage() {
  const router = useRouter()
  const supabase = createClient()
  const calRef = useRef<HTMLDivElement>(null)
  const calInstanceRef = useRef<Calendar | null>(null)
  const [loading, setLoading] = useState(true)

  const buildAndRender = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const orgId = user?.user_metadata?.organization_id
    if (!orgId) return

    setLoading(true)

    // Fetch range: 2 months back → 3 months forward
    const now = new Date()
    const rangeStart = new Date(now)
    rangeStart.setMonth(rangeStart.getMonth() - 2)
    const rangeEnd = new Date(now)
    rangeEnd.setMonth(rangeEnd.getMonth() + 3)

    const [{ data: classes }, { data: athletes }, { data: attendance }] = await Promise.all([
      supabase.from('classes').select('id, name, schedule_days, schedule_time, schedule_time_end')
        .eq('organization_id', orgId).eq('is_active', true),
      supabase.from('athletes').select('id, class_id').eq('organization_id', orgId).eq('status', 'active'),
      supabase.from('attendance').select('athlete_id, date, status, class_id')
        .eq('organization_id', orgId)
        .gte('date', toISO(rangeStart))
        .lte('date', toISO(rangeEnd)),
    ])

    setLoading(false)

    if (!calRef.current) return

    // Athlete counts per class
    const athletesByClass: Record<string, string[]> = {}
    ;(athletes || []).forEach(a => {
      if (a.class_id) {
        if (!athletesByClass[a.class_id]) athletesByClass[a.class_id] = []
        athletesByClass[a.class_id].push(a.id)
      }
    })

    // Attendance by date+class
    type AttKey = string // `${date}__${classId}`
    const attMap: Record<AttKey, { present: number; total: number }> = {}
    ;(attendance || []).forEach(a => {
      const key = `${a.date}__${a.class_id}`
      if (!attMap[key]) attMap[key] = { present: 0, total: 0 }
      attMap[key].total++
      if (a.status === 'present') attMap[key].present++
    })

    // Generate events
    const events: object[] = []
    ;(classes || []).forEach((cls, ci) => {
      const scheduleDays: number[] = cls.schedule_days || []
      if (!scheduleDays.length) return

      const color = CLASS_COLORS[ci % CLASS_COLORS.length]
      const ts = timeLabel(cls as Class)

      const cur = new Date(rangeStart)
      while (cur <= rangeEnd) {
        const dayIdx = cur.getDay() // 0=Sun
        if (scheduleDays.includes(dayIdx)) {
          const ds = toISO(cur)
          const key = `${ds}__${cls.id}`
          const att = attMap[key]
          const clsAthletes = athletesByClass[cls.id] || []
          const total = clsAthletes.length
          const isPast = ds < toISO(new Date())

          let bgColor: string
          let title: string

          if (att && att.total > 0) {
            const pct = total > 0 ? att.present / total : att.present / att.total
            bgColor = pct >= 0.8 ? '#22c55e' : pct >= 0.5 ? '#eab308' : '#ef4444'
            title = `${cls.name}${ts ? ' ' + ts : ''} ✓${att.present}/${total}`
          } else if (isPast) {
            bgColor = 'rgba(148,163,184,0.4)'
            title = `${cls.name}${ts ? ' ' + ts : ''}`
          } else {
            bgColor = color
            title = `${cls.name}${ts ? ' ' + ts : ''}${total ? ` (${total})` : ''}`
          }

          events.push({
            title,
            start: ds,
            backgroundColor: bgColor,
            borderColor: bgColor,
            textColor: '#fff',
            extendedProps: { clsId: cls.id },
          })
        }
        cur.setDate(cur.getDate() + 1)
      }
    })

    // Destroy old instance
    if (calInstanceRef.current) {
      calInstanceRef.current.destroy()
      calInstanceRef.current = null
    }

    // Dynamically import FullCalendar to avoid SSR issues
    const { Calendar } = await import('@fullcalendar/core')
    const dayGridPlugin = (await import('@fullcalendar/daygrid')).default
    const interactionPlugin = (await import('@fullcalendar/interaction')).default

    const cal = new Calendar(calRef.current!, {
      plugins: [dayGridPlugin, interactionPlugin],
      initialView: 'dayGridMonth',
      locale: 'tr',
      firstDay: 1,
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: '',
      },
      buttonText: { today: 'Bugün' },
      events,
      eventClick: (info) => {
        const clsId = info.event.extendedProps.clsId
        router.push(`/attendance?date=${info.event.startStr}&class=${clsId}`)
      },
      height: 'auto',
      eventDisplay: 'block',
    })

    cal.render()
    calInstanceRef.current = cal
  }, [supabase, router])

  useEffect(() => {
    buildAndRender()
    return () => { calInstanceRef.current?.destroy() }
  }, [buildAndRender])

  return (
    <DashboardLayout title="Takvim">
      <div className="page-header">
        <div>
          <h1 className="page-title">Takvim</h1>
          <p className="page-subtitle">Aylık antrenman programı ve devam durumu</p>
        </div>
        <a href="/classes" style={{ textDecoration: 'none' }} className="btn bd btn-sm">
          Sınıfları Yönet
        </a>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap', fontSize: '12px', color: 'var(--text2)' }}>
        {[
          { color: '#22c55e', label: '≥%80 devam' },
          { color: '#eab308', label: '%50-80 devam' },
          { color: '#ef4444', label: '<%50 devam' },
          { color: 'rgba(148,163,184,0.6)', label: 'Devam girilmemiş' },
          { color: '#3b82f6', label: 'Gelecek' },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: item.color, display: 'inline-block' }} />
            {item.label}
          </div>
        ))}
      </div>

      {loading && (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text3)' }}>Yükleniyor...</div>
      )}

      <div ref={calRef} style={{ display: loading ? 'none' : 'block' }} />

      <p style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text3)', textAlign: 'center' }}>
        Bir etkinliğe tıklayarak o gün için yoklama sayfasına geçebilirsiniz.
      </p>

      <style>{`
        .fc { font-family: inherit; color: var(--text); }
        .fc-theme-standard td, .fc-theme-standard th { border-color: var(--border); }
        .fc-theme-standard .fc-scrollgrid { border-color: var(--border); }
        .fc-col-header-cell { background: var(--bg3); }
        .fc-daygrid-day { background: var(--bg2); }
        .fc-daygrid-day:hover { background: var(--bg3); }
        .fc-day-today { background: rgba(45,92,179,0.08) !important; }
        .fc-button-primary { background: var(--blue2) !important; border-color: var(--blue2) !important; }
        .fc-button-primary:hover { background: var(--blue) !important; }
        .fc-button-primary:not(:disabled).fc-button-active { background: var(--blue) !important; }
        .fc-toolbar-title { font-size: 16px !important; font-weight: 700; color: var(--text); }
        .fc-event { cursor: pointer; font-size: 11px; border-radius: 4px; padding: 1px 4px; }
        .fc-daygrid-day-number { color: var(--text2); }
        .fc-day-today .fc-daygrid-day-number { color: var(--blue2); font-weight: 700; }
      `}</style>
    </DashboardLayout>
  )
}
