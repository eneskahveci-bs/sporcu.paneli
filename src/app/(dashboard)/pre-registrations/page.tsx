'use client'

import { useState, useEffect, useCallback } from 'react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatPhone } from '@/lib/utils/formatters'
import { UserPlus, CheckCircle, XCircle, Clock, Eye, Trash2, RefreshCw } from 'lucide-react'

interface PreRegistration {
  id: string
  first_name: string
  last_name: string
  tc_no: string | null
  birth_date: string | null
  gender: string | null
  phone: string
  email: string | null
  city: string | null
  sport_interest: string | null
  parent_name: string | null
  parent_phone: string | null
  notes: string | null
  status: 'pending' | 'approved' | 'rejected' | 'converted'
  created_at: string
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Bekliyor',
  approved: 'Onaylandı',
  rejected: 'Reddedildi',
  converted: 'Sporcu Yapıldı',
}

const STATUS_CLASSES: Record<string, string> = {
  pending: 'badge-warning',
  approved: 'badge-success',
  rejected: 'badge-danger',
  converted: 'badge-info',
}

export default function PreRegistrationsPage() {
  const supabase = createClient()
  const [registrations, setRegistrations] = useState<PreRegistration[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<PreRegistration | null>(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('pre_registrations')
      .select('*')
      .order('created_at', { ascending: false })

    if (filterStatus !== 'all') q = q.eq('status', filterStatus)

    const { data } = await q
    setRegistrations(data || [])
    setLoading(false)
  }, [supabase, filterStatus])

  useEffect(() => { load() }, [load])

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('pre_registrations').update({ status }).eq('id', id)
    load()
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status: status as PreRegistration['status'] } : null)
  }

  const deleteReg = async (id: string) => {
    if (!confirm('Bu ön kaydı silmek istediğinize emin misiniz?')) return
    await supabase.from('pre_registrations').delete().eq('id', id)
    load()
    if (selected?.id === id) setSelected(null)
  }

  const filtered = registrations.filter(r => {
    const fullName = `${r.first_name} ${r.last_name}`.toLowerCase()
    return fullName.includes(search.toLowerCase()) || r.phone.includes(search) || (r.email?.toLowerCase().includes(search.toLowerCase()))
  })

  const counts = {
    all: registrations.length,
    pending: registrations.filter(r => r.status === 'pending').length,
    approved: registrations.filter(r => r.status === 'approved').length,
    rejected: registrations.filter(r => r.status === 'rejected').length,
    converted: registrations.filter(r => r.status === 'converted').length,
  }

  return (
    <DashboardLayout>
      <div className="page-container">
        <div className="page-header">
          <div>
            <h1 className="page-title">Ön Kayıtlar</h1>
            <p className="page-subtitle">Online ön kayıt başvurularını yönetin</p>
          </div>
          <button onClick={load} className="btn bd" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <RefreshCw size={16} /> Yenile
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Bekleyen', count: counts.pending, icon: Clock, color: '#f59e0b' },
            { label: 'Onaylanan', count: counts.approved, icon: CheckCircle, color: '#22c55e' },
            { label: 'Reddedilen', count: counts.rejected, icon: XCircle, color: '#ef4444' },
            { label: 'Sporcu Yapılan', count: counts.converted, icon: UserPlus, color: 'var(--accent)' },
          ].map((s, i) => (
            <div key={i} className="stats-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: s.color }}>{s.count}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{s.label}</div>
                </div>
                <s.icon size={28} style={{ color: s.color, opacity: 0.7 }} />
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '1.5rem' }}>
          {/* List */}
          <div style={{ flex: 1 }}>
            {/* Filters */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <input
                className="form-input"
                placeholder="İsim, telefon veya e-posta ara..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ flex: 1, minWidth: '200px' }}
              />
              <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: 'auto' }}>
                <option value="all">Tümü ({counts.all})</option>
                <option value="pending">Bekleyen ({counts.pending})</option>
                <option value="approved">Onaylanan ({counts.approved})</option>
                <option value="rejected">Reddedilen ({counts.rejected})</option>
                <option value="converted">Sporcu Yapılan ({counts.converted})</option>
              </select>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Yükleniyor...</div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📋</div>
                <div>Ön kayıt bulunamadı</div>
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Ad Soyad</th>
                      <th>Telefon</th>
                      <th>Spor Dalı</th>
                      <th>Durum</th>
                      <th>Tarih</th>
                      <th>İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(r => (
                      <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(r)}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{r.first_name} {r.last_name}</div>
                          {r.email && <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{r.email}</div>}
                        </td>
                        <td>{formatPhone(r.phone)}</td>
                        <td>{r.sport_interest || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                        <td>
                          <span className={`badge ${STATUS_CLASSES[r.status]}`}>{STATUS_LABELS[r.status]}</span>
                        </td>
                        <td style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{formatDate(r.created_at)}</td>
                        <td onClick={e => e.stopPropagation()}>
                          <button onClick={() => setSelected(r)} className="icon-btn" title="Detay">
                            <Eye size={16} />
                          </button>
                          <button onClick={() => deleteReg(r.id)} className="icon-btn danger" title="Sil">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Detail Panel */}
          {selected && (
            <div style={{ width: '360px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.5rem', height: 'fit-content', position: 'sticky', top: '80px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>{selected.first_name} {selected.last_name}</h3>
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.25rem', lineHeight: 1 }}>×</button>
              </div>

              <span className={`badge ${STATUS_CLASSES[selected.status]}`} style={{ marginBottom: '1.25rem', display: 'inline-block' }}>
                {STATUS_LABELS[selected.status]}
              </span>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                {[
                  { label: 'TC No', value: selected.tc_no },
                  { label: 'Doğum Tarihi', value: selected.birth_date ? formatDate(selected.birth_date) : null },
                  { label: 'Cinsiyet', value: selected.gender === 'male' ? 'Erkek' : selected.gender === 'female' ? 'Kız' : null },
                  { label: 'Telefon', value: formatPhone(selected.phone) },
                  { label: 'E-posta', value: selected.email },
                  { label: 'Şehir', value: selected.city },
                  { label: 'Spor Dalı', value: selected.sport_interest },
                  { label: 'Veli', value: selected.parent_name },
                  { label: 'Veli Tel', value: selected.parent_phone ? formatPhone(selected.parent_phone) : null },
                ].filter(f => f.value).map((f, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', fontSize: '0.875rem' }}>
                    <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{f.label}</span>
                    <span style={{ fontWeight: 500, textAlign: 'right', wordBreak: 'break-word' }}>{f.value}</span>
                  </div>
                ))}
                {selected.notes && (
                  <div style={{ fontSize: '0.875rem', padding: '0.75rem', background: 'var(--bg-primary)', borderRadius: '0.375rem', marginTop: '0.25rem' }}>
                    <div style={{ color: 'var(--text-muted)', marginBottom: '0.25rem', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>Notlar</div>
                    {selected.notes}
                  </div>
                )}
              </div>

              {selected.status === 'pending' && (
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button onClick={() => updateStatus(selected.id, 'approved')} className="btn bs" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem' }}>
                    <CheckCircle size={16} /> Onayla
                  </button>
                  <button onClick={() => updateStatus(selected.id, 'rejected')} className="btn bd" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', color: 'var(--danger)' }}>
                    <XCircle size={16} /> Reddet
                  </button>
                </div>
              )}
              {selected.status === 'approved' && (
                <button onClick={() => updateStatus(selected.id, 'converted')} className="btn bs" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <UserPlus size={16} /> Sporcu Olarak Kaydet
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
