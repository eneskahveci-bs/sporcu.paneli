'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Sparkles, Loader2, FileText } from 'lucide-react'
import { toast } from 'sonner'

export function AIReportButton({ athleteId, athleteName }: { athleteId: string; athleteName: string }) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [content, setContent] = useState('')
  const [open, setOpen] = useState(false)

  const generate = async () => {
    setLoading(true)
    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-athlete-report`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ athlete_id: athleteId, period_months: 3 }),
      })
      const j = await res.json()
      if (!res.ok) {
        if (j.error?.includes('ANTHROPIC_API_KEY')) {
          toast.error('AI servisi yapılandırılmamış. Admin: ANTHROPIC_API_KEY secret ekleyin.')
        } else {
          toast.error('Hata: ' + (j.error || res.status))
        }
        return
      }
      setContent(j.content || '')
      setOpen(true)
    } catch (e) {
      toast.error('Hata: ' + (e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button className="btn bp" onClick={generate} disabled={loading}>
        {loading ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />}
        AI Rapor Üret
      </button>

      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div className="modal" style={{ maxWidth: 700, maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={18} /> {athleteName} - Gelişim Raporu
              </h2>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text3)' }}>×</button>
            </div>
            <div className="modal-body" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, fontSize: 14, color: 'var(--text)' }}>
              {content}
            </div>
            <div className="modal-footer">
              <button className="btn bs" onClick={() => navigator.clipboard.writeText(content).then(() => toast.success('Kopyalandı'))}>Kopyala</button>
              <button className="btn bp" onClick={() => setOpen(false)}>Kapat</button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .spin{animation:spin 1s linear infinite}`}</style>
    </>
  )
}
