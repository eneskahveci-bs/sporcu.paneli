'use client'
import { useEffect, useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ArrowRight, Command, X } from 'lucide-react'

interface CommandItem {
  id: string
  label: string
  hint?: string
  href?: string
  action?: () => void
  group?: string
  keywords?: string
  icon?: React.ReactNode
}

const COMMANDS: CommandItem[] = [
  // Akademi
  { id: 'athletes', label: 'Sporcular', href: '/athletes', group: 'Akademi', keywords: 'sporcu athlete oyuncu', icon: '👥' },
  { id: 'pre-registrations', label: 'Ön Kayıtlar', href: '/pre-registrations', group: 'Akademi', keywords: 'on kayit pre registration', icon: '📝' },
  { id: 'coaches', label: 'Antrenörler', href: '/coaches', group: 'Akademi', keywords: 'antrenor coach hoca', icon: '🎓' },
  { id: 'sports', label: 'Spor Dalları', href: '/sports', group: 'Akademi', keywords: 'spor branş sport', icon: '⚽' },
  { id: 'classes', label: 'Sınıflar', href: '/classes', group: 'Akademi', keywords: 'sinif class group', icon: '📚' },
  { id: 'attendance', label: 'Devam Yoklama', href: '/attendance', group: 'Akademi', keywords: 'devam yoklama attendance', icon: '✓' },
  { id: 'branches', label: 'Şubeler', href: '/branches', group: 'Akademi', keywords: 'sube branch', icon: '🏢' },
  { id: 'fitness', label: 'Fitness Testleri', href: '/fitness', group: 'Akademi', keywords: 'fitness test performans', icon: '💪' },
  { id: 'consent-forms', label: 'Onay Formları', href: '/consent-forms', group: 'Akademi', keywords: 'onay form imza consent', icon: '✍️' },
  { id: 'leaderboard', label: 'Liderlik Tablosu', href: '/leaderboard', group: 'Akademi', keywords: 'lider streak sıralama', icon: '🏆' },

  // Muhasebe
  { id: 'payments', label: 'Ödemeler', href: '/payments', group: 'Muhasebe', keywords: 'odeme payment aidat', icon: '💳' },
  { id: 'expenses', label: 'Giderler', href: '/expenses', group: 'Muhasebe', keywords: 'gider expense masraf harcama', icon: '🧾' },
  { id: 'accounts', label: 'Kasa & Banka', href: '/accounts', group: 'Muhasebe', keywords: 'kasa banka hesap nakit bakiye', icon: '💰' },
  { id: 'suppliers', label: 'Tedarikçiler', href: '/suppliers', group: 'Muhasebe', keywords: 'tedarikci cari supplier firma', icon: '🚚' },
  { id: 'invoices', label: 'Faturalar', href: '/invoices', group: 'Muhasebe', keywords: 'fatura makbuz invoice kdv', icon: '📄' },
  { id: 'discounts', label: 'İndirim / Burs', href: '/discounts', group: 'Muhasebe', keywords: 'indirim burs kardes', icon: '%' },
  { id: 'reminders', label: 'Hatırlatmalar', href: '/reminders', group: 'Muhasebe', keywords: 'hatirlatma reminder tahsilat gecikme', icon: '🔔' },

  // Finans & Rapor
  { id: 'finance', label: 'Finansal Raporlar', href: '/finance', group: 'Finans & Rapor', keywords: 'finans rapor gelir tablosu nakit akis yaslandirma tahsilat', icon: '📊' },
  { id: 'budget', label: 'Bütçe', href: '/budget', group: 'Finans & Rapor', keywords: 'butce budget hedef plan', icon: '🎯' },
  { id: 'reconciliation', label: 'Banka Mutabakatı', href: '/reconciliation', group: 'Finans & Rapor', keywords: 'mutabakat banka ekstre eslestirme', icon: '🧮' },
  { id: 'reports', label: 'Özet Rapor', href: '/reports', group: 'Finans & Rapor', keywords: 'rapor ozet report', icon: '🐷' },
  { id: 'inventory', label: 'Envanter', href: '/inventory', group: 'Sistem', keywords: 'envanter inventory stok', icon: '📦' },
  { id: 'store', label: 'Mağaza', href: '/store', group: 'İçerik', keywords: 'magaza store shop', icon: '🛒' },

  // İletişim
  { id: 'messages', label: 'Mesajlar', href: '/messages', group: 'İletişim', keywords: 'mesaj message', icon: '💬' },
  { id: 'sms', label: 'SMS Bildirimleri', href: '/sms', group: 'İletişim', keywords: 'sms bildirim', icon: '📱' },
  { id: 'notifications', label: 'Push Bildirimleri', href: '/notifications', group: 'İletişim', keywords: 'push bildirim notification', icon: '🔔' },

  // İçerik
  { id: 'tournaments', label: 'Turnuvalar', href: '/tournaments', group: 'İçerik', keywords: 'turnuva lig tournament', icon: '🏅' },
  { id: 'videos', label: 'Videolar', href: '/videos', group: 'İçerik', keywords: 'video', icon: '🎥' },
  { id: 'sponsors', label: 'Sponsorlar', href: '/sponsors', group: 'İçerik', keywords: 'sponsor', icon: '⭐' },

  // Sistem
  { id: 'calendar', label: 'Takvim', href: '/calendar', group: 'Sistem', keywords: 'takvim calendar', icon: '📅' },
  { id: 'dashboard', label: 'Ana Sayfa', href: '/dashboard', group: 'Sistem', keywords: 'dashboard ana sayfa anasayfa home', icon: '🏠' },
  { id: 'settings', label: 'Ayarlar', href: '/settings', group: 'Sistem', keywords: 'ayar settings', icon: '⚙️' },
  { id: 'profile', label: 'Profilim', href: '/profile', group: 'Sistem', keywords: 'profil profile hesap', icon: '👤' },

  // Hızlı işlemler
  { id: 'new-athlete', label: 'Yeni Sporcu Ekle', href: '/athletes?action=new', group: 'Hızlı', keywords: 'yeni sporcu ekle add new', icon: '➕' },
  { id: 'new-payment', label: 'Yeni Ödeme Ekle', href: '/payments?action=new', group: 'Hızlı', keywords: 'yeni odeme ekle', icon: '➕' },
  { id: 'attendance-today', label: 'Bugünün Yoklamasını Al', href: '/attendance', group: 'Hızlı', keywords: 'bugun yoklama', icon: '✓' },
]

function normalize(s: string): string {
  return s.toLowerCase()
    .replace(/ç/g,'c').replace(/ğ/g,'g').replace(/ı/g,'i').replace(/ö/g,'o').replace(/ş/g,'s').replace(/ü/g,'u')
}

export function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Cmd+K / Ctrl+K kısayolu
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIdx(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  const filtered = useMemo(() => {
    if (!query.trim()) return COMMANDS
    const q = normalize(query)
    return COMMANDS.filter(c =>
      normalize(c.label).includes(q) ||
      (c.keywords && normalize(c.keywords).includes(q)) ||
      (c.group && normalize(c.group).includes(q))
    )
  }, [query])

  const grouped = useMemo(() => {
    const out: Record<string, CommandItem[]> = {}
    filtered.forEach(c => {
      const g = c.group || 'Diğer'
      if (!out[g]) out[g] = []
      out[g].push(c)
    })
    return out
  }, [filtered])

  const runItem = (item: CommandItem) => {
    setOpen(false)
    if (item.href) router.push(item.href)
    else if (item.action) item.action()
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setOpen(false); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, filtered.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter') {
      e.preventDefault()
      const item = filtered[activeIdx]
      if (item) runItem(item)
    }
  }

  useEffect(() => {
    const active = listRef.current?.querySelector('[data-active="true"]')
    active?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

  if (!open) return null

  let runIdx = -1

  return (
    <div
      onClick={() => setOpen(false)}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: 'min(15vh, 100px)',
        animation: 'cmdkFade 0.14s ease-out',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        onKeyDown={onKey}
        role="dialog"
        aria-modal="true"
        aria-label="Komut Paleti"
        style={{
          width: 'min(560px, calc(100vw - 24px))',
          maxHeight: '70vh',
          background: 'var(--bg2)',
          border: '1px solid var(--border2)',
          borderRadius: 14,
          boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'cmdkSlide 0.18s cubic-bezier(0.32,0.72,0,1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <Search size={16} color="var(--text3)" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setActiveIdx(0) }}
            placeholder="Sayfa, komut veya işlem ara..."
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--text)', fontSize: 15,
            }}
            aria-label="Komut ara"
          />
          <kbd style={{
            fontSize: 11, color: 'var(--text3)', padding: '2px 6px',
            background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 4,
          }}>ESC</kbd>
        </div>

        <div ref={listRef} style={{ overflowY: 'auto', padding: 6 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
              Sonuç bulunamadı
            </div>
          ) : (
            Object.entries(grouped).map(([group, items]) => (
              <div key={group} style={{ marginBottom: 4 }}>
                <div style={{ fontSize: 10, color: 'var(--text3)', padding: '8px 10px 4px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {group}
                </div>
                {items.map(item => {
                  runIdx++
                  const active = runIdx === activeIdx
                  return (
                    <button
                      key={item.id}
                      data-active={active}
                      onMouseEnter={() => setActiveIdx(runIdx)}
                      onClick={() => runItem(item)}
                      style={{
                        width: '100%',
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 12px',
                        borderRadius: 8,
                        background: active ? 'var(--bg3)' : 'transparent',
                        border: 'none',
                        color: 'var(--text)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontSize: 13.5,
                        transition: 'background 0.1s',
                      }}
                    >
                      <span style={{ fontSize: 16 }}>{item.icon || '•'}</span>
                      <span style={{ flex: 1 }}>{item.label}</span>
                      {item.hint && <span style={{ fontSize: 11, color: 'var(--text3)' }}>{item.hint}</span>}
                      {active && <ArrowRight size={13} color="var(--text3)" />}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>

        <div style={{
          padding: '10px 14px', borderTop: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontSize: 11, color: 'var(--text3)',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <kbd style={kbdStyle}>↑</kbd><kbd style={kbdStyle}>↓</kbd> gezin
            <kbd style={kbdStyle}>↵</kbd> seç
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Command size={11} /> + K her zaman aç
          </span>
        </div>
      </div>
      <style>{`
        @keyframes cmdkFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes cmdkSlide { from { opacity: 0; transform: translateY(-8px) } to { opacity: 1; transform: translateY(0) } }
        kbd { font-family: -apple-system, BlinkMacSystemFont, 'SF Mono', monospace; }
      `}</style>
    </div>
  )
}

const kbdStyle: React.CSSProperties = {
  fontSize: 10,
  padding: '1px 5px',
  background: 'var(--bg3)',
  border: '1px solid var(--border)',
  borderRadius: 3,
  marginRight: 2,
}
