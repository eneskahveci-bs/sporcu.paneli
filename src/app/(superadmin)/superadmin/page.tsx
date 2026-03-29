'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ThemeProvider, useTheme } from '@/providers/ThemeProvider'
import {
  LogOut, Sun, Moon, Plus, Search, RefreshCw, Loader2,
  Building2, Users, GitBranch, TrendingUp, AlertCircle,
  CheckCircle, Clock, XCircle, Edit, Eye, EyeOff,
} from 'lucide-react'
import { toast } from 'sonner'
import { PLAN_CONFIG, STATUS_CONFIG, type SubscriptionPlan, type SubscriptionStatus } from '@/types'
import { formatCurrency } from '@/lib/utils/formatters'

interface OrgRow {
  id: string; name: string; slug: string; email?: string; phone?: string
  city?: string; logo?: string; created_at: string
  athlete_count: number; branch_count: number
  subscription: {
    id: string; plan: SubscriptionPlan; status: SubscriptionStatus
    price_monthly: number; billing_day: number
    current_period_end?: string; trial_ends_at?: string
    max_athletes: number; max_branches: number; notes?: string
  } | null
}

function SuperAdminPage() {
  const supabase = createClient()
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const [orgs, setOrgs] = useState<OrgRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [subModal, setSubModal] = useState<OrgRow | null>(null)
  const [newAcademyModal, setNewAcademyModal] = useState(false)
  const [saving, setSaving] = useState(false)

  const fetchOrgs = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/superadmin/organizations')
    if (!res.ok) { toast.error('Veri alınamadı'); setLoading(false); return }
    const data = await res.json()
    setOrgs(data.organizations || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || user.user_metadata?.role !== 'superadmin') { router.push('/login'); return }
      fetchOrgs()
    }
    check()
  }, [supabase, router, fetchOrgs])

  const signOut = async () => { await supabase.auth.signOut(); router.push('/login') }

  const filtered = orgs.filter(o =>
    !search || o.name.toLowerCase().includes(search.toLowerCase()) ||
    o.email?.toLowerCase().includes(search.toLowerCase()) ||
    o.city?.toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    total: orgs.length,
    active: orgs.filter(o => o.subscription?.status === 'active').length,
    trial: orgs.filter(o => o.subscription?.status === 'trial').length,
    overdue: orgs.filter(o => o.subscription?.status === 'overdue').length,
    suspended: orgs.filter(o => o.subscription?.status === 'suspended').length,
    revenue: orgs.filter(o => o.subscription?.status === 'active').reduce((s, o) => s + (o.subscription?.price_monthly || 0), 0),
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <header style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', gap: 16, position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 'auto' }}>
          <span style={{ fontSize: 24 }}>🏅</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, lineHeight: 1.2 }}>Sporcu Paneli</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Süper Admin</div>
          </div>
        </div>
        <button onClick={fetchOrgs} style={iconBtn} title="Yenile"><RefreshCw size={16} /></button>
        <button onClick={toggleTheme} style={iconBtn} title="Tema">{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}</button>
        <button onClick={signOut} style={{ ...iconBtn, color: '#ef4444' }} title="Çıkış"><LogOut size={16} /></button>
      </header>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '28px 24px' }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 16, marginBottom: 28 }}>
          {[
            { label: 'Toplam Akademi', value: stats.total, icon: <Building2 size={18} />, color: '#6366f1' },
            { label: 'Aktif', value: stats.active, icon: <CheckCircle size={18} />, color: '#10b981' },
            { label: 'Deneme', value: stats.trial, icon: <Clock size={18} />, color: '#0ea5e9' },
            { label: 'Gecikmiş', value: stats.overdue, icon: <AlertCircle size={18} />, color: '#f59e0b' },
            { label: 'Askıda', value: stats.suspended, icon: <XCircle size={18} />, color: '#ef4444' },
            { label: 'Aylık Gelir', value: formatCurrency(stats.revenue), icon: <TrendingUp size={18} />, color: '#8b5cf6', wide: true },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: s.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, flexShrink: 0 }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', lineHeight: 1.2 }}>{s.value}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 500 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
            <input
              placeholder="Akademi ara..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '9px 12px 9px 36px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 8, fontSize: 14, color: 'var(--text)', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <button onClick={() => setNewAcademyModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', background: 'var(--grad)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            <Plus size={16} /> Yeni Akademi
          </button>
        </div>

        {/* Table */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 64, textAlign: 'center' }}><Loader2 size={28} style={{ margin: '0 auto', color: 'var(--text3)', animation: 'spin 1s linear infinite' }} /></div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 64, textAlign: 'center', color: 'var(--text3)' }}>
              <Building2 size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <div style={{ fontWeight: 600 }}>Akademi bulunamadı</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg3)', borderBottom: '1px solid var(--border)' }}>
                    {['Akademi', 'Plan', 'Durum', 'Sporcu', 'Şube', 'Aylık', 'Bitiş', 'İşlem'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', fontSize: 12, fontWeight: 700, color: 'var(--text3)', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((org, i) => {
                    const sub = org.subscription
                    const plan = sub?.plan || 'trial'
                    const status = sub?.status || 'trial'
                    const planCfg = PLAN_CONFIG[plan as SubscriptionPlan]
                    const statusCfg = STATUS_CONFIG[status as SubscriptionStatus]
                    const endDate = sub?.current_period_end || sub?.trial_ends_at
                    const isExpiringSoon = endDate && new Date(endDate) < new Date(Date.now() + 7 * 86400000)
                    return (
                      <tr key={org.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none', transition: 'background 0.1s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--grad)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                              {org.logo ? <img src={org.logo} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} /> : org.name[0]}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 14 }}>{org.name}</div>
                              <div style={{ fontSize: 12, color: 'var(--text3)' }}>{org.city || org.email || '-'}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: planCfg.color + '18', color: planCfg.color }}>
                            {planCfg.name}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span className={`badge ${statusCfg.badge}`}>{statusCfg.label}</span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 14 }}>
                          <span style={{ fontWeight: 600 }}>{org.athlete_count}</span>
                          <span style={{ color: 'var(--text3)', fontSize: 12 }}>/{sub?.max_athletes || '?'}</span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 14 }}>
                          <span style={{ fontWeight: 600 }}>{org.branch_count}</span>
                          <span style={{ color: 'var(--text3)', fontSize: 12 }}>/{sub?.max_branches || '?'}</span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600 }}>
                          {sub?.price_monthly ? formatCurrency(sub.price_monthly) : <span style={{ color: 'var(--text3)' }}>-</span>}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 13 }}>
                          {endDate ? (
                            <span style={{ color: isExpiringSoon ? '#f59e0b' : 'var(--text2)', fontWeight: isExpiringSoon ? 700 : 400 }}>
                              {new Date(endDate).toLocaleDateString('tr-TR')}
                              {isExpiringSoon && ' ⚠️'}
                            </span>
                          ) : '-'}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <button onClick={() => setSubModal(org)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: 'var(--bg4)', border: '1px solid var(--border2)', borderRadius: 6, fontSize: 12, fontWeight: 600, color: 'var(--text2)', cursor: 'pointer' }}>
                            <Edit size={12} /> Yönet
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Subscription Modal */}
      {subModal && <SubscriptionModal org={subModal} onClose={() => setSubModal(null)} onSave={() => { setSubModal(null); fetchOrgs() }} />}

      {/* New Academy Modal */}
      {newAcademyModal && <NewAcademyModal onClose={() => setNewAcademyModal(false)} onSave={() => { setNewAcademyModal(false); fetchOrgs() }} />}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
      `}</style>
    </div>
  )
}

// ── Subscription Modal ─────────────────────────────────────────────────────
function SubscriptionModal({ org, onClose, onSave }: { org: OrgRow; onClose: () => void; onSave: () => void }) {
  const sub = org.subscription
  const [form, setForm] = useState({
    plan: sub?.plan || 'trial',
    status: sub?.status || 'trial',
    price_monthly: sub?.price_monthly?.toString() || '0',
    billing_day: sub?.billing_day?.toString() || '1',
    current_period_end: sub?.current_period_end ? sub.current_period_end.slice(0, 10) : '',
    max_athletes: sub?.max_athletes?.toString() || '30',
    max_branches: sub?.max_branches?.toString() || '1',
    notes: sub?.notes || '',
  })
  const [saving, setSaving] = useState(false)

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handlePlanChange = (plan: string) => {
    const cfg = PLAN_CONFIG[plan as SubscriptionPlan]
    setForm(p => ({ ...p, plan: plan as SubscriptionPlan, max_athletes: cfg.max_athletes.toString(), max_branches: cfg.max_branches.toString(), price_monthly: cfg.price.toString() }))
  }

  const handleSave = async () => {
    setSaving(true)
    const res = await fetch('/api/superadmin/subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organization_id: org.id,
        plan: form.plan, status: form.status,
        price_monthly: parseFloat(form.price_monthly) || 0,
        billing_day: parseInt(form.billing_day) || 1,
        current_period_end: form.current_period_end || null,
        max_athletes: parseInt(form.max_athletes) || 30,
        max_branches: parseInt(form.max_branches) || 1,
        notes: form.notes || null,
      }),
    })
    setSaving(false)
    if (!res.ok) { toast.error('Kaydedilemedi'); return }
    toast.success('Abonelik güncellendi')
    onSave()
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={{ ...modalBox, maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div style={modalHead}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{org.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>Abonelik Yönetimi</div>
          </div>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={grid2}>
            <div style={fg}>
              <label style={fl}>Plan</label>
              <select style={fi} value={form.plan} onChange={e => handlePlanChange(e.target.value)}>
                {Object.entries(PLAN_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.name} {v.price > 0 ? `— ${formatCurrency(v.price)}/ay` : ''}</option>)}
              </select>
            </div>
            <div style={fg}>
              <label style={fl}>Durum</label>
              <select style={fi} value={form.status} onChange={e => set('status', e.target.value)}>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div style={fg}>
              <label style={fl}>Aylık Ücret (₺)</label>
              <input style={fi} type="number" value={form.price_monthly} onChange={e => set('price_monthly', e.target.value)} />
            </div>
            <div style={fg}>
              <label style={fl}>Fatura Günü</label>
              <input style={fi} type="number" min={1} max={28} value={form.billing_day} onChange={e => set('billing_day', e.target.value)} />
            </div>
            <div style={fg}>
              <label style={fl}>Max Sporcu</label>
              <input style={fi} type="number" value={form.max_athletes} onChange={e => set('max_athletes', e.target.value)} />
            </div>
            <div style={fg}>
              <label style={fl}>Max Şube</label>
              <input style={fi} type="number" value={form.max_branches} onChange={e => set('max_branches', e.target.value)} />
            </div>
            <div style={{ ...fg, gridColumn: '1/-1' }}>
              <label style={fl}>Dönem Bitiş Tarihi</label>
              <input style={fi} type="date" value={form.current_period_end} onChange={e => set('current_period_end', e.target.value)} />
            </div>
            <div style={{ ...fg, gridColumn: '1/-1' }}>
              <label style={fl}>Notlar</label>
              <textarea style={{ ...fi, minHeight: 72, resize: 'vertical' as const }} value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>
          </div>
          {/* Hızlı aksiyonlar */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 4, borderTop: '1px solid var(--border)' }}>
            <button onClick={() => set('status', 'active')} style={quickBtn('#10b981')}>✓ Aktifleştir</button>
            <button onClick={() => set('status', 'suspended')} style={quickBtn('#ef4444')}>⊘ Askıya Al</button>
            <button onClick={() => set('status', 'overdue')} style={quickBtn('#f59e0b')}>⚠ Gecikmiş</button>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ padding: '8px 18px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, cursor: 'pointer', color: 'var(--text2)' }}>İptal</button>
            <button onClick={handleSave} disabled={saving} style={{ padding: '8px 18px', background: 'var(--grad)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : null}
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── New Academy Modal ──────────────────────────────────────────────────────
function NewAcademyModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState({ org_name: '', city: '', email: '', phone: '', plan: 'trial', price_monthly: '0', admin_email: '', admin_password: '', admin_name: '' })
  const [showPw, setShowPw] = useState(false)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<{ email: string; password: string } | null>(null)
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleCreate = async () => {
    if (!form.org_name || !form.admin_email || !form.admin_password) { toast.error('Akademi adı, admin e-posta ve şifre zorunludur'); return }
    if (form.admin_password.length < 8) { toast.error('Şifre en az 8 karakter olmalıdır'); return }
    setSaving(true)
    const res = await fetch('/api/superadmin/create-academy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, price_monthly: parseFloat(form.price_monthly) || 0 }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { toast.error(data.error || 'Akademi oluşturulamadı'); return }
    setResult(data.credentials)
    toast.success('Akademi oluşturuldu!')
    onSave()
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={{ ...modalBox, maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div style={modalHead}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Yeni Akademi Ekle</div>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>
        {result ? (
          <div style={{ padding: '32px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
            <h3 style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>Akademi Oluşturuldu!</h3>
            <p style={{ color: 'var(--text3)', marginBottom: 24, fontSize: 14 }}>Admin giriş bilgilerini ilgili kişiyle paylaşın:</p>
            <div style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 10, padding: '16px 20px', textAlign: 'left', marginBottom: 20 }}>
              <div style={{ fontSize: 13, marginBottom: 6 }}><strong>E-posta:</strong> <code style={{ background: 'var(--bg4)', padding: '2px 6px', borderRadius: 4 }}>{result.email}</code></div>
              <div style={{ fontSize: 13 }}><strong>Şifre:</strong> <code style={{ background: 'var(--bg4)', padding: '2px 6px', borderRadius: 4 }}>{result.password}</code></div>
            </div>
            <button onClick={onClose} style={{ padding: '10px 24px', background: 'var(--grad)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Kapat</button>
          </div>
        ) : (
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Akademi Bilgileri</div>
            <div style={grid2}>
              <div style={{ ...fg, gridColumn: '1/-1' }}>
                <label style={fl}>Akademi Adı *</label>
                <input style={fi} placeholder="Dragon Spor Akademisi" value={form.org_name} onChange={e => set('org_name', e.target.value)} />
              </div>
              <div style={fg}><label style={fl}>Şehir</label><input style={fi} placeholder="İstanbul" value={form.city} onChange={e => set('city', e.target.value)} /></div>
              <div style={fg}><label style={fl}>Telefon</label><input style={fi} type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
              <div style={{ ...fg, gridColumn: '1/-1' }}><label style={fl}>E-posta</label><input style={fi} type="email" value={form.email} onChange={e => set('email', e.target.value)} /></div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.05em', textTransform: 'uppercase', paddingTop: 8, borderTop: '1px solid var(--border)' }}>Plan & Ücret</div>
            <div style={grid2}>
              <div style={fg}>
                <label style={fl}>Plan</label>
                <select style={fi} value={form.plan} onChange={e => set('plan', e.target.value)}>
                  {Object.entries(PLAN_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
                </select>
              </div>
              <div style={fg}><label style={fl}>Aylık Ücret (₺)</label><input style={fi} type="number" value={form.price_monthly} onChange={e => set('price_monthly', e.target.value)} /></div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.05em', textTransform: 'uppercase', paddingTop: 8, borderTop: '1px solid var(--border)' }}>Admin Hesabı</div>
            <div style={grid2}>
              <div style={{ ...fg, gridColumn: '1/-1' }}><label style={fl}>Ad Soyad</label><input style={fi} placeholder="Ahmet Yılmaz" value={form.admin_name} onChange={e => set('admin_name', e.target.value)} /></div>
              <div style={{ ...fg, gridColumn: '1/-1' }}><label style={fl}>E-posta *</label><input style={fi} type="email" placeholder="admin@akademi.com" value={form.admin_email} onChange={e => set('admin_email', e.target.value)} /></div>
              <div style={{ ...fg, gridColumn: '1/-1' }}>
                <label style={fl}>Şifre * (min 8 karakter)</label>
                <div style={{ position: 'relative' }}>
                  <input style={{ ...fi, paddingRight: 40 }} type={showPw ? 'text' : 'password'} value={form.admin_password} onChange={e => set('admin_password', e.target.value)} />
                  <button type="button" onClick={() => setShowPw(p => !p)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', display: 'flex' }}>
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
              <button onClick={onClose} style={{ padding: '9px 18px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, cursor: 'pointer', color: 'var(--text2)' }}>İptal</button>
              <button onClick={handleCreate} disabled={saving} style={{ padding: '9px 18px', background: 'var(--grad)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={14} />}
                {saving ? 'Oluşturuluyor...' : 'Akademi Oluştur'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Shared styles ──────────────────────────────────────────────────────────
const iconBtn: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 8, background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text2)', cursor: 'pointer' }
const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }
const modalBox: React.CSSProperties = { width: '100%', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 14, boxShadow: 'var(--shadow)', animation: 'fadeIn 0.18s ease', maxHeight: '90vh', overflowY: 'auto' }
const modalHead: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid var(--border)' }
const closeBtn: React.CSSProperties = { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text3)', lineHeight: 1, padding: 4 }
const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }
const fg: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4 }
const fl: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: 'var(--text2)' }
const fi: React.CSSProperties = { width: '100%', padding: '8px 10px', background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 7, fontSize: 14, color: 'var(--text)', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }
const quickBtn = (color: string): React.CSSProperties => ({ padding: '5px 12px', background: color + '15', border: `1px solid ${color}40`, borderRadius: 6, fontSize: 12, fontWeight: 600, color, cursor: 'pointer' })

export default function Page() {
  return <ThemeProvider><SuperAdminPage /></ThemeProvider>
}
