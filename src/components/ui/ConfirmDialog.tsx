'use client'
import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { AlertTriangle, Trash2, Info, CheckCircle, Loader2 } from 'lucide-react'

type Variant = 'danger' | 'warning' | 'info' | 'success'

interface ConfirmOptions {
  title: string
  message?: string
  confirmText?: string
  cancelText?: string
  variant?: Variant
  requireText?: string
}

interface ConfirmCtx {
  confirm: (opts: ConfirmOptions) => Promise<boolean>
}

const Ctx = createContext<ConfirmCtx>({ confirm: async () => false })

interface QueueItem extends ConfirmOptions {
  resolve: (v: boolean) => void
}

const VARIANT_STYLE: Record<Variant, { color: string; bg: string; icon: typeof AlertTriangle; btn: string }> = {
  danger:  { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  icon: Trash2,        btn: 'bd' },
  warning: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: AlertTriangle, btn: 'bp' },
  info:    { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', icon: Info,          btn: 'bp' },
  success: { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  icon: CheckCircle,   btn: 'bp' },
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [item, setItem] = useState<QueueItem | null>(null)
  const [typed, setTyped] = useState('')

  const confirm = useCallback((opts: ConfirmOptions) => {
    setTyped('')
    return new Promise<boolean>(resolve => {
      setItem({ ...opts, resolve })
    })
  }, [])

  const close = useCallback((v: boolean) => {
    if (item) item.resolve(v)
    setItem(null)
    setTyped('')
  }, [item])

  useEffect(() => {
    if (!item) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false)
      if (e.key === 'Enter' && !item.requireText) close(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [item, close])

  const v = item?.variant || 'danger'
  const style = VARIANT_STYLE[v]
  const Icon = style.icon
  const requireMatch = !item?.requireText || typed === item.requireText

  return (
    <Ctx.Provider value={{ confirm }}>
      {children}
      {item && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          onClick={() => close(false)}
          style={{ animation: 'modalIn 0.16s ease-out' }}
        >
          <div
            className="modal"
            style={{ maxWidth: 440 }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '24px 24px 0', display: 'flex', gap: 14 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: style.bg, color: style.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <h2 id="confirm-title" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                  {item.title}
                </h2>
                {item.message && (
                  <p style={{ fontSize: 13.5, color: 'var(--text2)', lineHeight: 1.55 }}>{item.message}</p>
                )}
                {item.requireText && (
                  <div style={{ marginTop: 14 }}>
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--text3)', marginBottom: 6 }}>
                      Onaylamak için <code style={{ background: 'var(--bg3)', padding: '1px 6px', borderRadius: 4, color: 'var(--text)' }}>{item.requireText}</code> yazın
                    </label>
                    <input
                      className="form-input"
                      autoFocus
                      value={typed}
                      onChange={e => setTyped(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && requireMatch) close(true) }}
                    />
                  </div>
                )}
              </div>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn bs" onClick={() => close(false)}>
                {item.cancelText || 'İptal'}
              </button>
              <button
                className={`btn ${style.btn}`}
                onClick={() => requireMatch && close(true)}
                disabled={!requireMatch}
                autoFocus={!item.requireText}
              >
                {item.confirmText || 'Onayla'}
              </button>
            </div>
          </div>
          <style>{`
            @keyframes modalIn {
              from { opacity: 0; transform: scale(0.97); }
              to { opacity: 1; transform: scale(1); }
            }
          `}</style>
        </div>
      )}
    </Ctx.Provider>
  )
}

export function useConfirm() {
  return useContext(Ctx).confirm
}

// Global helper — provider mount edildikten sonra her yerde çağrılabilir
let globalConfirm: ((opts: ConfirmOptions) => Promise<boolean>) | null = null

export function ConfirmGlobalBridge() {
  const confirm = useConfirm()
  useEffect(() => {
    globalConfirm = confirm
    return () => { globalConfirm = null }
  }, [confirm])
  return null
}

export async function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  if (!globalConfirm) {
    // Fallback (provider mount edilmemişse)
    return window.confirm(`${opts.title}\n\n${opts.message || ''}`)
  }
  return globalConfirm(opts)
}

// Loading bridge — uzun sürecek async işlemler için
export function withConfirmLoading<T>(promise: Promise<T>): Promise<T> {
  return promise
}

export { Loader2 }
