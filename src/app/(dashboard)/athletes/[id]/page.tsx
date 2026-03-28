'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { formatDate, formatCurrency, calculateAge, getInitials } from '@/lib/utils/formatters'
import { ArrowLeft, Phone, Mail, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Athlete, Payment } from '@/types'

const STATUS_LABEL: Record<string, string> = { active: 'Aktif', inactive: 'Pasif', pending: 'Beklemede' }
const STATUS_BADGE: Record<string, string> = { active: 'badge-green', inactive: 'badge-gray', pending: 'badge-yellow' }
const PAYMENT_BADGE: Record<string, string> = { completed: 'badge-green', pending: 'badge-yellow', overdue: 'badge-red', cancelled: 'badge-gray' }
const PAYMENT_LABEL: Record<string, string> = { completed: 'Ödendi', pending: 'Bekliyor', overdue: 'Gecikmiş', cancelled: 'İptal' }
const ATT_COLOR: Record<string, string> = { present: 'var(--green)', absent: 'var(--red)', excused: 'var(--yellow)' }
const ATT_BG: Record<string, string> = { present: 'rgba(34,197,94,0.18)', absent: 'rgba(239,68,68,0.18)', excused: 'rgba(216,163,18,0.18)' }
const ATT_LABEL: Record<string, string> = { present: 'Var', absent: 'Yok', excused: 'İzinli' }

const DAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

type AttRecord = { id: string; date: string; status: string }
type AthleteWithJoins = Athlete & { sports?: { name: string; icon?: string } | null; classes?: { name: string } | null }

export default function AthleteDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [athlete, setAthlete] = useState<AthleteWithJoins | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [attendance, setAttendance] = useState<AttRecord[]>([])

  useEffect(() => {
    if (!id) return
    const load = async () => {
      const [{ data: a }, { data: p }, { data: att }] = await Promise.all([
        supabase.from('athletes').select('*, sports(name, icon), classes(name, schedule), branches(name)').eq('id', id).single(),
        supabase.from('payments').select('*').eq('athlete_id', id).order('created_at', { ascending: false }).limit(10),
        supabase.from('attendance').select('id, date, status').eq('athlete_id', id).order('date', { ascending: false }).limit(56),
      ])
      if (!a) { router.push('/athletes'); return }
      setAthlete(a as AthleteWithJoins)
      setPayments(p || [])
      setAttendance(att || [])
      setLoading(false)
    }
    load()
  }, [id, supabase, router])

  if (loading) {
    return (
      <DashboardLayout title="Sporcu Detayı">
        <div style={{ padding: '80px', textAlign: 'center' }}>
          <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', margin: '0 auto', color: 'var(--text3)' }} />
        </div>
      </DashboardLayout>
    )
  }

  if (!athlete) return null

  const attendanceRate = attendance.length
    ? Math.round((attendance.filter(a => a.status === 'present').length / attendance.length) * 100)
    : 0

  const totalDebt = payments.filter(p => p.status === 'overdue' || p.status === 'pending')
    .reduce((sum, p) => sum + (p.amount || 0), 0)

  const presentCount = attendance.filter(a => a.status === 'present').length
  const absentCount = attendance.filter(a => a.status === 'absent').length
  const excusedCount = attendance.filter(a => a.status === 'excused').length

  // Build calendar grid — last 28 records in chronological order
  const calendarItems = [...attendance].slice(0, 28).reverse()
  const firstDay = calendarItems.length > 0 ? new Date(calendarItems[0].date).getDay() : 0
  const padStart = firstDay === 0 ? 6 : firstDay - 1
  const padItems: (null | AttRecord)[] = [...Array(padStart).fill(null), ...calendarItems]

  return (
    <DashboardLayout title="Sporcu Detayı">
      <div style={{ marginBottom: '16px' }}>
        <Link href="/athletes" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text2)', textDecoration: 'none', fontSize: '14px' }}>
          <ArrowLeft size={16} /> Sporcular
        </Link>
      </div>

      {/* Profile Header */}
      <div className="profile-header">
        <div className="profile-avatar">{getInitials(athlete.first_name, athlete.last_name)}</div>
        <div style={{ flex: 1 }}>
          <div className="profile-name">{athlete.first_name} {athlete.last_name}</div>
          <div className="profile-meta">
            <span className={`badge ${STATUS_BADGE[athlete.status] || 'badge-gray'}`}>{STATUS_LABEL[athlete.status] || athlete.status}</span>
            {athlete.sports?.name && <span>{athlete.sports.icon || '🏅'} {athlete.sports.name}</span>}
            {athlete.birth_date && <span>📅 {calculateAge(athlete.birth_date)} yaş</span>}
            {athlete.phone && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={12} /> {athlete.phone}</span>}
            {athlete.email && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Mail size={12} /> {athlete.email}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          {[
            { label: 'Devam Oranı', value: `%${attendanceRate}`, color: attendanceRate > 70 ? 'var(--green)' : 'var(--red)' },
            { label: 'Toplam Borç', value: formatCurrency(totalDebt), color: totalDebt > 0 ? 'var(--red)' : 'var(--green)' },
            { label: 'Aylık Ücret', value: formatCurrency(athlete.monthly_fee || 0), color: 'var(--text)' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center', padding: '12px 20px', background: 'var(--bg3)', borderRadius: '12px', minWidth: '100px' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid-2">
        {/* Info Card */}
        <div className="card">
          <h3 className="m-tit" style={{ marginBottom: '16px' }}>Kişisel Bilgiler</h3>
          <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {[
              { label: 'TC Kimlik', value: athlete.tc },
              { label: 'Doğum Tarihi', value: formatDate(athlete.birth_date) },
              { label: 'Cinsiyet', value: athlete.gender === 'male' ? 'Erkek' : athlete.gender === 'female' ? 'Kadın' : '-' },
              { label: 'Kan Grubu', value: athlete.blood_type || '-' },
              { label: 'Boy', value: athlete.height ? `${athlete.height} cm` : '-' },
              { label: 'Kilo', value: athlete.weight ? `${athlete.weight} kg` : '-' },
              { label: 'Okul', value: athlete.school || '-' },
              { label: 'Şehir', value: athlete.city || '-' },
              { label: 'Sınıf', value: athlete.classes?.name || '-' },
              { label: 'Lisans No', value: athlete.license_number || '-' },
              { label: 'Kayıt Tarihi', value: formatDate(athlete.registration_date) },
              { label: 'Kategori', value: athlete.category || '-' },
            ].map(item => (
              <div key={item.label}>
                <dt style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '2px' }}>{item.label}</dt>
                <dd style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Veli Bilgileri */}
          {athlete.parent_name && (
            <div className="card">
              <h3 className="m-tit" style={{ marginBottom: '12px' }}>Veli Bilgileri</h3>
              <dl style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { label: 'Ad', value: athlete.parent_name },
                  { label: 'Telefon', value: athlete.parent_phone || '-' },
                  { label: 'E-posta', value: athlete.parent_email || '-' },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <dt style={{ fontSize: '13px', color: 'var(--text3)' }}>{item.label}</dt>
                    <dd style={{ fontSize: '13px', fontWeight: 500 }}>{item.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {/* Son Ödemeler */}
          <div className="card">
            <h3 className="m-tit" style={{ marginBottom: '12px' }}>Son Ödemeler</h3>
            {payments.length ? payments.slice(0, 4).map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>{p.description || p.category || 'Aidat'}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text3)' }}>{formatDate(p.due_date)}</div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span className={`badge ${PAYMENT_BADGE[p.status]}`}>{PAYMENT_LABEL[p.status]}</span>
                  <span style={{ fontWeight: 700, fontSize: '14px' }}>{formatCurrency(p.amount)}</span>
                </div>
              </div>
            )) : <div className="text-faint ts">Ödeme kaydı yok</div>}
          </div>
        </div>
      </div>

      {/* Devam Takvimi */}
      <div className="card" style={{ marginTop: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 className="m-tit">Devam Durumu</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span className="badge badge-green">{presentCount} Var</span>
            <span className="badge badge-red">{absentCount} Yok</span>
            <span className="badge badge-yellow">{excusedCount} İzinli</span>
          </div>
        </div>

        {attendance.length === 0 ? (
          <div className="text-faint ts" style={{ textAlign: 'center', padding: '16px' }}>Yoklama kaydı yok</div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', marginBottom: '4px' }}>
              {DAYS.map(d => (
                <div key={d} style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text3)', fontWeight: 600, padding: '4px 0' }}>{d}</div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
              {padItems.map((item, i) => (
                item === null ? (
                  <div key={`pad-${i}`} />
                ) : (
                  <div
                    key={item.id}
                    title={`${item.date} — ${ATT_LABEL[item.status] || item.status}`}
                    style={{
                      textAlign: 'center',
                      padding: '10px 4px',
                      borderRadius: '8px',
                      background: ATT_BG[item.status] || 'var(--bg3)',
                      border: `1px solid ${ATT_COLOR[item.status] || 'var(--border)'}`,
                      fontSize: '13px',
                      fontWeight: 600,
                      color: ATT_COLOR[item.status] || 'var(--text2)',
                    }}>
                    {new Date(item.date).getDate()}
                  </div>
                )
              ))}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '10px', textAlign: 'center' }}>
              Son {attendance.length} yoklama kaydı gösteriliyor
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
