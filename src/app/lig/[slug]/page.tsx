import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Trophy } from 'lucide-react'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

interface Standing { team_id: string; name: string; played: number; wins: number; draws: number; losses: number; gf: number; ga: number; gd: number; pts: number }
interface Match { id: string; home_team_id: string | null; away_team_id: string | null; home_score: number | null; away_score: number | null; status: string; scheduled_at: string | null; venue: string | null }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('tournaments').select('name').eq('slug', slug).eq('is_public', true).maybeSingle()
  return { title: data?.name || 'Turnuva' }
}

export default async function PublicTournamentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: t } = await supabase
    .from('tournaments')
    .select('id, name, format, starts_at, ends_at, is_public')
    .eq('slug', slug)
    .eq('is_public', true)
    .maybeSingle()

  if (!t) notFound()

  const [{ data: standings }, { data: matches }, { data: teams }] = await Promise.all([
    supabase.rpc('tournament_standings', { p_tournament_id: t.id }),
    supabase.from('matches').select('*').eq('tournament_id', t.id).order('scheduled_at', { nullsFirst: false }),
    supabase.from('tournament_teams').select('id, name').eq('tournament_id', t.id),
  ])

  const teamMap = new Map<string, string>((teams || []).map(x => [x.id, x.name]))

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '24px 16px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--grad)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Trophy size={26} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)' }}>{t.name}</h1>
            {t.starts_at && <div style={{ color: 'var(--text3)', fontSize: 13 }}>{new Date(t.starts_at).toLocaleDateString('tr-TR')} {t.ends_at ? '— ' + new Date(t.ends_at).toLocaleDateString('tr-TR') : ''}</div>}
          </div>
        </div>

        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>Puan Tablosu</h2>
        {((standings || []) as Standing[]).length === 0 ? (
          <div className="empty-state"><div className="empty-state-title">Henüz veri yok</div></div>
        ) : (
          <div className="card" style={{ marginBottom: 24, overflow: 'auto' }}>
            <table className="table">
              <thead><tr><th>#</th><th>Takım</th><th>O</th><th>G</th><th>B</th><th>M</th><th>A</th><th>Y</th><th>AV</th><th>P</th></tr></thead>
              <tbody>
                {((standings || []) as Standing[]).map((s, i) => (
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
        )}

        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>Fixtür</h2>
        {((matches || []) as Match[]).length === 0 ? (
          <div className="empty-state"><div className="empty-state-title">Henüz fixtür yok</div></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {((matches || []) as Match[]).map(m => (
              <div key={m.id} className="card" style={{ padding: 12, display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'center' }}>
                <div style={{ textAlign: 'right', fontWeight: 600 }}>{teamMap.get(m.home_team_id || '') || '-'}</div>
                <div style={{ textAlign: 'center', minWidth: 80 }}>
                  {m.status === 'finished' && m.home_score !== null && m.away_score !== null ? (
                    <div style={{ fontSize: 20, fontWeight: 800 }}>{m.home_score} - {m.away_score}</div>
                  ) : (
                    <div style={{ fontSize: 12, color: 'var(--text3)' }}>{m.scheduled_at ? new Date(m.scheduled_at).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'vs'}</div>
                  )}
                  {m.venue && <div style={{ fontSize: 10, color: 'var(--text3)' }}>{m.venue}</div>}
                </div>
                <div style={{ fontWeight: 600 }}>{teamMap.get(m.away_team_id || '') || '-'}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
