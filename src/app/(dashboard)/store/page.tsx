'use client'
import { useEffect, useState, useCallback } from 'react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import { Plus, Loader2, ShoppingBag, Trash2, Edit, Package, ClipboardList } from 'lucide-react'
import { toast } from 'sonner'
import { confirmDialog } from '@/components/ui/ConfirmDialog'
import { formatCurrency, formatDateTime } from '@/lib/utils/formatters'

interface Product {
  id: string
  name: string
  description?: string
  image_url?: string
  price: number
  stock: number
  sku?: string
  is_active: boolean
}

interface Order {
  id: string
  total_amount: number
  status: string
  created_at: string
  athlete?: { first_name: string; last_name: string }
  items?: { product_name: string; quantity: number; unit_price: number }[]
}

const ORDER_STATUS: Record<string, string> = {
  pending: 'Bekliyor', paid: 'Ödendi', preparing: 'Hazırlanıyor',
  shipped: 'Kargoda', delivered: 'Teslim Edildi', cancelled: 'İptal',
}

export default function StorePage() {
  const supabase = createClient()
  const [tab, setTab] = useState<'products' | 'orders'>('products')
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [showProductModal, setShowProductModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const orgId = user?.user_metadata?.organization_id
    const [{ data: p }, { data: o }] = await Promise.all([
      supabase.from('products').select('*').eq('organization_id', orgId).order('created_at', { ascending: false }),
      supabase.from('orders').select('*, athlete:athletes(first_name, last_name), items:order_items(product_name, quantity, unit_price)').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(100),
    ])
    setProducts((p || []) as Product[])
    setOrders((o || []) as Order[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  const deleteProduct = async (id: string) => {
    if (!await confirmDialog({ title: 'Ürün silinsin mi?', variant: 'danger', confirmText: 'Sil' })) return
    await supabase.from('products').delete().eq('id', id)
    fetchData()
  }

  const updateOrderStatus = async (id: string, status: string) => {
    await supabase.from('orders').update({ status }).eq('id', id)
    toast.success('Güncellendi'); fetchData()
  }

  return (
    <DashboardLayout title="Mağaza">
      <div className="page-header">
        <div><h1 className="page-title">Mağaza & Siparişler</h1><p className="page-subtitle">{products.length} ürün · {orders.length} sipariş</p></div>
        {tab === 'products' && (
          <button className="btn bp" onClick={() => { setEditingProduct(null); setShowProductModal(true) }}><Plus size={16} /> Yeni Ürün</button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: '1px solid var(--border)' }}>
        {([['products', 'Ürünler'], ['orders', 'Siparişler']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className="btn bs"
            style={{ borderRadius: 0, background: 'transparent', borderBottom: tab === key ? '2px solid var(--blue2)' : '2px solid transparent' }}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center' }}><Loader2 size={24} className="spin" /></div>
      ) : tab === 'products' ? (
        products.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon"><Package size={40} /></div><div className="empty-state-title">Henüz ürün yok</div></div>
        ) : (
          <div className="grid-3">
            {products.map(p => (
              <div key={p.id} className="card" style={{ padding: 14, opacity: p.is_active ? 1 : 0.5 }}>
                {p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image_url} alt={p.name} style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 6, marginBottom: 8 }} />
                ) : (
                  <div style={{ height: 140, background: 'var(--bg3)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                    <ShoppingBag size={32} color="var(--text3)" />
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 6 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)' }}>{p.sku || '-'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: 'var(--blue2)' }}>{formatCurrency(p.price)}</div>
                    <div style={{ fontSize: 11, color: p.stock > 0 ? 'var(--green, #22c55e)' : 'var(--red, #ef4444)' }}>
                      {p.stock > 0 ? `Stok: ${p.stock}` : 'Stokta yok'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn bs btn-xs" style={{ flex: 1 }} onClick={() => { setEditingProduct(p); setShowProductModal(true) }}><Edit size={11} /> Düzenle</button>
                  <button className="btn bd btn-xs" onClick={() => deleteProduct(p.id)}><Trash2 size={11} /></button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        orders.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon"><ClipboardList size={40} /></div><div className="empty-state-title">Sipariş yok</div></div>
        ) : (
          <div className="card">
            <table className="table">
              <thead><tr><th>Tarih</th><th>Sporcu</th><th>Ürünler</th><th>Toplam</th><th>Durum</th></tr></thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id}>
                    <td style={{ fontSize: 12 }}>{formatDateTime(o.created_at)}</td>
                    <td>{o.athlete?.first_name} {o.athlete?.last_name}</td>
                    <td style={{ fontSize: 12 }}>
                      {(o.items || []).map((i, k) => <div key={k}>{i.quantity}× {i.product_name}</div>)}
                    </td>
                    <td style={{ fontWeight: 700 }}>{formatCurrency(o.total_amount)}</td>
                    <td>
                      <select className="form-input" value={o.status} onChange={e => updateOrderStatus(o.id, e.target.value)} style={{ minWidth: 130 }}>
                        {Object.entries(ORDER_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {showProductModal && (
        <ProductModal product={editingProduct} onClose={() => setShowProductModal(false)} onSave={() => { setShowProductModal(false); fetchData() }} />
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .spin{animation:spin 1s linear infinite}`}</style>
    </DashboardLayout>
  )
}

function ProductModal({ product, onClose, onSave }: { product: Product | null; onClose: () => void; onSave: () => void }) {
  const supabase = createClient()
  const [form, setForm] = useState({
    name: product?.name || '',
    description: product?.description || '',
    image_url: product?.image_url || '',
    price: product?.price?.toString() || '',
    stock: product?.stock?.toString() || '0',
    sku: product?.sku || '',
    is_active: product?.is_active ?? true,
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!form.name.trim() || !form.price) { toast.error('İsim ve fiyat gerekli'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const orgId = user?.user_metadata?.organization_id
    const payload = {
      organization_id: orgId,
      name: form.name, description: form.description || null,
      image_url: form.image_url || null, sku: form.sku || null,
      price: parseFloat(form.price), stock: parseInt(form.stock, 10) || 0,
      is_active: form.is_active,
    }
    const { error } = product
      ? await supabase.from('products').update(payload).eq('id', product.id)
      : await supabase.from('products').insert(payload)
    setSaving(false)
    if (error) { toast.error('Hata: ' + error.message); return }
    toast.success(product ? 'Güncellendi' : 'Eklendi'); onSave()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h2 className="modal-title">{product ? 'Ürün Düzenle' : 'Yeni Ürün'}</h2></div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="form-group"><label className="form-label required">Ürün Adı</label><input className="form-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
          <div className="form-group"><label className="form-label">Açıklama</label><textarea className="form-input" rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
          <div className="form-group"><label className="form-label">Görsel URL</label><input className="form-input" value={form.image_url} onChange={e => setForm(p => ({ ...p, image_url: e.target.value }))} placeholder="https://..." /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div className="form-group"><label className="form-label required">Fiyat (₺)</label><input type="number" step="0.01" className="form-input" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Stok</label><input type="number" className="form-input" value={form.stock} onChange={e => setForm(p => ({ ...p, stock: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">SKU</label><input className="form-input" value={form.sku} onChange={e => setForm(p => ({ ...p, sku: e.target.value }))} /></div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} />
            Aktif (mağazada göster)
          </label>
        </div>
        <div className="modal-footer">
          <button className="btn bs" onClick={onClose}>İptal</button>
          <button className="btn bp" onClick={handleSave} disabled={saving}>{saving ? <Loader2 size={14} className="spin" /> : null} Kaydet</button>
        </div>
      </div>
    </div>
  )
}
