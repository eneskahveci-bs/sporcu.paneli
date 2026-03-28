'use client'

import { useEffect, useState, useCallback } from 'react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import { Plus, Package, TrendingUp, AlertTriangle, Loader2, Save, Trash2, ClipboardList, Search } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils/formatters'
import { toast } from 'sonner'

interface InventoryItem {
  id: string
  name: string
  category: string
  sku: string
  unit: string
  unit_price: number
  stock_qty: number
  critical_stock: number
  status: 'active' | 'passive'
  organization_id: string
}

interface InventoryMovement {
  id: string
  item_id: string
  item_name: string
  movement_type: string
  quantity_delta: number
  note: string
  athlete_name?: string
  created_at: string
}

const UNITS = ['adet', 'çift', 'paket', 'kg', 'metre']

export default function InventoryPage() {
  const supabase = createClient()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [movements, setMovements] = useState<InventoryMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showMovementsModal, setShowMovementsModal] = useState(false)
  const [editItem, setEditItem] = useState<InventoryItem | null>(null)
  const [stockItem, setStockItem] = useState<InventoryItem | null>(null)
  const [deleteItem, setDeleteItem] = useState<InventoryItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [orgId, setOrgId] = useState('')

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const oid = user?.user_metadata?.organization_id
    setOrgId(oid || '')
    setLoading(true)

    const [{ data: inv }, { data: mov }] = await Promise.all([
      supabase.from('inventory_items').select('*').eq('organization_id', oid).neq('status', 'deleted').order('name'),
      supabase.from('inventory_movements').select('*').eq('organization_id', oid).order('created_at', { ascending: false }).limit(200),
    ])

    setItems(inv || [])
    setMovements(mov || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  const activeItems = items.filter(i => i.status !== 'passive' as string)
  const criticalItems = activeItems.filter(i => i.stock_qty <= i.critical_stock)
  const totalValue = activeItems.reduce((s, i) => s + i.stock_qty * i.unit_price, 0)
  const totalStock = activeItems.reduce((s, i) => s + i.stock_qty, 0)

  const filtered = items.filter(i => {
    const q = search.toLowerCase()
    return !q || i.name.toLowerCase().includes(q) || (i.category || '').toLowerCase().includes(q) || (i.sku || '').toLowerCase().includes(q)
  })

  return (
    <DashboardLayout title="Envanter">
      <div className="page-header">
        <div>
          <h1 className="page-title">Envanter</h1>
          <p className="page-subtitle">Ürün stok takibi ve yönetimi</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn bs btn-sm" onClick={() => setShowMovementsModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ClipboardList size={15} /> Stok Hareketleri
          </button>
          <button className="btn bp" onClick={() => setShowAddModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={16} /> Yeni Ürün Ekle
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: '20px' }}>
        {[
          { icon: <Package size={22} color="var(--blue2)" />, label: 'Toplam Ürün', value: activeItems.length, bg: 'rgba(45,92,179,0.15)' },
          { icon: <TrendingUp size={22} color="var(--green)" />, label: 'Toplam Stok', value: totalStock, bg: 'rgba(34,197,94,0.15)' },
          { icon: <span style={{ fontSize: '22px' }}>💰</span>, label: 'Stok Değeri', value: formatCurrency(totalValue), bg: 'rgba(168,85,247,0.15)' },
          { icon: <AlertTriangle size={22} color="var(--red)" />, label: 'Kritik Stok', value: criticalItems.length, bg: 'rgba(239,68,68,0.15)' },
        ].map(s => (
          <div key={s.label} className="stats-card">
            <div className="stats-icon" style={{ background: s.bg }}>{s.icon}</div>
            <div><div className="stats-label">{s.label}</div><div className="stats-value">{s.value}</div></div>
          </div>
        ))}
      </div>

      {/* Kritik stok uyarısı */}
      {criticalItems.length > 0 && (
        <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.08)', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.25)', borderLeft: '4px solid var(--red)', marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <AlertTriangle size={18} style={{ color: 'var(--red)', flexShrink: 0, marginTop: '1px' }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '4px' }}>Kritik Stok Uyarısı</div>
            <div style={{ fontSize: '12px', color: 'var(--text2)' }}>
              {criticalItems.length} ürün kritik seviyenin altında: {criticalItems.map(i => `${i.name} (${i.stock_qty} ${i.unit})`).join(', ')}
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="filter-bar" style={{ marginBottom: '16px' }}>
        <div className="search-input-wrap">
          <Search className="search-icon" />
          <input placeholder="Ürün adı, kategori, SKU ara..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center' }}><Loader2 size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto', color: 'var(--text3)' }} /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📦</div>
            <div className="empty-state-title">Henüz ürün eklenmemiş</div>
            <div className="empty-state-sub">Yeni ürün eklemek için yukarıdaki butonu kullanın</div>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Ürün</th>
                <th>Kategori</th>
                <th>SKU</th>
                <th>Birim</th>
                <th>Birim Fiyat</th>
                <th>Stok</th>
                <th>Kritik</th>
                <th>Durum</th>
                <th style={{ textAlign: 'right' }}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const isCritical = item.stock_qty <= item.critical_stock
                return (
                  <tr key={item.id} style={{ background: isCritical ? 'rgba(239,68,68,0.04)' : undefined }}>
                    <td><div style={{ fontWeight: 600 }}>{item.name}</div></td>
                    <td className="ts text-muted">{item.category || '-'}</td>
                    <td className="ts text-muted" style={{ fontFamily: 'monospace' }}>{item.sku || '-'}</td>
                    <td className="ts">{item.unit}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(item.unit_price)}</td>
                    <td>
                      <span style={{ fontWeight: 700, color: isCritical ? 'var(--red)' : 'var(--green)', background: isCritical ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)', padding: '2px 10px', borderRadius: '6px', fontSize: '13px' }}>
                        {item.stock_qty}
                      </span>
                    </td>
                    <td className="ts text-muted">{item.critical_stock}</td>
                    <td>
                      <span className={`badge ${item.status === 'active' ? 'badge-green' : 'badge-yellow'}`}>
                        {item.status === 'active' ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                        <button className="btn bp btn-xs" onClick={() => setStockItem(item)} title="Stok Ekle">+ Stok</button>
                        <button className="btn bs btn-xs" onClick={() => setEditItem(item)} title="Düzenle">✏️</button>
                        <button className="btn bd btn-xs" onClick={() => setDeleteItem(item)} title="Sil"><Trash2 size={11} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddItemModal
          orgId={orgId}
          onClose={() => setShowAddModal(false)}
          onSave={() => { setShowAddModal(false); fetchData() }}
        />
      )}
      {editItem && (
        <EditItemModal
          item={editItem}
          onClose={() => setEditItem(null)}
          onSave={() => { setEditItem(null); fetchData() }}
        />
      )}
      {stockItem && (
        <StockAddModal
          item={stockItem}
          orgId={orgId}
          onClose={() => setStockItem(null)}
          onSave={() => { setStockItem(null); fetchData() }}
        />
      )}
      {deleteItem && (
        <DeleteItemModal
          item={deleteItem}
          onClose={() => setDeleteItem(null)}
          onSave={() => { setDeleteItem(null); fetchData() }}
        />
      )}
      {showMovementsModal && (
        <MovementsModal movements={movements} onClose={() => setShowMovementsModal(false)} />
      )}
    </DashboardLayout>
  )
}

// ── Add Item Modal ─────────────────────────────────────────────
function AddItemModal({ orgId, onClose, onSave }: { orgId: string; onClose: () => void; onSave: () => void }) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', category: '', sku: '', unit: 'adet', unit_price: '', stock_qty: '0', critical_stock: '5' })

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Ürün adı zorunludur'); return }
    if (!form.unit_price || parseFloat(form.unit_price) <= 0) { toast.error('Birim fiyat zorunludur'); return }
    setSaving(true)

    const { data, error } = await supabase.from('inventory_items').insert({
      organization_id: orgId,
      name: form.name.trim(),
      category: form.category.trim(),
      sku: form.sku.trim(),
      unit: form.unit,
      unit_price: parseFloat(form.unit_price),
      stock_qty: parseInt(form.stock_qty) || 0,
      critical_stock: parseInt(form.critical_stock) || 5,
      status: 'active',
    }).select().single()

    if (error) { toast.error('Hata: ' + error.message); setSaving(false); return }

    // Log initial stock movement
    const initialStock = parseInt(form.stock_qty) || 0
    if (initialStock > 0 && data) {
      await supabase.from('inventory_movements').insert({
        organization_id: orgId,
        item_id: data.id,
        item_name: form.name.trim(),
        movement_type: 'stock_in',
        quantity_delta: initialStock,
        note: 'Başlangıç stoğu',
      })
    }

    toast.success('Ürün eklendi')
    setSaving(false)
    onSave()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Yeni Ürün Ekle</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '20px' }}>×</button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label required">Ürün Adı</label>
                <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Örn: Forma" />
              </div>
              <div className="form-group">
                <label className="form-label">Kategori</label>
                <input className="form-input" value={form.category} onChange={e => set('category', e.target.value)} placeholder="Örn: Giyim" />
              </div>
              <div className="form-group">
                <label className="form-label">SKU</label>
                <input className="form-input" value={form.sku} onChange={e => set('sku', e.target.value)} placeholder="Örn: FRM-001" style={{ fontFamily: 'monospace' }} />
              </div>
              <div className="form-group">
                <label className="form-label">Birim</label>
                <select className="form-select" value={form.unit} onChange={e => set('unit', e.target.value)}>
                  {UNITS.map(u => <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label required">Birim Fiyat (₺)</label>
                <input type="number" className="form-input" value={form.unit_price} onChange={e => set('unit_price', e.target.value)} min="0" step="0.01" placeholder="0.00" />
              </div>
              <div className="form-group">
                <label className="form-label">Başlangıç Stok</label>
                <input type="number" className="form-input" value={form.stock_qty} onChange={e => set('stock_qty', e.target.value)} min="0" />
              </div>
              <div className="form-group">
                <label className="form-label">Kritik Stok Seviyesi</label>
                <input type="number" className="form-input" value={form.critical_stock} onChange={e => set('critical_stock', e.target.value)} min="0" />
              </div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn bs" onClick={onClose}>İptal</button>
          <button className="btn bp" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={15} />} {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Edit Item Modal ─────────────────────────────────────────────
function EditItemModal({ item, onClose, onSave }: { item: InventoryItem; onClose: () => void; onSave: () => void }) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: item.name, category: item.category || '', sku: item.sku || '',
    unit: item.unit, unit_price: String(item.unit_price),
    critical_stock: String(item.critical_stock), status: item.status,
  })

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Ürün adı zorunludur'); return }
    if (!form.unit_price || parseFloat(form.unit_price) <= 0) { toast.error('Birim fiyat zorunludur'); return }
    setSaving(true)
    const { error } = await supabase.from('inventory_items').update({
      name: form.name.trim(), category: form.category.trim(), sku: form.sku.trim(),
      unit: form.unit, unit_price: parseFloat(form.unit_price),
      critical_stock: parseInt(form.critical_stock) || 5, status: form.status,
    }).eq('id', item.id)
    setSaving(false)
    if (error) { toast.error('Hata: ' + error.message); return }
    toast.success('Ürün güncellendi')
    onSave()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Ürün Düzenle</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '20px' }}>×</button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label required">Ürün Adı</label>
                <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Kategori</label>
                <input className="form-input" value={form.category} onChange={e => set('category', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">SKU</label>
                <input className="form-input" value={form.sku} onChange={e => set('sku', e.target.value)} style={{ fontFamily: 'monospace' }} />
              </div>
              <div className="form-group">
                <label className="form-label">Birim</label>
                <select className="form-select" value={form.unit} onChange={e => set('unit', e.target.value)}>
                  {UNITS.map(u => <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label required">Birim Fiyat (₺)</label>
                <input type="number" className="form-input" value={form.unit_price} onChange={e => set('unit_price', e.target.value)} min="0" step="0.01" />
              </div>
              <div className="form-group">
                <label className="form-label">Kritik Stok Seviyesi</label>
                <input type="number" className="form-input" value={form.critical_stock} onChange={e => set('critical_stock', e.target.value)} min="0" />
              </div>
              <div className="form-group">
                <label className="form-label">Durum</label>
                <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                  <option value="active">Aktif</option>
                  <option value="passive">Pasif</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn bs" onClick={onClose}>İptal</button>
          <button className="btn bp" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={15} />} {saving ? 'Güncelleniyor...' : 'Güncelle'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Stock Add Modal ─────────────────────────────────────────────
function StockAddModal({ item, orgId, onClose, onSave }: { item: InventoryItem; orgId: string; onClose: () => void; onSave: () => void }) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [qty, setQty] = useState('1')
  const [note, setNote] = useState('')

  const handleSave = async () => {
    const amount = parseInt(qty) || 0
    if (amount <= 0) { toast.error('Geçerli bir miktar girin'); return }
    setSaving(true)

    const { error: stockErr } = await supabase.from('inventory_items')
      .update({ stock_qty: item.stock_qty + amount }).eq('id', item.id)

    if (stockErr) { toast.error('Hata: ' + stockErr.message); setSaving(false); return }

    await supabase.from('inventory_movements').insert({
      organization_id: orgId,
      item_id: item.id,
      item_name: item.name,
      movement_type: 'stock_in',
      quantity_delta: amount,
      note: note.trim() || 'Manuel stok girişi',
    })

    toast.success(`${amount} ${item.unit} stok eklendi. Yeni stok: ${item.stock_qty + amount}`)
    setSaving(false)
    onSave()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Stok Girişi — {item.name}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '20px' }}>×</button>
        </div>
        <div className="modal-body">
          <div style={{ padding: '10px 14px', background: 'rgba(45,92,179,0.08)', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', color: 'var(--text2)' }}>
            Mevcut stok: <strong>{item.stock_qty} {item.unit}</strong>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label required">Eklenecek Miktar ({item.unit})</label>
              <input type="number" className="form-input" value={qty} onChange={e => setQty(e.target.value)} min="1" />
            </div>
            <div className="form-group">
              <label className="form-label">Not</label>
              <input className="form-input" value={note} onChange={e => setNote(e.target.value)} placeholder="Tedarikçiden alındı vb." />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn bs" onClick={onClose}>İptal</button>
          <button className="btn bp" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={15} />} {saving ? 'Kaydediliyor...' : 'Stok Ekle'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Delete Item Modal ──────────────────────────────────────────
function DeleteItemModal({ item, onClose, onSave }: { item: InventoryItem; onClose: () => void; onSave: () => void }) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)

  const handleDelete = async () => {
    setSaving(true)
    const { error } = await supabase.from('inventory_items').update({ status: 'deleted' }).eq('id', item.id)
    setSaving(false)
    if (error) { toast.error('Hata: ' + error.message); return }
    toast.success('Ürün silindi')
    onSave()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Ürün Sil</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '20px' }}>×</button>
        </div>
        <div className="modal-body">
          <div style={{ padding: '14px 16px', background: 'rgba(239,68,68,0.08)', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.2)', marginBottom: '16px' }}>
            <div style={{ fontWeight: 700, marginBottom: '6px' }}>⚠️ Dikkat</div>
            <p style={{ fontSize: '13px', color: 'var(--text2)' }}>
              <strong>&quot;{item.name}&quot;</strong> ürünü silinecek. Bu işlem geri alınamaz.
            </p>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn bs" onClick={onClose}>İptal</button>
          <button className="btn bd" onClick={handleDelete} disabled={saving}>
            {saving ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={15} />} {saving ? 'Siliniyor...' : 'Sil'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Movements Modal ─────────────────────────────────────────────
function MovementsModal({ movements, onClose }: { movements: InventoryMovement[]; onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 700 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Stok Hareketleri</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '20px' }}>×</button>
        </div>
        <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {movements.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px' }}>
              <div className="empty-state-icon">📋</div>
              <div className="empty-state-title">Henüz stok hareketi yok</div>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>Ürün</th>
                  <th>Tür</th>
                  <th>Miktar</th>
                  <th>Not</th>
                  <th>Sporcu</th>
                </tr>
              </thead>
              <tbody>
                {movements.slice(0, 100).map(m => (
                  <tr key={m.id}>
                    <td className="ts text-muted">{formatDate(m.created_at?.slice(0, 10))}</td>
                    <td style={{ fontWeight: 600 }}>{m.item_name || '-'}</td>
                    <td>
                      <span className={`badge ${m.movement_type === 'stock_in' ? 'badge-green' : m.movement_type === 'sale' ? 'badge-blue' : 'badge-yellow'}`}>
                        {m.movement_type === 'stock_in' ? 'Giriş' : m.movement_type === 'sale' ? 'Satış' : m.movement_type}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: m.quantity_delta > 0 ? 'var(--green)' : 'var(--red)' }}>
                      {m.quantity_delta > 0 ? '+' : ''}{m.quantity_delta}
                    </td>
                    <td className="ts text-muted">{m.note || '-'}</td>
                    <td className="ts text-muted">{m.athlete_name || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn bs" onClick={onClose}>Kapat</button>
        </div>
      </div>
    </div>
  )
}
