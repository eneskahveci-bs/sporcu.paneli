'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ThemeProvider } from '@/providers/ThemeProvider'
import { Loader2, ArrowLeft, FileSignature } from 'lucide-react'
import Link from 'next/link'
import { QRDisplay } from '@/components/ui/QRDisplay'
import { CalendarExportButton } from '@/components/ui/CalendarExportButton'
import { PushSubscribeToggle } from '@/components/ui/PushSubscribeToggle'
import { RecurringPaymentToggle } from '@/components/ui/RecurringPaymentToggle'

function FeaturesInner() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [athlete, setAthlete] = useState<{ id: string; monthly_fee?: number } | null>(null)

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('athletes').select('id, monthly_fee').eq('auth_user_id', user.id).maybeSingle()
        setAthlete(data)
      }
      setLoading(false)
    })()
  }, [supabase])

  if (loading) return <div style={{ padding: 80, textAlign: 'center', minHeight: '100vh', background: 'var(--bg)' }}><Loader2 size={28} className="spin" /></div>

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: 16 }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Link href="/portal" style={{ color: 'var(--text2)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
            <ArrowLeft size={18} /> Portal
          </Link>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Ek Özellikler</h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Bildirim Aboneliği */}
          <div className="card" style={{ padding: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Push Bildirimleri</h2>
            <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>
              Antrenman değişikliği, ödeme hatırlatması gibi önemli bildirimleri telefonunuzda alın
            </p>
            <PushSubscribeToggle />
          </div>

          {/* Takvim */}
          <div className="card" style={{ padding: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Antrenman Takvimi</h2>
            <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>
              Programınızı Google/Apple Calendar&apos;a otomatik aktarın
            </p>
            <CalendarExportButton />
          </div>

          {/* QR */}
          <QRDisplay />

          {/* Otomatik Aidat */}
          {athlete && (
            <RecurringPaymentToggle athleteId={athlete.id} monthlyFee={athlete.monthly_fee} />
          )}

          {/* Onay Formları */}
          <Link href="/portal/consent" style={{ textDecoration: 'none' }}>
            <div className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--grad)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileSignature size={18} color="#fff" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>Onay Formları</div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>Etkinlik/kamp onayları için dijital imza</div>
              </div>
              <span style={{ color: 'var(--text3)' }}>›</span>
            </div>
          </Link>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .spin{animation:spin 1s linear infinite}`}</style>
    </div>
  )
}

export default function PortalFeaturesPage() {
  return <ThemeProvider><FeaturesInner /></ThemeProvider>
}
