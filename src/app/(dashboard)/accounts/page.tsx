'use client'
import { useEffect, useState, useCallback } from 'react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import { Plus, Loader2, Wallet, Landmark, CreditCard, Trash2, ArrowDownLeft, ArrowUpRight, ArrowRightLeft } from 'lucide-react'
import { toast } from 'sonner'
import { confirmDialog } from '@/components/ui/ConfirmDialog'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { CardGridSkeleton } from '@/components/ui/Skeleton'
import { formatCurrency, formatDate } from '@/lib/utils/formatters'

interface Account { id: string; name: string; type: string; bank_name?: string; iban?: string; currency: string; opening_balance: number; is_active: boolean }
interface Balance { account_id: string; balance: number }
interface Txn { id: string; account_id: string; direction: string; amount: number; description?: string; category?: string; occurred_at: string }

const TYPE_ICON: Record<string, typeof Wallet> = { cash: Wallet, bank: Landmark, pos: CreditCard, online: CreditCard }
const TYPE_LABEL: Record<string, string> = { cash: 'Nakit Kasa', bank: 'Banka', pos: 'POS', online: 'Online' }

export default function AccountsPage() {
  const supabase = createClient()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [balances, setBalances] = useState<Record<string, number>>({})
  const [txns, setTxns] = useState<Txn[]>([])
  const [loading, setLoading] = useState(true)
  const [showAcc, setShowAcc] = useState(false)
  const [showTxn, setShowTxn] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const orgId = user?.user_metadata?.organization_id
    const [{ data: a }, { data: b }, { data: t }] = await Promise.all([
      supabase.from('cash_accounts').select('*').eq('organization_id', orgId).order('created_at'),
      supabase.from('account_balances').select('account_id, balance').eq('organization_id', orgId),
      supabase.from('account_transactions').select('*').eq('organization_id', orgId).order('occurred_at', { ascending: false }).limit(200),
    ])
    setAccounts((a || []) as Account[])
    const bm: Record<string, number> = {}
    ;((b || []) as Balance[]).forEach(x => { bm[x.account_id] = x.balance })
    setBalances(bm)
    setTxns((t || []) as Txn[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  const totalBalance = accounts.reduce((s, a) => s + (balances[a.id] || 0), 0)

  const deleteAccount = async (id: string) => {
    if (!await confirmDialog({ title: 'Hesap silinsin mi?', message: 'Hesaba ait tüm hareketler de silinir.', variant: 'danger', confirmText: 'Sil' })) return
    await supabase.from('cash_accounts').delete().eq('id', id)
    toast.success('Silindi'); fetchData()
  }

  const visibleTxns = selectedAccount ? txns.filter(t => t.account_id === selectedAccount) : txns

  return (
    <DashboardLayout title="Kasa & Banka">
      <PageHeader
        title="Kasa & Banka"
        subtitle={`Toplam bakiye: ${formatCurrency(totalBalance)}`}
        actions={
          <>
            <button className="btn bs" onClick={() => setShowTxn(true)} disabled={!accounts.length}><ArrowRightLeft size={15} /> Hareket</button>
            <button className="btn bp" onClick={() => setShowAcc(true)}><Plus size={16} /> Yeni Hesap</button>
          </>
        }
      />

      {loading ? <CardGridSkeleton count={3} height={100} /> : accounts.length === 0 ? (
        <EmptyState icon={<Wallet size={28} />} title="Hesap yok" description="Nakit kasa veya banka hesabı ekleyerek başlayın." action={<button className="btn bp" onClick={() => setShowAcc(true)}><Plus size={15} /> Yeni Hesap</button>} />
      ) : (
        <>
          <div className="grid-3" style={{ marginBottom: 20 }}>
            {accounts.map(a => {
              const Icon = TYPE_ICON[a.type] || Wallet
              const bal = balances[a.id] ?? a.opening_balance
              const isSel = selectedAccount === a.id
              return (
                <div key={a.id} className="card" style={{ padding: 16, cursor: 'pointer', borderColor: isSel ? 'var(--blue2)' : undefined, borderWidth: isSel ? 2 : 1 }}
                  onClick={() => setSelectedAccount(isSel ? null : a.id)}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={18} color="var(--blue2)" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{a.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>{TYPE_LABEL[a.type]}{a.bank_name ? ` · ${a.bank_name}` : ''}</div>
                      </div>
                    </div>
                    <button className="btn bd btn-xs" onClick={e => { e.stopPropagation(); deleteAccount(a.id) }}><Trash2 size={11} /></button>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: bal >= 0 ? 'var(--text)' : 'var(--red)' }}>{formatCurrency(bal)}</div>
                  {a.iban && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, fontFamily: 'monospace' }}>{a.iban}</div>}
                </div>
              )
            })}
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: 14 }}>Hareketler {selectedAccount && `· ${accounts.find(a => a.id === selectedAccount)?.name}`}</strong>
              {selectedAccount && <button className="btn bs btn-xs" onClick={() => setSelectedAccount(null)}>Tümünü Göster</button>}
            </div>
            {visibleTxns.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>Hareket yok</div>
            ) : (
              <table className="table">
                <thead><tr><th>Tarih</th><th>Açıklama</th><th>Hesap</th><th style={{ textAlign: 'right' }}>Tutar</th></tr></thead>
                <tbody>
                  {visibleTxns.map(t => (
                    <tr key={t.id}>
                      <td style={{ fontSize: 12, color: 'var(--text3)' }}>{formatDate(t.occurred_at)}</td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          {t.direction === 'in' ? <ArrowDownLeft size={14} color="var(--green)" /> : <ArrowUpRight size={14} color="var(--red)" />}
                          {t.description || t.category || (t.direction === 'in' ? 'Giriş' : 'Çıkış')}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text3)' }}>{accounts.find(a => a.id === t.account_id)?.name || '-'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: t.direction === 'in' ? 'var(--green)' : 'var(--red)' }}>
                        {t.direction === 'in' ? '+' : '-'}{formatCurrency(t.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {showAcc && <AccountModal onClose={() => setShowAcc(false)} onSave={() => { setShowAcc(false); fetchData() }} />}
      {showTxn && <TxnModal accounts={accounts} onClose={() => setShowTxn(false)} onSave={() => { setShowTxn(false); fetchData() }} />}
    </DashboardLayout>
  )
}

function AccountModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'cash', bank_name: '', iban: '', opening_balance: '0' })

  const save = async () => {
    if (!form.name.trim()) { toast.error('Hesap adı gerekli'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const orgId = user?.user_metadata?.organization_id
    const { error } = await supabase.from('cash_accounts').insert({
      organization_id: orgId, name: form.name, type: form.type,
      bank_name: form.bank_name || null, iban: form.iban || null,
      opening_balance: parseFloat(form.opening_balance) || 0,
    })
    setSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success('Hesap eklendi'); onSave()
  }

  return (
    <Modal open onClose={onClose} title="Yeni Kasa / Banka Hesabı" size="sm"
      footer={<><button className="btn bs" onClick={onClose}>İptal</button><button className="btn bp" onClick={save} disabled={saving}>{saving ? <Loader2 size={14} className="spin" /> : null} Kaydet</button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="form-group"><label className="form-label required">Hesap Adı</label><input className="form-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Örn: Ana Kasa, Ziraat TL" /></div>
        <div className="form-group"><label className="form-label">Tip</label>
          <select className="form-select" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
            {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        {(form.type === 'bank' || form.type === 'pos') && (
          <>
            <div className="form-group"><label className="form-label">Banka</label><input className="form-input" value={form.bank_name} onChange={e => setForm(p => ({ ...p, bank_name: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">IBAN</label><input className="form-input" value={form.iban} onChange={e => setForm(p => ({ ...p, iban: e.target.value }))} placeholder="TR.." /></div>
          </>
        )}
        <div className="form-group"><label className="form-label">Açılış Bakiyesi (₺)</label><input type="number" step="0.01" className="form-input" value={form.opening_balance} onChange={e => setForm(p => ({ ...p, opening_balance: e.target.value }))} /></div>
      </div>
    </Modal>
  )
}

function TxnModal({ accounts, onClose, onSave }: { accounts: Account[]; onClose: () => void; onSave: () => void }) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ account_id: accounts[0]?.id || '', direction: 'in', amount: '', description: '', occurred_at: new Date().toISOString().slice(0, 10) })

  const save = async () => {
    if (!form.account_id || !form.amount) { toast.error('Hesap ve tutar gerekli'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const orgId = user?.user_metadata?.organization_id
    const { error } = await supabase.from('account_transactions').insert({
      organization_id: orgId, account_id: form.account_id, direction: form.direction,
      amount: parseFloat(form.amount), description: form.description || null,
      category: 'Manuel', occurred_at: form.occurred_at, created_by: user!.id,
    })
    setSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success('Hareket eklendi'); onSave()
  }

  return (
    <Modal open onClose={onClose} title="Kasa Hareketi" size="sm"
      footer={<><button className="btn bs" onClick={onClose}>İptal</button><button className="btn bp" onClick={save} disabled={saving}>{saving ? <Loader2 size={14} className="spin" /> : null} Kaydet</button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="form-group"><label className="form-label required">Hesap</label>
          <select className="form-select" value={form.account_id} onChange={e => setForm(p => ({ ...p, account_id: e.target.value }))}>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div className="form-group"><label className="form-label">Yön</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className={`btn ${form.direction === 'in' ? 'bsu' : 'bs'}`} style={{ flex: 1 }} onClick={() => setForm(p => ({ ...p, direction: 'in' }))}><ArrowDownLeft size={14} /> Giriş</button>
            <button type="button" className={`btn ${form.direction === 'out' ? 'bd' : 'bs'}`} style={{ flex: 1 }} onClick={() => setForm(p => ({ ...p, direction: 'out' }))}><ArrowUpRight size={14} /> Çıkış</button>
          </div>
        </div>
        <div className="form-group"><label className="form-label required">Tutar (₺)</label><input type="number" step="0.01" className="form-input" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} /></div>
        <div className="form-group"><label className="form-label">Açıklama</label><input className="form-input" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
        <div className="form-group"><label className="form-label">Tarih</label><input type="date" className="form-input" value={form.occurred_at} onChange={e => setForm(p => ({ ...p, occurred_at: e.target.value }))} /></div>
      </div>
    </Modal>
  )
}
