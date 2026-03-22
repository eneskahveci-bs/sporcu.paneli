'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { validateTC } from '@/lib/utils/tc-validation'
import { TURKISH_CITIES, BLOOD_TYPES } from '@/lib/constants'

export default function OnKayitPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    tc_no: '',
    birth_date: '',
    gender: '',
    phone: '',
    email: '',
    city: '',
    address: '',
    blood_type: '',
    sport_interest: '',
    parent_name: '',
    parent_phone: '',
    parent_email: '',
    notes: '',
    kvkk_consent: false,
  })

  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (form.tc_no && !validateTC(form.tc_no)) {
      setError('Geçersiz TC Kimlik numarası')
      return
    }
    if (!form.kvkk_consent) {
      setError('KVKK metnini onaylamanız gerekmektedir')
      return
    }

    setLoading(true)
    try {
      const { error: err } = await supabase.from('pre_registrations').insert({
        first_name: form.first_name,
        last_name: form.last_name,
        tc_no: form.tc_no || null,
        birth_date: form.birth_date || null,
        gender: form.gender || null,
        phone: form.phone,
        email: form.email || null,
        city: form.city || null,
        address: form.address || null,
        blood_type: form.blood_type || null,
        sport_interest: form.sport_interest || null,
        parent_name: form.parent_name || null,
        parent_phone: form.parent_phone || null,
        parent_email: form.parent_email || null,
        notes: form.notes || null,
        status: 'pending',
      })

      if (err) throw err
      setSuccess(true)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Bir hata oluştu'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>Ön Kaydınız Alındı!</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
            Başvurunuz incelemeye alındı. Akademi ekibimiz en kısa sürede sizinle iletişime geçecektir.
          </p>
          <Link href="/" className="btn bs" style={{ display: 'inline-block' }}>Ana Sayfaya Dön</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page" style={{ minHeight: '100vh', paddingTop: '2rem', paddingBottom: '4rem' }}>
      <div className="auth-card" style={{ maxWidth: '640px' }}>
        <div className="auth-logo">🏅</div>
        <h1 className="auth-title">Ön Kayıt Formu</h1>
        <p className="auth-subtitle">Akademimize katılmak için formu doldurun, size ulaşalım.</p>

        {error && (
          <div className="alert-error" style={{ marginBottom: '1.5rem', padding: '0.875rem 1rem', borderRadius: '0.5rem', background: 'var(--danger-light)', color: 'var(--danger)', border: '1px solid var(--danger-border, #fca5a5)', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Kişisel Bilgiler */}
          <div className="form-section-title">Kişisel Bilgiler</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Ad *</label>
              <input className="form-input" required value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="Ad" />
            </div>
            <div className="form-group">
              <label className="form-label">Soyad *</label>
              <input className="form-input" required value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Soyad" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">TC Kimlik No</label>
              <input className="form-input" value={form.tc_no} onChange={e => set('tc_no', e.target.value.replace(/\D/g, '').slice(0, 11))} placeholder="11 haneli TC no" maxLength={11} />
            </div>
            <div className="form-group">
              <label className="form-label">Doğum Tarihi</label>
              <input className="form-input" type="date" value={form.birth_date} onChange={e => set('birth_date', e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Cinsiyet</label>
              <select className="form-select" value={form.gender} onChange={e => set('gender', e.target.value)}>
                <option value="">Seçiniz</option>
                <option value="male">Erkek</option>
                <option value="female">Kız</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Kan Grubu</label>
              <select className="form-select" value={form.blood_type} onChange={e => set('blood_type', e.target.value)}>
                <option value="">Seçiniz</option>
                {BLOOD_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>

          {/* İletişim */}
          <div className="form-section-title">İletişim Bilgileri</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Telefon *</label>
              <input className="form-input" required type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="0532 xxx xx xx" />
            </div>
            <div className="form-group">
              <label className="form-label">E-posta</label>
              <input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="ornek@email.com" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">İl</label>
              <select className="form-select" value={form.city} onChange={e => set('city', e.target.value)}>
                <option value="">Seçiniz</option>
                {TURKISH_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">İlgilendiğiniz Spor Dalı</label>
              <input className="form-input" value={form.sport_interest} onChange={e => set('sport_interest', e.target.value)} placeholder="Futbol, Yüzme..." />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Adres</label>
            <textarea className="form-input" value={form.address} onChange={e => set('address', e.target.value)} rows={2} placeholder="Açık adres" style={{ resize: 'vertical' }} />
          </div>

          {/* Veli Bilgileri */}
          <div className="form-section-title">Veli Bilgileri <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 400 }}>(18 yaş altı için)</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Veli Adı Soyadı</label>
              <input className="form-input" value={form.parent_name} onChange={e => set('parent_name', e.target.value)} placeholder="Veli adı soyadı" />
            </div>
            <div className="form-group">
              <label className="form-label">Veli Telefonu</label>
              <input className="form-input" type="tel" value={form.parent_phone} onChange={e => set('parent_phone', e.target.value)} placeholder="0532 xxx xx xx" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Notlar</label>
            <textarea className="form-input" value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} placeholder="Eklemek istediğiniz bilgiler..." style={{ resize: 'vertical' }} />
          </div>

          {/* KVKK */}
          <label style={{ display: 'flex', gap: '0.75rem', cursor: 'pointer', alignItems: 'flex-start', fontSize: '0.875rem' }}>
            <input type="checkbox" checked={form.kvkk_consent} onChange={e => set('kvkk_consent', e.target.checked)} style={{ marginTop: '0.125rem', accentColor: 'var(--accent)' }} />
            <span style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              <strong>KVKK Aydınlatma Metni</strong>&apos;ni okudum, kişisel verilerimin işlenmesine onay veriyorum.
            </span>
          </label>

          <button type="submit" className="btn bs" disabled={loading} style={{ marginTop: '0.5rem' }}>
            {loading ? 'Gönderiliyor...' : 'Ön Kayıt Gönder'}
          </button>

          <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Zaten hesabınız var mı?{' '}
            <Link href="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>Giriş Yapın</Link>
          </p>
        </form>
      </div>

      <style>{`
        .form-section-title {
          font-size: 0.8125rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--text-muted);
          padding-bottom: 0.25rem;
          border-bottom: 1px solid var(--border-color);
        }
        @media (max-width: 640px) {
          .auth-card > form > div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
