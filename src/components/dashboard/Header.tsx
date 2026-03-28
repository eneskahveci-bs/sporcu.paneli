'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, Bell, Menu, X, CreditCard, AlertTriangle, UserPlus, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils/formatters'

interface HeaderProps {
  title?: string
}

type NotifType = 'payment_approval' | 'overdue' | 'pre_registration'

interface Notif {
  id: string
  type: NotifType
  title: string
  body: string
  href: string
  time: string
}

const SEEN_KEY = 'notif_seen'

function getSeenIds(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')) } catch { return new Set() }
}

function addSeenIds(ids: string[]) {
  try {
    const existing = getSeenIds()
    ids.forEach(id => existing.add(id))
    localStorage.setItem(SEEN_KEY, JSON.stringify([...existing]))
  } catch { /* ignore */ }
}

export function Header({ title }: HeaderProps) {
  const supabase = createClient()
  const [menuOpen, setMenuOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set())
  const loadedRef = useRef(false)

  const loadNotifs = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const orgId = user?.user_metadata?.organization_id
    if (!orgId) return

    const today = new Date().toISOString().slice(0, 10)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

    const [{ data: approvals }, { data: overdues }, { data: preRegs }] = await Promise.all([
      // Veli ödeme bildirimleri
      supabase.from('payments')
        .select('id, athlete_name, amount, created_at')
        .eq('organization_id', orgId)
        .eq('notification_status', 'pending_approval')
        .order('created_at', { ascending: false })
        .limit(10),

      // Gecikmiş ödemeler (son 30 gün içinde vadesi geçmiş)
      supabase.from('payments')
        .select('id, athlete_name, amount, due_date')
        .eq('organization_id', orgId)
        .eq('status', 'overdue')
        .gte('due_date', thirtyDaysAgo)
        .lte('due_date', today)
        .order('due_date', { ascending: false })
        .limit(5),

      // Yeni ön kayıtlar (son 7 gün)
      supabase.from('pre_registrations')
        .select('id, first_name, last_name, created_at')
        .eq('organization_id', orgId)
        .eq('status', 'pending')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(5),
    ])

    const result: Notif[] = []

    ;(approvals || []).forEach(p => result.push({
      id: `approval_${p.id}`,
      type: 'payment_approval',
      title: 'Ödeme Bildirimi',
      body: `${p.athlete_name} — ${Number(p.amount).toLocaleString('tr-TR')} ₺`,
      href: '/payments',
      time: p.created_at,
    }))

    ;(overdues || []).forEach(p => result.push({
      id: `overdue_${p.id}`,
      type: 'overdue',
      title: 'Gecikmiş Ödeme',
      body: `${p.athlete_name} — ${Number(p.amount).toLocaleString('tr-TR')} ₺ (${formatDate(p.due_date)})`,
      href: '/payments',
      time: p.due_date + 'T00:00:00',
    }))

    ;(preRegs || []).forEach(r => result.push({
      id: `prereg_${r.id}`,
      type: 'pre_registration',
      title: 'Yeni Ön Kayıt',
      body: `${r.first_name} ${r.last_name} başvuru yaptı`,
      href: '/pre-registrations',
      time: r.created_at,
    }))

    // Sort by time desc
    result.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())

    setNotifs(result)
    setSeenIds(getSeenIds())
  }, [supabase])

  useEffect(() => {
    if (loadedRef.current) return
    loadedRef.current = true
    loadNotifs()

    // Realtime: payments (new approvals) + pre_registrations (new pending)
    const channel = supabase.channel('admin_notifs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments', filter: 'notification_status=eq.pending_approval' }, () => loadNotifs())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pre_registrations' }, () => loadNotifs())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'payments', filter: 'status=eq.overdue' }, () => loadNotifs())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase, loadNotifs])

  const unreadCount = notifs.filter(n => !seenIds.has(n.id)).length

  const openPanel = () => {
    setNotifOpen(o => !o)
  }

  const markAllSeen = () => {
    const ids = notifs.map(n => n.id)
    addSeenIds(ids)
    setSeenIds(new Set(ids))
  }

  const NOTIF_ICON: Record<NotifType, React.ReactNode> = {
    payment_approval: <CreditCard size={14} />,
    overdue: <AlertTriangle size={14} />,
    pre_registration: <UserPlus size={14} />,
  }

  const NOTIF_COLOR: Record<NotifType, string> = {
    payment_approval: 'var(--blue2)',
    overdue: 'var(--red)',
    pre_registration: 'var(--green)',
  }

  const NOTIF_BG: Record<NotifType, string> = {
    payment_approval: 'rgba(45,92,179,0.12)',
    overdue: 'rgba(239,68,68,0.1)',
    pre_registration: 'rgba(34,197,94,0.1)',
  }

  return (
    <>
      <header className="header">
        <button
          className="header-btn"
          style={{ display: 'none' }}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menüyü aç/kapat"
          id="mobile-menu-btn"
        >
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>

        {title && (
          <h1 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap' }}>
            {title}
          </h1>
        )}

        <div className="header-search">
          <Search className="header-search-icon" />
          <input
            type="search"
            placeholder="Ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Ara"
          />
        </div>

        <div className="header-actions" style={{ position: 'relative' }}>
          <button className="header-btn" aria-label="Bildirimler" onClick={openPanel} style={{ position: 'relative' }}>
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="header-badge" style={{ animation: 'pulse 2s infinite' }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 39 }} onClick={() => setNotifOpen(false)} />
              <div style={{
                position: 'absolute', top: '44px', right: 0, width: '340px',
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: '14px', boxShadow: 'var(--shadow)', zIndex: 40, overflow: 'hidden',
              }}>
                {/* Panel header */}
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontWeight: 700, fontSize: '14px' }}>
                    Bildirimler
                    {unreadCount > 0 && (
                      <span style={{ marginLeft: '8px', background: 'var(--blue2)', color: '#fff', borderRadius: '10px', padding: '1px 7px', fontSize: '11px' }}>
                        {unreadCount} yeni
                      </span>
                    )}
                  </div>
                  {notifs.length > 0 && unreadCount > 0 && (
                    <button onClick={markAllSeen} style={{ background: 'none', border: 'none', fontSize: '12px', color: 'var(--blue2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle size={12} /> Tümünü Okundu
                    </button>
                  )}
                </div>

                {/* Notif list */}
                {notifs.length === 0 ? (
                  <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>
                    <Bell size={28} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
                    <div>Yeni bildirim yok</div>
                  </div>
                ) : (
                  <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
                    {notifs.map(n => {
                      const isUnread = !seenIds.has(n.id)
                      return (
                        <a key={n.id} href={n.href}
                          onClick={() => { addSeenIds([n.id]); setSeenIds(s => new Set([...s, n.id])); setNotifOpen(false) }}
                          style={{
                            display: 'flex', alignItems: 'flex-start', gap: '10px',
                            padding: '11px 16px', borderBottom: '1px solid var(--border)',
                            textDecoration: 'none', color: 'var(--text)',
                            background: isUnread ? 'rgba(45,92,179,0.04)' : 'transparent',
                            transition: 'background 0.15s',
                          }}>
                          <div style={{
                            width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                            background: NOTIF_BG[n.type], color: NOTIF_COLOR[n.type],
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {NOTIF_ICON[n.type]}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                              {isUnread && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--blue2)', flexShrink: 0 }} />}
                              <span style={{ fontWeight: isUnread ? 700 : 500, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</span>
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.body}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '3px' }}>
                              {new Date(n.time).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </a>
                      )
                    })}
                  </div>
                )}

                {/* Footer */}
                {notifs.length > 0 && (
                  <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text3)' }}>{notifs.length} bildirim</span>
                    <a href="/payments" onClick={() => setNotifOpen(false)} style={{ fontSize: '12px', color: 'var(--blue2)', textDecoration: 'none' }}>
                      Ödemelere git →
                    </a>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </header>

      {menuOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 35, display: 'none' }}
          onClick={() => setMenuOpen(false)}
        />
      )}

      <style>{`
        @media (max-width: 768px) {
          #mobile-menu-btn { display: flex !important; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </>
  )
}
