'use client'
import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  footer?: React.ReactNode
  maxWidth?: number | string
  closeOnBackdrop?: boolean
  closeOnEsc?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const SIZE_MAP: Record<NonNullable<ModalProps['size']>, number> = {
  sm: 400,
  md: 520,
  lg: 720,
  xl: 960,
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  maxWidth,
  closeOnBackdrop = true,
  closeOnEsc = true,
  size = 'md',
}: ModalProps) {
  const ref = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    previouslyFocused.current = document.activeElement as HTMLElement
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Focus ilk fokuslanabilir elemana
    requestAnimationFrame(() => {
      const focusable = ref.current?.querySelector<HTMLElement>(
        'input:not([disabled]), button:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      focusable?.focus()
    })

    return () => {
      document.body.style.overflow = original
      previouslyFocused.current?.focus?.()
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEsc) {
        e.stopPropagation()
        onClose()
      }
      if (e.key === 'Tab') {
        // Focus trap
        const focusable = ref.current?.querySelectorAll<HTMLElement>(
          'input:not([disabled]), button:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
        )
        if (!focusable || focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus()
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose, closeOnEsc])

  if (!open) return null

  const maxW = maxWidth ?? SIZE_MAP[size]

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      onClick={closeOnBackdrop ? onClose : undefined}
      style={{ animation: 'modalOverlayIn 0.16s ease-out' }}
    >
      <div
        ref={ref}
        className="modal"
        style={{ maxWidth: maxW, animation: 'modalContentIn 0.18s cubic-bezier(0.32, 0.72, 0, 1)' }}
        onClick={e => e.stopPropagation()}
      >
        {title && (
          <div className="modal-header">
            <h2 id="modal-title" className="modal-title">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Kapat"
              style={{
                background: 'none', border: 'none', color: 'var(--text3)',
                cursor: 'pointer', padding: 6, borderRadius: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
      <style>{`
        @keyframes modalOverlayIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes modalContentIn {
          from { opacity: 0; transform: translateY(8px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @media (max-width: 640px) {
          .modal { margin: 0 !important; border-radius: 16px 16px 0 0 !important; max-height: 90vh; align-self: flex-end; width: 100%; }
        }
      `}</style>
    </div>
  )
}
