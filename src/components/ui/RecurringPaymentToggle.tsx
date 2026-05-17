'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CreditCard, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency, formatDate } from '@/lib/utils/formatters'

interface Recurring {
  id: string
  amount: number
  currency: string
  day_of_month: number
  status: string
  next_charge_at: string | null
  last_charged_at: string | null
}

export function RecurringPaymentToggle({ athleteId, monthlyFee }: { athleteId: string; monthlyFee?: number }) {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [rec, setRec] = useState<Recurring | null>(null)
  const [day, setDay] = useState(1)

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('recurring_payments')
        .select('*')
        .eq('athlete_id', athleteId)
        .maybeSingle()
      if (data) {
        setRec(data as Recurring)
        setDay(data.day_of_month)
      }
      setLoading(false)
    })()
  }, [supabase, athleteId])

  const enable = async () => {
    if (!monthlyFee || monthlyFee <= 0) {
      toast.error('Önce aylık aidat tutarınız belirlenmeli')
      return
    }
    setBusy(true)
    const { data: { user } } = await supabase.auth.getUser()
    const orgId = user?.user_metadata?.organization_id

    const nextCharge = new Date()
    nextCharge.setMonth(nextCharge.getMonth() + 1)
    nextCharge.setDate(day)
    nextCharge.setHours(3, 0, 0, 0)

    const payload = {
      organization_id: orgId,
      athlete_id: athleteId,
      amount: monthlyFee,
      currency: 'TL',
      day_of_month: day,
      status: 'active',
      next_charge_at: nextCharge.toISOString(),
    }

    const { error } = rec
      ? await supabase.from('recurring_payments').update(payload).eq('id', rec.id)
      : await supabase.from('recurring_payments').insert(payload)

    setBusy(false)
    if (error) { toast.error('Hata: ' + error.message); return }
    toast.success('Otomatik aidat aktifleştirildi')
    const { data } = await supabase.from('recurring_payments').select('*').eq('athlete_id', athleteId).maybeSingle()
    if (data) setRec(data as Recurring)
  }

  const cancel = async () => {
    if (!rec) return
    if (!confirm('Otomatik aidat iptal edilsin mi?')) return
    setBusy(true)
    const { error } = await supabase.from('recurring_payments').update({ status: 'cancelled' }).eq('id', rec.id)
    setBusy(false)
    if (error) { toast.error('Hata: ' + error.message); return }
    toast.success('İptal edildi')
    setRec({ ...rec, status: 'cancelled' })
  }

  if (loading) return <div style={{ padding: 20, textAlign: 'center' }}><Loader2 className="spin" size={20} /></div>

  const isActive = rec?.status === 'active'

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--grad)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CreditCard size={18} color="#fff" />
        </div>
        <div>
          <div style={{ fontWeight: 700 }}>Otomatik Aylık Aidat</div>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>
            {isActive ? `Bir sonraki çekim: ${rec?.next_charge_at ? formatDate(rec.next_charge_at) : '-'}` : 'Pasif'}
          </div>
        </div>
      </div>

      {isActive && (
        <div style={{ background: 'var(--bg3)', padding: 10, borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
          <div>Tutar: <strong>{formatCurrency(rec.amount)}</strong></div>
          <div>Her ayın <strong>{rec.day_of_month}.</strong> günü çekilir</div>
          {rec.last_charged_at && <div>Son çekim: {formatDate(rec.last_charged_at)}</div>}
        </div>
      )}

      {!isActive && (
        <div style={{ marginBottom: 12 }}>
          <label className="form-label">Çekim Günü</label>
          <select className="form-input" value={day} onChange={e => setDay(Number(e.target.value))}>
            {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
              <option key={d} value={d}>{d}. günü</option>
            ))}
          </select>
        </div>
      )}

      {isActive ? (
        <button className="btn bd" onClick={cancel} disabled={busy} style={{ width: '100%' }}>
          {busy ? <Loader2 size={14} className="spin" /> : null} İptal Et
        </button>
      ) : (
        <button className="btn bp" onClick={enable} disabled={busy} style={{ width: '100%' }}>
          {busy ? <Loader2 size={14} className="spin" /> : <CreditCard size={14} />}
          Otomatik Aidatı Aktifleştir
        </button>
      )}
      <p style={{ marginTop: 10, fontSize: 11, color: 'var(--text3)', lineHeight: 1.5 }}>
        İlk çekim için kart bilgileriniz PayTR&apos;ye tokenize edilir. Kart numarası asla sistemimizde saklanmaz.
      </p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .spin{animation:spin 1s linear infinite}`}</style>
    </div>
  )
}
