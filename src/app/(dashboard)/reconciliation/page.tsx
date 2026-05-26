'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import { Upload, Loader2, Link2, X, Check, FileSpreadsheet } from 'lucide-react'
import { toast } from 'sonner'
import { confirmDialog } from '@/components/ui/ConfirmDialog'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { formatCurrency, formatDate } from '@/lib/utils/formatters'

interface BankRow {
  id: string; txn_date: string; description?: string; amount: number; direction?: string
  status: string; matched_payment_id?: string
}
interface PendingPayment { id: string; athlete_name?: string; amount: number; due_date?: string }

export default function ReconciliationPage() {
  const supabase = createClient()
  const [rows, setRows] = useState<BankRow[]>([])
  const [pending, setPending] = useState<PendingPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [matchRow, setMatchRow] = useState<BankRow | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const orgId = user?.user_metadata?.organization_id
    const [{ data: b }, { data: p }] = await Promise.all([
      supabase.from('bank_statements').select('*').eq('organization_id', orgId).order('txn_date', { ascending: false }),
      supabase.from('payments').select('id, athlete_name, amount, due_date').eq('organization_id', orgId).eq('type', 'income').in('status', ['pending', 'overdue']).order('due_date'),
    ])
    setRows((b || []) as BankRow[])
    setPending((p || []) as PendingPayment[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  // CSV parse: tarih,açıklama,tutar (yön: + giriş, - çıkış)
  const handleFile = async (file: File) => {
    setImporting(true)
    try {
      const text = await file.text()
      const lines = text.split(/\r?\n/).filter(l => l.trim())
      const { data: { user } } = await supabase.auth.getUser()
      const orgId = user?.user_metadata?.organization_id

      const records: Record<string, unknown>[] = []
      // İlk satır başlıksa atla
      const start = /tarih|date/i.test(lines[0]) ? 1 : 0
      for (let i = start; i < lines.length; i++) {
        const cols = lines[i].split(/[,;\t]/).map(c => c.trim().replace(/^"|"$/g, ''))
        if (cols.length < 3) continue
        const rawDate = cols[0]
        const desc = cols[1]
        const rawAmount = cols[2].replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')
        const amount = parseFloat(rawAmount)
        if (isNaN(amount)) continue
        // Tarih parse (dd.mm.yyyy veya yyyy-mm-dd)
        let isoDate = rawDate
        const dm = rawDate.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/)
        if (dm) isoDate = `${dm[3]}-${dm[2].padStart(2, '0')}-${dm[1].padStart(2, '0')}`
        records.push({
          organization_id: orgId,
          txn_date: isoDate,
          description: desc || null,
          amount: Math.abs(amount),
          direction: amount >= 0 ? 'in' : 'out',
          status: 'unmatched',
          raw_line: lines[i],
        })
      }
      if (!records.length) { toast.error('Geçerli satır bulunamadı. Format: tarih,açıklama,tutar'); return }
      const { error } = await supabase.from('bank_statements').insert(records)
      if (error) { toast.error(error.message); return }
      toast.success(`${records.length} hareket içe aktarıldı`)
      fetchData()
    } catch (e) {
      toast.error('İçe aktarma hatası: ' + (e as Error).message)
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const match = async (bankRow: BankRow, paymentId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('bank_statements').update({ matched_payment_id: paymentId, status: 'matched' }).eq('id', bankRow.id)
    await supabase.from('payments').update({ status: 'completed', paid_date: bankRow.txn_date }).eq('id', paymentId)
    void user
    toast.success('Eşleştirildi ve ödeme tamamlandı')
    setMatchRow(null)
    fetchData()
  }

  const ignore = async (id: string) => {
    await supabase.from('bank_statements').update({ status: 'ignored' }).eq('id', id)
    fetchData()
  }

  const clearAll = async () => {
    if (!await confirmDialog({ title: 'Tüm ekstre kayıtları silinsin mi?', variant: 'danger', confirmText: 'Temizle' })) return
    const { data: { user } } = await supabase.auth.getUser()
    const orgId = user?.user_metadata?.organization_id
    await supabase.from('bank_statements').delete().eq('organization_id', orgId)
    toast.success('Temizlendi'); fetchData()
  }

  const unmatched = rows.filter(r => r.status === 'unmatched')

  return (
    <DashboardLayout title="Banka Mutabakatı">
      <PageHeader title="Banka Mutabakatı" subtitle={`${unmatched.length} eşleşmemiş hareket`}
        actions={
          <>
            {rows.length > 0 && <button className="btn bs" onClick={clearAll}>Temizle</button>}
            <button className="btn bp" onClick={() => fileRef.current?.click()} disabled={importing}>
              {importing ? <Loader2 size={15} className="spin" /> : <Upload size={15} />} Ekstre Yükle (CSV)
            </button>
            <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </>
        } />

      <div style={{ background: 'rgba(59,130,246,0.06)', padding: 12, borderRadius: 10, marginBottom: 16, fontSize: 12, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <FileSpreadsheet size={16} color="var(--blue2)" />
        CSV formatı: <code>tarih,açıklama,tutar</code> — örn: <code>15.05.2026,Havale Mehmet,500</code>. Pozitif tutar giriş, negatif çıkış sayılır.
      </div>

      {loading ? <div style={{ padding: 48, textAlign: 'center' }}><Loader2 size={24} className="spin" /></div> : rows.length === 0 ? (
        <EmptyState icon={<FileSpreadsheet size={28} />} title="Ekstre yüklenmedi" description="Bankanızdan indirdiğiniz CSV ekstresini yükleyin, bekleyen ödemelerle otomatik eşleştirin." action={<button className="btn bp" onClick={() => fileRef.current?.click()}><Upload size={15} /> Ekstre Yükle</button>} />
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'auto' }}>
          <table className="table">
            <thead><tr><th>Tarih</th><th>Açıklama</th><th style={{ textAlign: 'right' }}>Tutar</th><th>Durum</th><th style={{ textAlign: 'right' }}>İşlem</th></tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} style={{ opacity: r.status === 'ignored' ? 0.5 : 1 }}>
                  <td style={{ fontSize: 12, color: 'var(--text3)' }}>{formatDate(r.txn_date)}</td>
                  <td style={{ fontSize: 13 }}>{r.description || '-'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: r.direction === 'in' ? 'var(--green)' : 'var(--red)' }}>
                    {r.direction === 'in' ? '+' : '-'}{formatCurrency(r.amount)}
                  </td>
                  <td>
                    <span className={`badge badge-sm ${r.status === 'matched' ? 'badge-green' : r.status === 'ignored' ? 'badge-gray' : 'badge-yellow'}`}>
                      {r.status === 'matched' ? 'Eşleşti' : r.status === 'ignored' ? 'Yoksayıldı' : 'Bekliyor'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {r.status === 'unmatched' && r.direction === 'in' && (
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button className="btn bsu btn-xs" onClick={() => setMatchRow(r)}><Link2 size={11} /> Eşleştir</button>
                        <button className="btn bs btn-xs" onClick={() => ignore(r.id)} title="Yoksay"><X size={11} /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {matchRow && (
        <Modal open onClose={() => setMatchRow(null)} title="Ödeme ile Eşleştir" size="md">
          <div style={{ marginBottom: 12, padding: 10, background: 'var(--bg3)', borderRadius: 8, fontSize: 13 }}>
            <strong>{formatCurrency(matchRow.amount)}</strong> · {formatDate(matchRow.txn_date)} · {matchRow.description}
          </div>
          {pending.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--text3)' }}>Bekleyen ödeme yok</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 360, overflow: 'auto' }}>
              {pending.map(p => {
                const exactMatch = Math.abs(p.amount - matchRow.amount) < 0.01
                return (
                  <button key={p.id} onClick={() => match(matchRow, p.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                      background: exactMatch ? 'rgba(34,197,94,0.08)' : 'var(--bg3)',
                      border: exactMatch ? '1px solid rgba(34,197,94,0.3)' : '1px solid var(--border)',
                      borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                    }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{p.athlete_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>Vade: {p.due_date ? formatDate(p.due_date) : '-'}</div>
                    </div>
                    <div style={{ fontWeight: 700 }}>{formatCurrency(p.amount)}</div>
                    {exactMatch && <Check size={16} color="var(--green)" />}
                  </button>
                )
              })}
            </div>
          )}
        </Modal>
      )}
    </DashboardLayout>
  )
}
