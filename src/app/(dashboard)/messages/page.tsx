'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import { Send, MessageSquare, Users } from 'lucide-react'
import { getInitials } from '@/lib/utils/formatters'

interface MsgRecord {
  id: string
  sender_id: string
  sender_name: string
  sender_role: string
  receiver_id: string
  receiver_name: string | null
  subject: string | null
  content: string
  is_read: boolean
  created_at: string
}

interface Thread {
  partnerId: string
  partnerName: string
  partnerRole: string
  lastMsg: string
  lastAt: string
  unread: number
  messages: MsgRecord[]
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'az önce'
  if (m < 60) return `${m}dk`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}s`
  return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
}

export default function MessagesPage() {
  const supabase = createClient()
  const [adminId, setAdminId] = useState<string | null>(null)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [threads, setThreads] = useState<Thread[]>([])
  const [selected, setSelected] = useState<Thread | null>(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  const loadThreads = useCallback(async (currentAdminId: string, currentOrgId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('organization_id', currentOrgId)
      .order('created_at', { ascending: true })

    if (!data) { setLoading(false); return }

    // Group into threads by conversation partner
    const threadMap = new Map<string, Thread>()

    data.forEach((m: MsgRecord) => {
      const isFromMe = m.sender_id === currentAdminId
      const partnerId = isFromMe ? m.receiver_id : m.sender_id
      const partnerName = isFromMe ? (m.receiver_name || 'Bilinmiyor') : (m.sender_name || 'Bilinmiyor')
      const partnerRole = isFromMe ? '' : m.sender_role

      if (!threadMap.has(partnerId)) {
        threadMap.set(partnerId, {
          partnerId,
          partnerName,
          partnerRole,
          lastMsg: m.content,
          lastAt: m.created_at,
          unread: 0,
          messages: [],
        })
      }
      const t = threadMap.get(partnerId)!
      t.messages.push(m)
      t.lastMsg = m.content
      t.lastAt = m.created_at
      if (!isFromMe && !m.is_read) t.unread++
    })

    const sorted = Array.from(threadMap.values())
      .sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime())

    setThreads(sorted)

    // Update selected if open
    setSelected(prev => {
      if (!prev) return null
      return sorted.find(t => t.partnerId === prev.partnerId) || null
    })

    setLoading(false)
  }, [supabase])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const oid = user.user_metadata?.organization_id
      setAdminId(user.id)
      setOrgId(oid)
      await loadThreads(user.id, oid)

      // Realtime
      supabase.channel('messages_admin')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `organization_id=eq.${oid}` },
          () => loadThreads(user.id, oid))
        .subscribe()
    }
    init()
  }, [supabase, loadThreads])

  useEffect(() => {
    if (!selected || !adminId) return
    // Mark as read
    const unreadIds = selected.messages.filter(m => m.sender_id !== adminId && !m.is_read).map(m => m.id)
    if (unreadIds.length) {
      supabase.from('messages').update({ is_read: true }).in('id', unreadIds).then(() => {
        if (orgId && adminId) loadThreads(adminId, orgId)
      })
    }
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80)
  }, [selected, adminId, orgId, supabase, loadThreads])

  const sendMsg = async () => {
    if (!text.trim() || !selected || !adminId || !orgId || sending) return
    setSending(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('messages').insert({
      organization_id: orgId,
      sender_id: adminId,
      sender_name: user?.user_metadata?.full_name || 'Admin',
      sender_role: 'admin',
      receiver_id: selected.partnerId,
      content: text.trim(),
      is_read: false,
    })
    setSending(false)
    if (!error) {
      setText('')
      if (orgId && adminId) loadThreads(adminId, orgId)
    }
  }

  const filtered = threads.filter(t =>
    !search || t.partnerName.toLowerCase().includes(search.toLowerCase())
  )

  const ROLE_LABEL: Record<string, string> = {
    athlete: 'Sporcu', parent: 'Veli', coach: 'Antrenör', admin: 'Admin', '': 'Kullanıcı'
  }

  return (
    <DashboardLayout title="Mesajlar">
      <div style={{ height: 'calc(100vh - 120px)', display: 'flex', gap: '16px' }}>

        {/* Thread list */}
        <div style={{ width: '280px', flexShrink: 0, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '12px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '10px' }}>
              Konuşmalar
              {threads.some(t => t.unread > 0) && (
                <span style={{ marginLeft: '8px', background: 'var(--blue2)', color: '#fff', borderRadius: '10px', padding: '1px 7px', fontSize: '11px' }}>
                  {threads.reduce((s, t) => s + t.unread, 0)}
                </span>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <input
                className="form-input"
                placeholder="Ara..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ fontSize: '13px', padding: '7px 10px' }}
              />
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>Yükleniyor...</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text3)' }}>
                <Users size={28} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
                <div style={{ fontSize: '13px' }}>Konuşma bulunamadı</div>
              </div>
            ) : filtered.map(t => (
              <button key={t.partnerId}
                onClick={() => setSelected(t)}
                style={{
                  width: '100%', padding: '12px', textAlign: 'left', border: 'none',
                  borderBottom: '1px solid var(--border)', cursor: 'pointer',
                  background: selected?.partnerId === t.partnerId ? 'rgba(45,92,179,0.08)' : 'transparent',
                  display: 'flex', gap: '10px', alignItems: 'flex-start', transition: 'background 0.15s',
                }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--grad)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, flexShrink: 0 }}>
                  {getInitials(t.partnerName)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '4px', marginBottom: '2px' }}>
                    <span style={{ fontWeight: t.unread > 0 ? 700 : 500, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.partnerName}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text3)', flexShrink: 0 }}>{timeAgo(t.lastAt)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{t.lastMsg}</span>
                    {t.unread > 0 && <span style={{ background: 'var(--blue2)', color: '#fff', borderRadius: '50%', width: '18px', height: '18px', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{t.unread}</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat area */}
        {selected ? (
          <div style={{ flex: 1, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--grad)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700 }}>
                {getInitials(selected.partnerName)}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px' }}>{selected.partnerName}</div>
                <div style={{ fontSize: '12px', color: 'var(--text3)' }}>{ROLE_LABEL[selected.partnerRole] || 'Kullanıcı'}</div>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {selected.messages.map(m => {
                const isMe = m.sender_id === adminId
                return (
                  <div key={m.id} style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: '8px', alignItems: 'flex-end' }}>
                    {!isMe && (
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg4)', color: 'var(--text2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>
                        {getInitials(m.sender_name || '?')}
                      </div>
                    )}
                    <div style={{ maxWidth: '65%' }}>
                      {m.subject && !isMe && (
                        <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '3px', fontWeight: 600 }}>{m.subject}</div>
                      )}
                      <div style={{
                        padding: '9px 13px',
                        borderRadius: isMe ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                        background: isMe ? 'var(--grad)' : 'var(--bg3)',
                        color: isMe ? '#fff' : 'var(--text)',
                        border: isMe ? 'none' : '1px solid var(--border)',
                        fontSize: '13.5px', lineHeight: 1.5,
                      }}>
                        {m.content}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '3px', textAlign: isMe ? 'right' : 'left' }}>
                        {new Date(m.created_at).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px' }}>
              <input
                className="form-input"
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMsg())}
                placeholder="Mesaj yazın..."
                style={{ flex: 1 }}
              />
              <button onClick={sendMsg} disabled={sending || !text.trim()} className="btn bp" style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '14px', paddingRight: '14px' }}>
                <Send size={15} />
              </button>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)' }}>
            <MessageSquare size={40} style={{ marginBottom: '12px', opacity: 0.25 }} />
            <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text2)', marginBottom: '4px' }}>Konuşma Seçin</div>
            <div style={{ fontSize: '13px' }}>Soldaki listeden bir konuşma seçin</div>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 640px) {
          .msg-layout { flex-direction: column !important; }
          .msg-threads { width: 100% !important; }
        }
      `}</style>
    </DashboardLayout>
  )
}
