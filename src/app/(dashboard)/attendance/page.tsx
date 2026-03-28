'use client'
import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { Check, X, Minus, Save, Loader2, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getInitials } from '@/lib/utils/formatters'
import { toast } from 'sonner'
import type { Athlete, Class, Attendance } from '@/types'

type AttStatus = 'present' | 'absent' | 'excused'

function AttendanceContent() {
  const searchParams = useSearchParams()
  const supabase = createClient()
  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(() => searchParams.get('date') || today)
  const [classFilter, setClassFilter] = useState(() => searchParams.get('class') || '')
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [statusMap, setStatusMap] = useState<Record<string, AttStatus>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const orgId = user?.user_metadata?.organization_id
    setLoading(true)

    const [{ data: a }, { data: c }, { data: att }] = await Promise.all([
      supabase.from('athletes').select('*').eq('organization_id', orgId).eq('status', 'active').order('first_name'),
      supabase.from('classes').select('*').eq('organization_id', orgId).eq('is_active', true),
      supabase.from('attendance').select('*').eq('organization_id', orgId).eq('date', date),
    ])

    setAthletes(a || [])
    setClasses(c || [])

    const map: Record<string, AttStatus> = {}
    att?.forEach((record: Attendance) => { map[record.athlete_id] = record.status })
    ;(a || []).forEach((athlete: Athlete) => { if (!map[athlete.id]) map[athlete.id] = 'present' })
    setStatusMap(map)
    setLoading(false)
  }, [supabase, date])

  useEffect(() => { fetchData() }, [fetchData])

  const filteredAthletes = classFilter
    ? athletes.filter(a => a.class_id === classFilter)
    : athletes

  const setStatus = (athleteId: string, status: AttStatus) => {
    setStatusMap(prev => ({ ...prev, [athleteId]: status }))
  }

  const markAll = (status: AttStatus) => {
    const map: Record<string, AttStatus> = {}
    filteredAthletes.forEach(a => { map[a.id] = status })
    setStatusMap(prev => ({ ...prev, ...map }))
  }

  const handleSave = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const orgId = user?.user_metadata?.organization_id

    const records = filteredAthletes.map(a => ({
      organization_id: orgId,
      athlete_id: a.id,
      date,
      status: statusMap[a.id] || 'present',
      recorded_by: user?.id,
    }))

    const { error } = await supabase.from('attendance').upsert(records, { onConflict: 'athlete_id,date' })
    setSaving(false)
    if (error) { toast.error('Hata: ' + error.message); return }
    toast.success(`${records.length} sporcu için yoklama kaydedildi`)
    fetchData()
  }

  const handleExportCSV = () => {
    const className = classFilter ? classes.find(c => c.id === classFilter)?.name || '' : 'Tüm Sınıflar'
    const rows = [['Ad', 'Soyad', 'TC', 'Sınıf', 'Durum', 'Tarih']]
    filteredAthletes.forEach(a => {
      const status = statusMap[a.id] || 'present'
      const statusLabel = status === 'present' ? 'Geldi' : status === 'absent' ? 'Gelmedi' : 'İzinli'
      const cls = classes.find(c => c.id === a.class_id)
      rows.push([a.first_name, a.last_name, a.tc, cls?.name || '-', statusLabel, date])
    })
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Yoklama_${date}_${className}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('CSV indirildi')
  }

  const changeDate = (delta: number) => {
    const d = new Date(date)
    d.setDate(d.getDate() + delta)
    setDate(d.toISOString().slice(0, 10))
  }

  const presentCount = filteredAthletes.filter(a => statusMap[a.id] === 'present').length
  const absentCount = filteredAthletes.filter(a => statusMap[a.id] === 'absent').length
  const excusedCount = filteredAthletes.filter(a => statusMap[a.id] === 'excused').length

  return (
    <DashboardLayout title="Yoklama">
      <div className="page-header">
        <div>
          <h1 className="page-title">Yoklama</h1>
          <p className="page-subtitle">Günlük devam takibi</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn bd btn-sm" onClick={handleExportCSV} disabled={loading || filteredAthletes.length === 0} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Download size={14} /> CSV
          </button>
          <button className="btn bp" onClick={handleSave} disabled={saving || loading}>
            {saving ? <Loader2 size={16} /> : <Save size={16} />}
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button className="btn bs btn-sm" onClick={() => changeDate(-1)}><ChevronLeft size={14} /></button>
            <input type="date" className="form-input" style={{ width: 'auto', minHeight: '36px', padding: '0 10px', fontSize: '14px' }}
              value={date} onChange={e => setDate(e.target.value)} max={today} />
            <button className="btn bs btn-sm" onClick={() => changeDate(1)} disabled={date >= today}><ChevronRight size={14} /></button>
          </div>

          <select className="form-select" style={{ width: 'auto', minHeight: '36px', padding: '0 12px' }}
            value={classFilter} onChange={e => setClassFilter(e.target.value)}>
            <option value="">Tüm Sınıflar</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
            <button className="btn bsu btn-sm" onClick={() => markAll('present')}><Check size={12} /> Tümü Geldi</button>
            <button className="btn bd btn-sm" onClick={() => markAll('absent')}><X size={12} /> Tümü Gelmedi</button>
          </div>
        </div>

        {/* Summary */}
        <div style={{ display: 'flex', gap: '16px', marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
          {[
            { label: 'Geldi', count: presentCount, color: 'var(--green)', bg: 'rgba(34,197,94,0.12)' },
            { label: 'Gelmedi', count: absentCount, color: 'var(--red)', bg: 'rgba(239,68,68,0.12)' },
            { label: 'İzinli', count: excusedCount, color: 'var(--yellow)', bg: 'rgba(216,163,18,0.12)' },
            { label: 'Toplam', count: filteredAthletes.length, color: 'var(--text)', bg: 'var(--bg3)' },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', background: s.bg, borderRadius: '8px' }}>
              <span style={{ fontSize: '20px', fontWeight: 700, color: s.color }}>{s.count}</span>
              <span style={{ fontSize: '13px', color: 'var(--text2)' }}>{s.label}</span>
            </div>
          ))}
          {filteredAthletes.length > 0 && (
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', fontSize: '14px', color: 'var(--text2)' }}>
              Katılım: <strong style={{ color: 'var(--green)', marginLeft: '6px' }}>
                %{Math.round((presentCount / filteredAthletes.length) * 100)}
              </strong>
            </div>
          )}
        </div>
      </div>

      {/* Athlete List */}
      {loading ? (
        <div style={{ padding: '48px', textAlign: 'center' }}><Loader2 size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto', color: 'var(--text3)' }} /></div>
      ) : filteredAthletes.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon">📋</div><div className="empty-state-title">Sporcu bulunamadı</div></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {filteredAthletes.map(a => {
            const status = statusMap[a.id] || 'present'
            return (
              <div key={a.id} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 16px', background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: '10px', transition: 'all 0.2s',
                borderLeft: `4px solid ${status === 'present' ? 'var(--green)' : status === 'absent' ? 'var(--red)' : 'var(--yellow)'}`,
              }}>
                <div className="avatar avatar-sm">{getInitials(a.first_name, a.last_name)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>{a.first_name} {a.last_name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text3)' }}>{a.phone || ''}</div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => setStatus(a.id, 'present')} className="btn btn-sm"
                    style={{ background: status === 'present' ? 'var(--green)' : 'var(--bg3)', color: status === 'present' ? '#fff' : 'var(--text2)', border: `1px solid ${status === 'present' ? 'var(--green)' : 'var(--border)'}`, minWidth: '80px' }}>
                    <Check size={13} /> Geldi</button>
                  <button onClick={() => setStatus(a.id, 'absent')} className="btn btn-sm"
                    style={{ background: status === 'absent' ? 'var(--red)' : 'var(--bg3)', color: status === 'absent' ? '#fff' : 'var(--text2)', border: `1px solid ${status === 'absent' ? 'var(--red)' : 'var(--border)'}`, minWidth: '90px' }}>
                    <X size={13} /> Gelmedi</button>
                  <button onClick={() => setStatus(a.id, 'excused')} className="btn btn-sm"
                    style={{ background: status === 'excused' ? 'var(--yellow)' : 'var(--bg3)', color: status === 'excused' ? '#fff' : 'var(--text2)', border: `1px solid ${status === 'excused' ? 'var(--yellow)' : 'var(--border)'}`, minWidth: '76px' }}>
                    <Minus size={13} /> İzinli</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </DashboardLayout>
  )
}

export default function AttendancePage() {
  return (
    <Suspense fallback={<DashboardLayout title="Yoklama"><div style={{ padding: '48px', textAlign: 'center', color: 'var(--text3)' }}>Yükleniyor...</div></DashboardLayout>}>
      <AttendanceContent />
    </Suspense>
  )
}
