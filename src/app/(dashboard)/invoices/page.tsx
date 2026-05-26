'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import { Plus, Loader2, Trash2, FileText, Printer, X } from 'lucide-react'
import { toast } from 'sonner'
import { confirmDialog } from '@/components/ui/ConfirmDialog'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { formatCurrency, formatDate } from '@/lib/utils/formatters'

interface Invoice {
  id: string; invoice_no: string; type: string; customer_name: string; customer_tax_no?: string
  subtotal: number; vat_rate: number; vat_amount: number; total: number; status: string
  einvoice_status: string; issued_at: string; athlete_id?: string
}
interface LineItem { description: string; quantity: number; unit_price: number; vat_rate: number }
interface AthleteOpt { id: string; first_name: string; last_name: string; tc?: string }

const TYPE_LABEL: Record<string, string> = { receipt: 'Makbuz', invoice: 'Fatura', proforma: 'Proforma' }
const STATUS_BADGE: Record<string, string> = { draft: 'badge-gray', issued: 'badge-blue', paid: 'badge-green', cancelled: 'badge-red' }
const STATUS_LABEL: Record<string, string> = { draft: 'Taslak', issued: 'Kesildi', paid: 'Ödendi', cancelled: 'İptal' }
const EINV_LABEL: Record<string, string> = { none: 'E-Fatura yok', queued: 'Kuyrukta', sent: 'Gönderildi', accepted: 'Onaylandı', rejected: 'Reddedildi' }

export default function InvoicesPage() {
  const supabase = createClient()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [athletes, setAthletes] = useState<AthleteOpt[]>([])
  const [org, setOrg] = useState<{ name: string; address?: string; phone?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('')
  const [showModal, setShowModal] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const orgId = user?.user_metadata?.organization_id
    const [{ data: inv }, { data: a }, { data: o }] = await Promise.all([
      supabase.from('invoices').select('*').eq('organization_id', orgId).order('created_at', { ascending: false }),
      supabase.from('athletes').select('id, first_name, last_name, tc').eq('organization_id', orgId).eq('status', 'active').order('first_name'),
      supabase.from('organizations').select('name, address, phone').eq('id', orgId).single(),
    ])
    setInvoices((inv || []) as Invoice[])
    setAthletes((a || []) as AthleteOpt[])
    setOrg(o)
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  const remove = async (id: string) => {
    if (!await confirmDialog({ title: 'Fatura/makbuz silinsin mi?', variant: 'danger', confirmText: 'Sil' })) return
    await supabase.from('invoices').delete().eq('id', id)
    toast.success('Silindi'); fetchData()
  }

  const print = (inv: Invoice) => {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${inv.invoice_no}</title>
    <style>body{font-family:sans-serif;padding:40px;color:#111}.hdr{text-align:center;margin-bottom:24px}.org{font-size:20px;font-weight:800}.title{font-size:16px;font-weight:700;text-align:center;margin:16px 0;text-transform:uppercase}.row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee;font-size:14px}.tot{display:flex;justify-content:space-between;padding:12px 0;font-size:18px;font-weight:800;border-top:2px solid #111;margin-top:8px}.foot{margin-top:32px;font-size:12px;color:#888;text-align:center}</style>
    </head><body>
    <div class="hdr"><div class="org">${org?.name || 'Spor Akademisi'}</div>${org?.address ? `<div style="font-size:12px;color:#666">${org.address}</div>` : ''}${org?.phone ? `<div style="font-size:12px;color:#666">${org.phone}</div>` : ''}</div>
    <div class="title">${TYPE_LABEL[inv.type]}</div>
    <div class="row"><span>Belge No</span><span>${inv.invoice_no}</span></div>
    <div class="row"><span>Tarih</span><span>${new Date(inv.issued_at).toLocaleDateString('tr-TR')}</span></div>
    <div class="row"><span>Müşteri</span><span>${inv.customer_name}</span></div>
    ${inv.customer_tax_no ? `<div class="row"><span>Vergi/TC No</span><span>${inv.customer_tax_no}</span></div>` : ''}
    <div class="row"><span>Matrah</span><span>${inv.subtotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span></div>
    <div class="row"><span>KDV (%${inv.vat_rate})</span><span>${inv.vat_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span></div>
    <div class="tot"><span>TOPLAM</span><span>${inv.total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span></div>
    <div class="foot">Bu belge elektronik ortamda oluşturulmuştur.<br>${new Date().toLocaleString('tr-TR')}</div>
    </body></html>`
    const w = window.open('', '_blank', 'width=560,height=780')
    if (w) { w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 400) }
  }

  const filtered = useMemo(() => invoices.filter(i => !typeFilter || i.type === typeFilter), [invoices, typeFilter])
  const totalIssued = filtered.filter(i => i.status !== 'cancelled').reduce((s, i) => s + i.total, 0)

  return (
    <DashboardLayout title="Faturalar">
      <PageHeader title="Faturalar & Makbuzlar" subtitle={`${filtered.length} belge · Toplam ${formatCurrency(totalIssued)}`}
        actions={<button className="btn bp" onClick={() => setShowModal(true)}><Plus size={16} /> Yeni Belge</button>} />

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['', 'receipt', 'invoice', 'proforma'].map(t => (
          <button key={t} className={`btn ${typeFilter === t ? 'bp' : 'bs'} btn-sm`} onClick={() => setTypeFilter(t)}>
            {t === '' ? 'Tümü' : TYPE_LABEL[t]}
          </button>
        ))}
      </div>

      {loading ? <TableSkeleton rows={6} cols={6} /> : filtered.length === 0 ? (
        <EmptyState icon={<FileText size={28} />} title="Belge yok" description="Makbuz veya fatura kesin." action={<button className="btn bp" onClick={() => setShowModal(true)}><Plus size={15} /> Yeni Belge</button>} />
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'auto' }}>
          <table className="table">
            <thead><tr><th>Belge No</th><th>Tip</th><th>Müşteri</th><th>Tarih</th><th style={{ textAlign: 'right' }}>Tutar</th><th>Durum</th><th>E-Belge</th><th></th></tr></thead>
            <tbody>
              {filtered.map(i => (
                <tr key={i.id}>
                  <td style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 13 }}>{i.invoice_no}</td>
                  <td>{TYPE_LABEL[i.type]}</td>
                  <td>{i.customer_name}</td>
                  <td style={{ fontSize: 12, color: 'var(--text3)' }}>{formatDate(i.issued_at)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>
                    {formatCurrency(i.total)}
                    {i.vat_amount > 0 && <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 400 }}>KDV {formatCurrency(i.vat_amount)}</div>}
                  </td>
                  <td><span className={`badge badge-sm ${STATUS_BADGE[i.status]}`}>{STATUS_LABEL[i.status]}</span></td>
                  <td style={{ fontSize: 11, color: 'var(--text3)' }}>{EINV_LABEL[i.einvoice_status]}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      <button className="btn bs btn-xs" onClick={() => print(i)} title="Yazdır"><Printer size={11} /></button>
                      <button className="btn bd btn-xs" onClick={() => remove(i.id)}><Trash2 size={11} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && <InvoiceModal athletes={athletes} onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); fetchData() }} />}
    </DashboardLayout>
  )
}

function InvoiceModal({ athletes, onClose, onSave }: { athletes: AthleteOpt[]; onClose: () => void; onSave: () => void }) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [type, setType] = useState('receipt')
  const [athleteId, setAthleteId] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerTaxNo, setCustomerTaxNo] = useState('')
  const [vatRate, setVatRate] = useState('20')
  const [items, setItems] = useState<LineItem[]>([{ description: '', quantity: 1, unit_price: 0, vat_rate: 20 }])

  const subtotalRaw = items.reduce((s, it) => s + it.quantity * it.unit_price, 0)
  const vr = parseFloat(vatRate) || 0
  // KDV hariç matrah + KDV ekle modeli
  const vatAmount = subtotalRaw * (vr / 100)
  const total = subtotalRaw + vatAmount

  const setItem = (idx: number, patch: Partial<LineItem>) => setItems(items.map((it, i) => i === idx ? { ...it, ...patch } : it))
  const addItem = () => setItems([...items, { description: '', quantity: 1, unit_price: 0, vat_rate: vr }])
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx))

  const onAthleteChange = (id: string) => {
    setAthleteId(id)
    const a = athletes.find(x => x.id === id)
    if (a) { setCustomerName(`${a.first_name} ${a.last_name}`); if (a.tc) setCustomerTaxNo(a.tc) }
  }

  const save = async () => {
    if (!customerName.trim()) { toast.error('Müşteri adı gerekli'); return }
    if (items.every(it => !it.description.trim())) { toast.error('En az bir kalem girin'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const orgId = user?.user_metadata?.organization_id

    // Sıralı belge no üret
    const { data: noData, error: noErr } = await supabase.rpc('next_invoice_no', { p_org: orgId })
    if (noErr) { setSaving(false); toast.error('Belge no üretilemedi: ' + noErr.message); return }

    const { data: inv, error } = await supabase.from('invoices').insert({
      organization_id: orgId,
      invoice_no: noData,
      type,
      athlete_id: athleteId || null,
      customer_name: customerName,
      customer_tax_no: customerTaxNo || null,
      subtotal: Math.round(subtotalRaw * 100) / 100,
      vat_rate: vr,
      vat_amount: Math.round(vatAmount * 100) / 100,
      total: Math.round(total * 100) / 100,
      status: 'issued',
      created_by: user!.id,
    }).select('id').single()

    if (error) { setSaving(false); toast.error(error.message); return }

    const validItems = items.filter(it => it.description.trim())
    if (validItems.length) {
      await supabase.from('invoice_items').insert(validItems.map(it => ({
        invoice_id: inv.id, description: it.description, quantity: it.quantity, unit_price: it.unit_price, vat_rate: vr,
      })))
    }
    setSaving(false)
    toast.success(`${noData} numaralı belge oluşturuldu`); onSave()
  }

  return (
    <Modal open onClose={onClose} title="Yeni Fatura / Makbuz" size="lg"
      footer={<><button className="btn bs" onClick={onClose}>İptal</button><button className="btn bp" onClick={save} disabled={saving}>{saving ? <Loader2 size={14} className="spin" /> : null} Belge Oluştur</button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <div className="form-group"><label className="form-label">Belge Tipi</label>
            <select className="form-select" value={type} onChange={e => setType(e.target.value)}>
              {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="form-group"><label className="form-label">Sporcu (ops.)</label>
            <select className="form-select" value={athleteId} onChange={e => onAthleteChange(e.target.value)}>
              <option value="">Seçin...</option>
              {athletes.map(a => <option key={a.id} value={a.id}>{a.first_name} {a.last_name}</option>)}
            </select>
          </div>
          <div className="form-group"><label className="form-label">KDV %</label>
            <select className="form-select" value={vatRate} onChange={e => setVatRate(e.target.value)}>
              {['0', '1', '10', '20'].map(r => <option key={r} value={r}>%{r}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="form-group"><label className="form-label required">Müşteri Adı</label><input className="form-input" value={customerName} onChange={e => setCustomerName(e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Vergi / TC No</label><input className="form-input" value={customerTaxNo} onChange={e => setCustomerTaxNo(e.target.value)} /></div>
        </div>

        <div>
          <label className="form-label">Kalemler</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {items.map((it, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '3fr 70px 110px 30px', gap: 8, alignItems: 'center' }}>
                <input className="form-input" placeholder="Açıklama" value={it.description} onChange={e => setItem(idx, { description: e.target.value })} />
                <input type="number" className="form-input" placeholder="Adet" value={it.quantity} onChange={e => setItem(idx, { quantity: parseFloat(e.target.value) || 0 })} />
                <input type="number" step="0.01" className="form-input" placeholder="Birim ₺" value={it.unit_price || ''} onChange={e => setItem(idx, { unit_price: parseFloat(e.target.value) || 0 })} />
                <button className="btn bd btn-xs" onClick={() => removeItem(idx)} disabled={items.length === 1}><X size={12} /></button>
              </div>
            ))}
          </div>
          <button className="btn bs btn-sm" onClick={addItem} style={{ marginTop: 6 }}><Plus size={13} /> Kalem Ekle</button>
        </div>

        <div style={{ background: 'var(--bg3)', padding: 12, borderRadius: 10, fontSize: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text2)' }}>Matrah:</span><strong>{formatCurrency(Math.round(subtotalRaw * 100) / 100)}</strong></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}><span style={{ color: 'var(--text2)' }}>KDV (%{vr}):</span><strong>{formatCurrency(Math.round(vatAmount * 100) / 100)}</strong></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--border)', fontSize: 16 }}><span>Toplam:</span><strong style={{ color: 'var(--green)' }}>{formatCurrency(Math.round(total * 100) / 100)}</strong></div>
        </div>

        <div style={{ fontSize: 11, color: 'var(--text3)', background: 'rgba(59,130,246,0.06)', padding: 10, borderRadius: 8 }}>
          E-Fatura/E-Arşiv entegrasyonu için bir GİB entegratör hesabı gereklidir. Şu an belge yerel olarak oluşturulup yazdırılabilir; entegratör bağlandığında otomatik gönderilir.
        </div>
      </div>
    </Modal>
  )
}
