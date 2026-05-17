'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import { Plus, Loader2, Video as VideoIcon, Trash2, Upload, Play } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils/formatters'

interface Video {
  id: string
  title: string
  description?: string
  storage_path: string
  duration_sec?: number
  size_bytes?: number
  visibility: string
  created_at: string
  signedUrl?: string
}

const MAX_SIZE = 100 * 1024 * 1024

export default function VideosPage() {
  const supabase = createClient()
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [orgId, setOrgId] = useState('')
  const [playingUrl, setPlayingUrl] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const oid = user?.user_metadata?.organization_id
    setOrgId(oid)
    const { data } = await supabase.from('videos').select('*').eq('organization_id', oid).order('created_at', { ascending: false })

    const withUrls = await Promise.all(
      (data || []).map(async (v) => {
        const { data: signed } = await supabase.storage.from('videos').createSignedUrl(v.storage_path, 3600)
        return { ...v, signedUrl: signed?.signedUrl }
      })
    )
    setVideos(withUrls as Video[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  const handleDelete = async (v: Video) => {
    if (!confirm('Video silinsin mi?')) return
    await supabase.storage.from('videos').remove([v.storage_path])
    await supabase.from('videos').delete().eq('id', v.id)
    toast.success('Silindi'); fetchData()
  }

  return (
    <DashboardLayout title="Videolar">
      <div className="page-header">
        <div><h1 className="page-title">Antrenman Videoları</h1><p className="page-subtitle">{videos.length} video</p></div>
        <button className="btn bp" onClick={() => setShowModal(true)}><Plus size={16} /> Video Yükle</button>
      </div>

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center' }}><Loader2 size={24} className="spin" /></div>
      ) : videos.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon"><VideoIcon size={40} /></div><div className="empty-state-title">Henüz video yok</div></div>
      ) : (
        <div className="grid-3">
          {videos.map(v => (
            <div key={v.id} className="card" style={{ padding: 12 }}>
              <div style={{
                aspectRatio: '16/9', background: '#000', borderRadius: 6, marginBottom: 8,
                position: 'relative', cursor: 'pointer', overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }} onClick={() => v.signedUrl && setPlayingUrl(v.signedUrl)}>
                <Play size={36} color="#fff" />
              </div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{v.title}</div>
              {v.description && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>{v.description.slice(0, 80)}</div>}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{formatDate(v.created_at)}</div>
                <button className="btn bd btn-xs" onClick={() => handleDelete(v)}><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {playingUrl && (
        <div onClick={() => setPlayingUrl('')} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 1500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <video src={playingUrl} controls autoPlay style={{ maxWidth: '100%', maxHeight: '100%' }} onClick={e => e.stopPropagation()} />
        </div>
      )}

      {showModal && (
        <UploadModal
          orgId={orgId}
          uploading={uploading}
          progress={progress}
          setUploading={setUploading}
          setProgress={setProgress}
          onClose={() => setShowModal(false)}
          onDone={() => { setShowModal(false); fetchData() }}
        />
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .spin{animation:spin 1s linear infinite}`}</style>
    </DashboardLayout>
  )
}

function UploadModal({ orgId, uploading, progress, setUploading, setProgress, onClose, onDone }: {
  orgId: string; uploading: boolean; progress: number;
  setUploading: (b: boolean) => void; setProgress: (n: number) => void;
  onClose: () => void; onDone: () => void
}) {
  const supabase = createClient()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const onUpload = async () => {
    if (!title.trim() || !file) { toast.error('Başlık ve dosya gerekli'); return }
    if (file.size > MAX_SIZE) { toast.error('Dosya 100 MB üzeri olamaz'); return }
    setUploading(true); setProgress(0)
    try {
      const ext = file.name.split('.').pop() || 'mp4'
      const storagePath = `${orgId}/${Date.now()}.${ext}`

      const { error: upErr } = await supabase.storage.from('videos').upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      })
      if (upErr) throw upErr

      const { data: { user } } = await supabase.auth.getUser()
      const { error: insErr } = await supabase.from('videos').insert({
        organization_id: orgId,
        title, description: description || null,
        storage_path: storagePath, size_bytes: file.size,
        uploaded_by: user!.id, visibility: 'org',
      })
      if (insErr) throw insErr

      toast.success('Yüklendi')
      onDone()
    } catch (e) {
      toast.error('Hata: ' + (e as Error).message)
    } finally {
      setUploading(false); setProgress(0)
    }
  }

  return (
    <div className="modal-overlay" onClick={uploading ? undefined : onClose}>
      <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h2 className="modal-title">Video Yükle</h2></div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="form-group"><label className="form-label required">Başlık</label><input className="form-input" value={title} onChange={e => setTitle(e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Açıklama</label><textarea className="form-input" rows={3} value={description} onChange={e => setDescription(e.target.value)} /></div>
          <div className="form-group">
            <label className="form-label required">Video Dosyası (max 100MB)</label>
            <input ref={fileRef} type="file" accept="video/*" onChange={e => setFile(e.target.files?.[0] || null)} className="form-input" />
            {file && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>{file.name} — {(file.size / 1024 / 1024).toFixed(1)} MB</div>}
          </div>
          {uploading && (
            <div style={{ background: 'var(--bg3)', borderRadius: 6, overflow: 'hidden', height: 6 }}>
              <div style={{ width: `${progress}%`, height: '100%', background: 'var(--blue2)', transition: 'width 0.3s' }} />
            </div>
          )}
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>
            Önce Supabase Storage&apos;da <code>videos</code> bucket&apos;ını oluşturduğunuzdan emin olun.
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn bs" onClick={onClose} disabled={uploading}>İptal</button>
          <button className="btn bp" onClick={onUpload} disabled={uploading || !file}>
            {uploading ? <Loader2 size={14} className="spin" /> : <Upload size={14} />} Yükle
          </button>
        </div>
      </div>
    </div>
  )
}
