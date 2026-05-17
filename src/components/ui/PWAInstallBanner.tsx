'use client'
import { useEffect, useState } from 'react'
import { Download, X, Share, Plus } from 'lucide-react'

const DISMISS_KEY = 'pwa-install-dismissed-until'
const SHOW_AFTER_VISITS = 3
const DISMISS_DAYS = 7
const MAX_DISMISSES = 3
const DISMISS_COUNT_KEY = 'pwa-install-dismiss-count'

type DeferredPrompt = {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

declare global {
  interface Window {
    __deferredPrompt?: DeferredPrompt
  }
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const navAny = window.navigator as Navigator & { standalone?: boolean }
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    navAny.standalone === true
  )
}

function isIOSSafari(): boolean {
  if (typeof window === 'undefined') return false
  const ua = window.navigator.userAgent
  const iOS = /iPad|iPhone|iPod/.test(ua)
  const webkit = /WebKit/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua)
  return iOS && webkit
}

function getDismissedUntil(): number {
  try {
    const v = localStorage.getItem(DISMISS_KEY)
    return v ? parseInt(v, 10) : 0
  } catch {
    return 0
  }
}

export function PWAInstallBanner() {
  const [visible, setVisible] = useState(false)
  const [iosMode, setIosMode] = useState(false)
  const [showIOSGuide, setShowIOSGuide] = useState(false)
  const [prompt, setPrompt] = useState<DeferredPrompt | null>(null)

  useEffect(() => {
    if (isStandalone()) return

    const visits = parseInt(localStorage.getItem('visitCount') || '0', 10)
    if (visits < SHOW_AFTER_VISITS) return

    const dismissedUntil = getDismissedUntil()
    if (Date.now() < dismissedUntil) return

    const dismissCount = parseInt(localStorage.getItem(DISMISS_COUNT_KEY) || '0', 10)
    if (dismissCount >= MAX_DISMISSES) return

    if (isIOSSafari()) {
      setIosMode(true)
      setVisible(true)
      return
    }

    if (window.__deferredPrompt) {
      setPrompt(window.__deferredPrompt)
      setVisible(true)
    }

    const onInstallable = () => {
      if (window.__deferredPrompt) {
        setPrompt(window.__deferredPrompt)
        setVisible(true)
      }
    }
    window.addEventListener('pwa-installable', onInstallable)
    return () => window.removeEventListener('pwa-installable', onInstallable)
  }, [])

  const handleInstall = async () => {
    if (iosMode) {
      setShowIOSGuide(true)
      return
    }
    if (!prompt) return
    try {
      await prompt.prompt()
      const { outcome } = await prompt.userChoice
      if (outcome === 'accepted') {
        setVisible(false)
      } else {
        dismiss()
      }
    } catch {
      dismiss()
    }
    setPrompt(null)
  }

  const dismiss = () => {
    const count = parseInt(localStorage.getItem(DISMISS_COUNT_KEY) || '0', 10) + 1
    localStorage.setItem(DISMISS_COUNT_KEY, String(count))
    localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000))
    setVisible(false)
    setShowIOSGuide(false)
  }

  if (!visible) return null

  return (
    <>
      <div
        role="dialog"
        aria-label="Uygulamayı Yükle"
        style={{
          position: 'fixed',
          left: '50%',
          transform: 'translateX(-50%)',
          bottom: 'calc(env(safe-area-inset-bottom, 0) + 16px)',
          zIndex: 1500,
          width: 'min(420px, calc(100vw - 24px))',
          background: 'var(--bg2)',
          border: '1px solid var(--border2)',
          borderRadius: 14,
          boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
          padding: '14px 16px',
          display: 'flex',
          gap: 12,
          alignItems: 'center',
        }}
      >
        <div
          style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'var(--grad)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >
          <Download size={20} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
            Telefonunuza Yükleyin
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
            Daha hızlı erişim için ana ekrana ekleyin
          </div>
        </div>
        <button
          onClick={handleInstall}
          style={{
            background: 'var(--grad)', color: '#fff', border: 'none',
            padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            cursor: 'pointer', flexShrink: 0,
          }}
        >
          Yükle
        </button>
        <button
          onClick={dismiss}
          aria-label="Kapat"
          style={{
            background: 'transparent', border: 'none', color: 'var(--text3)',
            cursor: 'pointer', padding: 4, display: 'flex', flexShrink: 0,
          }}
        >
          <X size={18} />
        </button>
      </div>

      {showIOSGuide && (
        <div
          onClick={() => setShowIOSGuide(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            zIndex: 1600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg2)', border: '1px solid var(--border2)',
              borderRadius: 14, padding: 24, maxWidth: 420, width: '100%',
            }}
          >
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>
              iPhone&apos;a Ekle
            </h3>
            <ol style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.8, paddingLeft: 20 }}>
              <li>Alttaki <Share size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Paylaş butonuna dokun</li>
              <li>&quot;Ana Ekrana Ekle&quot; <Plus size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> seç</li>
              <li>Sağ üstte &quot;Ekle&quot;ye dokun</li>
            </ol>
            <button
              onClick={() => setShowIOSGuide(false)}
              style={{
                marginTop: 16, width: '100%',
                background: 'var(--grad)', color: '#fff', border: 'none',
                padding: '10px 16px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Anladım
            </button>
          </div>
        </div>
      )}
    </>
  )
}
