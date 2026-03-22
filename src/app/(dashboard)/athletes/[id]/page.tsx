import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { formatDate, formatCurrency, calculateAge, getInitials } from '@/lib/utils/formatters'
import { ArrowLeft, Phone, Mail, Calendar, CreditCard, MapPin } from 'lucide-react'
import Link from 'next/link'

export default async function AthleteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: athlete } = await supabase
    .from('athletes')
    .select('*, sports(name, icon), classes(name, schedule), branches(name)')
    .eq('id', id)
    .single()

  if (!athlete) notFound()

  const [{ data: payments }, { data: attendance }] = await Promise.all([
    supabase.from('payments').select('*').eq('athlete_id', id).order('created_at', { ascending: false }).limit(10),
    supabase.from('attendance').select('*').eq('athlete_id', id).order('date', { ascending: false }).limit(30),
  ])

  const attendanceRate = attendance?.length
    ? Math.round((attendance.filter(a => a.status === 'present').length / attendance.length) * 100)
    : 0

  const totalDebt = payments?.filter(p => p.status === 'overdue' || p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0) || 0

  const STATUS_LABEL: Record<string, string> = { active: 'Aktif', inactive: 'Pasif', pending: 'Beklemede' }
  const STATUS_BADGE: Record<string, string> = { active: 'badge-green', inactive: 'badge-gray', pending: 'badge-yellow' }
  const PAYMENT_BADGE: Record<string, string> = { completed: 'badge-green', pending: 'badge-yellow', overdue: 'badge-red', cancelled: 'badge-gray' }
  const PAYMENT_LABEL: Record<string, string> = { completed: 'Ödendi', pending: 'Bekliyor', overdue: 'Gecikmiş', cancelled: 'İptal' }
  const ATT_BADGE: Record<string, string> = { present: 'badge-green', absent: 'badge-red', excused: 'badge-yellow' }
  const ATT_LABEL: Record<string, string> = { present: 'Geldi', absent: 'Gelmedi', excused: 'İzinli' }

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
            <span className={`badge ${STATUS_BADGE[athlete.status]}`}>{STATUS_LABEL[athlete.status]}</span>
            {athlete.sports?.name && <span>{athlete.sports.icon || '🏅'} {athlete.sports.name}</span>}
            {athlete.birth_date && <span>📅 {calculateAge(athlete.birth_date)} yaş</span>}
            {athlete.phone && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={12} /> {athlete.phone}</span>}
            {athlete.email && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Mail size={12} /> {athlete.email}</span>}
          </div>
        </div>
        {/* Quick Stats */}
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
              { label: 'Sınıf', value: (athlete.classes as { name: string } | null)?.name || '-' },
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
            {payments?.length ? payments.slice(0, 4).map(p => (
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

      {/* Attendance */}
      <div className="card" style={{ marginTop: '16px' }}>
        <h3 className="m-tit" style={{ marginBottom: '16px' }}>Son Yoklamalar</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {attendance?.map(a => (
            <div key={a.id} title={`${a.date} - ${ATT_LABEL[a.status]}`}
              style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600 }}
              className={`badge ${ATT_BADGE[a.status]}`}>
              {formatDate(a.date)}
            </div>
          ))}
          {!attendance?.length && <div className="text-faint ts">Yoklama kaydı yok</div>}
        </div>
      </div>
    </DashboardLayout>
  )
}
