'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import { Send, Search, User } from 'lucide-react'
import { formatDateTime, getInitials } from '@/lib/utils/formatters'

interface Conversation {
  id: string
  athlete_id: string
  athlete_name: string
  last_message: string
  last_message_at: string
  unread_count: number
}

interface Message {
  id: string
  content: string
  sender_type: 'admin' | 'athlete'
  sender_name: string
  created_at: string
  read_at: string | null
}

export default function MessagesPage() {
  const supabase = createClient()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  const loadConversations = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('messages')
      .select('id, athlete_id, content, sender_type, created_at, read_at, athletes(first_name, last_name)')
      .order('created_at', { ascending: false })

    if (data) {
      const convMap = new Map<string, Conversation>()
      data.forEach((m: {
        id: string;
        athlete_id: string;
        content: string;
        sender_type: string;
        created_at: string;
        read_at: string | null;
        athletes: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null;
      }) => {
        const athleteRec = Array.isArray(m.athletes) ? m.athletes[0] : m.athletes
        if (!convMap.has(m.athlete_id)) {
          convMap.set(m.athlete_id, {
            id: m.athlete_id,
            athlete_id: m.athlete_id,
            athlete_name: athleteRec ? `${athleteRec.first_name} ${athleteRec.last_name}` : 'Bilinmiyor',
            last_message: m.content,
            last_message_at: m.created_at,
            unread_count: (!m.read_at && m.sender_type === 'athlete') ? 1 : 0,
          })
        } else {
          const conv = convMap.get(m.athlete_id)!
          if (!m.read_at && m.sender_type === 'athlete') conv.unread_count++
        }
      })
      setConversations(Array.from(convMap.values()))
    }
    setLoading(false)
  }, [supabase])

  const loadMessages = useCallback(async (athleteId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('id, content, sender_type, sender_name, created_at, read_at')
      .eq('athlete_id', athleteId)
      .order('created_at', { ascending: true })

    setMessages(data || [])

    // Mark as read
    await supabase.from('messages').update({ read_at: new Date().toISOString() })
      .eq('athlete_id', athleteId)
      .eq('sender_type', 'athlete')
      .is('read_at', null)

    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }, [supabase])

  useEffect(() => { loadConversations() }, [loadConversations])

  useEffect(() => {
    if (!selectedConv) return

    loadMessages(selectedConv.athlete_id)

    const channel = supabase.channel(`messages:${selectedConv.athlete_id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `athlete_id=eq.${selectedConv.athlete_id}`,
      }, () => {
        loadMessages(selectedConv.athlete_id)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [selectedConv, supabase, loadMessages])

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConv || sending) return
    setSending(true)
    const { error } = await supabase.from('messages').insert({
      athlete_id: selectedConv.athlete_id,
      content: newMessage.trim(),
      sender_type: 'admin',
      sender_name: 'Akademi',
    })
    if (!error) {
      setNewMessage('')
      loadMessages(selectedConv.athlete_id)
    }
    setSending(false)
  }

  const filteredConversations = conversations.filter(c =>
    c.athlete_name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <DashboardLayout>
      <div className="page-container" style={{ padding: 0, height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1.5rem 1.5rem 0', flexShrink: 0 }}>
          <h1 className="page-title">Mesajlar</h1>
          <p className="page-subtitle" style={{ marginBottom: '1rem' }}>Sporcular ve velilerle yazışın</p>
        </div>

        <div style={{ flex: 1, display: 'flex', gap: 0, overflow: 'hidden', margin: '0 1.5rem 1.5rem', border: '1px solid var(--border-color)', borderRadius: '0.75rem', background: 'var(--bg-secondary)' }}>
          {/* Sidebar */}
          <div style={{ width: '280px', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ position: 'relative' }}>
                <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  className="form-input"
                  placeholder="Konuşma ara..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ paddingLeft: '2.25rem', fontSize: '0.875rem' }}
                />
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {loading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Yükleniyor...</div>
              ) : filteredConversations.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  <User size={24} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} />
                  <div>Konuşma bulunamadı</div>
                </div>
              ) : filteredConversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConv(conv)}
                  style={{
                    width: '100%',
                    padding: '0.875rem 1rem',
                    textAlign: 'left',
                    background: selectedConv?.id === conv.id ? 'var(--accent-light, rgba(59,130,246,0.08))' : 'transparent',
                    border: 'none',
                    borderBottom: '1px solid var(--border-color)',
                    cursor: 'pointer',
                    display: 'flex',
                    gap: '0.75rem',
                    alignItems: 'flex-start',
                    transition: 'background 0.15s',
                  }}
                >
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 700, flexShrink: 0 }}>
                    {getInitials(conv.athlete_name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.125rem' }}>
                      <span style={{ fontWeight: conv.unread_count > 0 ? 700 : 500, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conv.athlete_name}</span>
                      {conv.unread_count > 0 && (
                        <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: '2rem', fontSize: '0.6875rem', fontWeight: 700, padding: '0.125rem 0.5rem', flexShrink: 0 }}>{conv.unread_count}</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conv.last_message}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Chat Area */}
          {selectedConv ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8125rem', fontWeight: 700 }}>
                  {getInitials(selectedConv.athlete_name)}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{selectedConv.athlete_name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sporcu</div>
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {messages.map(msg => (
                  <div key={msg.id} style={{ display: 'flex', flexDirection: msg.sender_type === 'admin' ? 'row-reverse' : 'row', gap: '0.5rem', alignItems: 'flex-end' }}>
                    {msg.sender_type === 'athlete' && (
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-tertiary, var(--border-color))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6875rem', fontWeight: 700, flexShrink: 0 }}>
                        {getInitials(selectedConv.athlete_name)}
                      </div>
                    )}
                    <div style={{
                      maxWidth: '65%',
                      padding: '0.625rem 0.875rem',
                      borderRadius: msg.sender_type === 'admin' ? '1rem 1rem 0.25rem 1rem' : '1rem 1rem 1rem 0.25rem',
                      background: msg.sender_type === 'admin' ? 'var(--accent)' : 'var(--bg-primary)',
                      color: msg.sender_type === 'admin' ? '#fff' : 'var(--text-primary)',
                      border: msg.sender_type === 'athlete' ? '1px solid var(--border-color)' : 'none',
                    }}>
                      <div style={{ fontSize: '0.875rem', lineHeight: 1.5 }}>{msg.content}</div>
                      <div style={{ fontSize: '0.6875rem', opacity: 0.7, marginTop: '0.25rem', textAlign: msg.sender_type === 'admin' ? 'right' : 'left' }}>
                        {formatDateTime(msg.created_at)}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
                <input
                  className="form-input"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
                  placeholder="Mesaj yazın..."
                  style={{ flex: 1 }}
                />
                <button onClick={sendMessage} disabled={sending || !newMessage.trim()} className="btn bs" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', paddingLeft: '1rem', paddingRight: '1rem' }}>
                  <Send size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💬</div>
              <div style={{ fontWeight: 600, marginBottom: '0.375rem' }}>Konuşma Seçin</div>
              <div style={{ fontSize: '0.875rem' }}>Soldaki listeden bir sporcu seçin</div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
