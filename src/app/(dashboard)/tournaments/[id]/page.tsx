'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import { Plus, Loader2, Trash2, Save, ArrowLeft, Trophy } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { formatDateTime } from '@/lib/utils/formatters'

interface Team { id: string; name: string; logo_url?: string }
interface Match {
  id: string
  home_team_id: string | null
  away_team_id: string | null
  scheduled_at: string | null
  venue: string | null
  home_score: number | null
  away_score: number | null
  status: string
}
interface Standing { team_id: string; name: string; played: number; wins: number; draws: number; losses: number; gf: number; ga: number; gd: number; pts: number }

export default function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()
  const [tournament, setTournament] = useState<{ id: string; name: string; slug: string; is_public: boolean } | null>(null)
  const [tab, setTab] = useState<'teams' | 'matches' | 'standings'>('matches')
  const [teams, setTeams] = useState<Team[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [standings, setStandings] = useState<Standing[]>([])
  const [loading, setLoading] = useState(true)
  const [newTeam, setNewTeam] = useState('')

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const [{ data: t }, { data: ts }, { data: ms }, { data: std }] = await Promise.all([
      supabase.from('tournaments').select('id, name, slug, is_public').eq('id', id).single(),
      supabase.from('tournament_teams').select('id, name, logo_url').eq('tournament_id', id).order('name'),
      supabase.from('matches').select('*').eq('tournament_id', id).order('scheduled_at', { nullsFirst: false }),
      supabase.rpc('tournament_standings', { p_tournament_id: id }),
    ])
    setTournament(t)
    setTeams((ts || []) as Team[])
    setMatches((ms || []) as Match[])
    setStandings((std || []) as Standing[])
    setLoading(false)
  }, [id, supabase])

  useEffect(() => { load() }, [load])

  const addTeam = async () => {
    if (!newTeam.trim()) return
    const { error } = await supabase.from('tournament_teams').insert({ tournament_id: id, name: newTeam })
    if (error) { toast.error(error.message); return }
    setNewTeam(''); load()
  }

  const deleteTeam = async (tid: string) => {
    if (!confirm('Takım silinsin mi?')) return
    await supabase.from('tournament_teams').delete().eq('id', tid)
    load()
  }

  const addMatch = async () => {
    if (teams.length < 2) { toast.error('En az 2 takım gerekli'); return }
    await supabase.from('matches').insert({
      tournament_id: id,
      home_team_id: teams[0].id, away_team_id: teams[1].id,
      scheduled_at: new Date().toISOString(),
    })
    load()
  }

  const updateMatch = async (m: Match) => {
    const { error } = await supabase.from('matches').update({
      home_team_id: m.home_team_id, away_team_id: m.away_team_id,
      home_score: m.home_score, away_score: m.away_score,
      status: m.status, scheduled_at: m.scheduled_at, venue: m.venue,
    }).eq('id', m.id)
    if (error) { toast.error(error.message); return }
    toast.success('Güncellendi'); load()
  }

  const deleteMatch = async (mid: string) => {
    if (!confirm('Maç silinsin mi?')) return
    await supabase.from('matches').delete().eq('id', mid)
    load()
  }

  if (loading) return <DashboardLayout title="Turnuva"><div style={{ padding: 48, textAlign: 'center' }}><Loader2 size={24} className="spin" /></div><style>{`@keyframes spin{to{transform:rotate(360deg)}} .spin{animation:spin 1s linear infinite}`}</style></DashboardLayout>
  if (!tournament) return <DashboardLayout title="Turnuva"><div className="empty-state"><div className="empty-state-title">Turnuva bulunamadı</div></div></DashboardLayout>

  return (
    <DashboardLayout title={tournament.name}>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/tournaments" className="btn bs btn-xs"><ArrowLeft size={14} /></Link>
          <div>
            <h1 className="page-title">{tournament.name}</h1>
            {tournament.is_public && <a href={`/lig/${tournament.slug}`} target="_blank" rel="noopener noreferrer" className="page-subtitle" style={{ color: 'var(--blue2)' }}>Halka açık: /lig/{tournament.slug}</a>}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: '1px solid var(--border)' }}>
        {([['matches', 'Maçlar'], ['teams', 'Takımlar'], ['standings', 'Puan Tablosu']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className="btn bs"
            style={{ borderRadius: 0, background: 'transparent', borderBottom: tab === key ? '2px solid var(--blue2)' : '2px solid transparent' }}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'teams' && (
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input className="form-input" value={newTeam} onChange={e => setNewTeam(e.target.value)} placeholder="Takım adı" style={{ flex: 1 }} />
            <button className="btn bp" onClick={addTeam}><Plus size={14} /> Ekle</button>
          </div>
          {teams.map(t => (
            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 8, borderBottom: '1px solid var(--border)' }}>
              <span>{t.name}</span>
              <button className="btn bd btn-xs" onClick={() => deleteTeam(t.id)}><Trash2 size={12} /></button>
            </div>
          ))}
        </div>
      )}

      {tab === 'matches' && (
        <>
          <button className="btn bp" onClick={addMatch} style={{ marginBottom: 12 }} disabled={teams.length < 2}>
            <Plus size={14} /> Yeni Maç
          </button>
          {matches.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon"><Trophy size={32} /></div><div className="empty-state-title">Henüz maç yok</div></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {matches.map(m => <MatchRow key={m.id} match={m} teams={teams} onSave={updateMatch} onDelete={() => deleteMatch(m.id)} />)}
            </div>
          )}
        </>
      )}

      {tab === 'standings' && (
        standings.length === 0 ? (
          <div className="empty-state"><div className="empty-state-title">Henüz tamamlanmış maç yok</div></div>
        ) : (
          <div className="card">
            <table className="table">
              <thead><tr><th>#</th><th>Takım</th><th>O</th><th>G</th><th>B</th><th>M</th><th>A</th><th>Y</th><th>AV</th><th>P</th></tr></thead>
              <tbody>
                {standings.map((s, i) => (
                  <tr key={s.team_id}>
                    <td>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td>{s.played}</td><td>{s.wins}</td><td>{s.draws}</td><td>{s.losses}</td>
                    <td>{s.gf}</td><td>{s.ga}</td><td>{s.gd}</td>
                    <td style={{ fontWeight: 700, color: 'var(--blue2)' }}>{s.pts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .spin{animation:spin 1s linear infinite}`}</style>
    </DashboardLayout>
  )
}

function MatchRow({ match, teams, onSave, onDelete }: { match: Match; teams: Team[]; onSave: (m: Match) => void; onDelete: () => void }) {
  const [local, setLocal] = useState(match)
  useEffect(() => setLocal(match), [match])

  return (
    <div className="card" style={{ padding: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 60px 30px 60px 2fr 90px 60px 60px', gap: 8, alignItems: 'center' }}>
        <select className="form-input" value={local.home_team_id || ''} onChange={e => setLocal(p => ({ ...p, home_team_id: e.target.value }))}>
          {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <input type="number" className="form-input" value={local.home_score ?? ''} onChange={e => setLocal(p => ({ ...p, home_score: e.target.value === '' ? null : Number(e.target.value) }))} placeholder="-" />
        <span style={{ textAlign: 'center' }}>vs</span>
        <input type="number" className="form-input" value={local.away_score ?? ''} onChange={e => setLocal(p => ({ ...p, away_score: e.target.value === '' ? null : Number(e.target.value) }))} placeholder="-" />
        <select className="form-input" value={local.away_team_id || ''} onChange={e => setLocal(p => ({ ...p, away_team_id: e.target.value }))}>
          {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select className="form-input" value={local.status} onChange={e => setLocal(p => ({ ...p, status: e.target.value }))}>
          <option value="scheduled">Plan</option>
          <option value="in_progress">Devam</option>
          <option value="finished">Bitti</option>
          <option value="cancelled">İptal</option>
        </select>
        <button className="btn bp btn-xs" onClick={() => onSave(local)}><Save size={12} /></button>
        <button className="btn bd btn-xs" onClick={onDelete}><Trash2 size={12} /></button>
      </div>
      {match.scheduled_at && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{formatDateTime(match.scheduled_at)}</div>}
    </div>
  )
}
