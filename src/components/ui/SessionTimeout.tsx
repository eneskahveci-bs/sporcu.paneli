'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const TIMEOUT_MS = 30 * 60 * 1000 // 30 dakika
const WARNING_MS = 5 * 60 * 1000   // 5 dakika kala uyar

export function SessionTimeout() {
  const supabase = createClient()
  const router = useRouter()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const warningRef = useRef<NodeJS.Timeout | null>(null)
  const [showWarning, setShowWarning] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(300)
  const countdownRef = useRef<NodeJS.Timeout | null>(null)

  const resetTimers = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (warningRef.current) clearTimeout(warningRef.current)
    if (countdownRef.current) clearInterval(countdownRef.current)
    setShowWarning(false)

    warningRef.current = setTimeout(() => {
      setShowWarning(true)
      setSecondsLeft(300)
      countdownRef.current = setInterval(() => {
        setSecondsLeft(s => {
          if (s <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current)
            return 0
          }
          return s - 1
        })
      }, 1000)
    }, TIMEOUT_MS - WARNING_MS)

    timeoutRef.current = setTimeout(async () => {
      await supabase.auth.signOut()
      router.push('/login?reason=timeout')
    }, TIMEOUT_MS)
  }

  const handleStayLoggedIn = () => {
    resetTimers()
  }

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click']

    const handleActivity = () => {
      if (!showWarning) resetTimers()
    }

    events.forEach(e => window.addEventListener(e, handleActivity, { passive: true }))
    resetTimers()

    return () => {
      events.forEach(e => window.removeEventListener(e, handleActivity))
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (warningRef.current) clearTimeout(warningRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!showWarning) return null

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--bg-primary)', borderRadius: '1rem', padding: '2rem',
        maxWidth: '400px', width: '90%', textAlign: 'center', boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏰</div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem' }}>Oturum Sona Eriyor</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9375rem' }}>
          Uzun süreli işlem yapılmadığından oturumunuz{' '}
          <strong style={{ color: 'var(--danger, #ef4444)' }}>
            {minutes}:{seconds.toString().padStart(2, '0')}
          </strong>{' '}
          içinde kapatılacak.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button
            onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}
            className="btn bd"
          >
            Çıkış Yap
          </button>
          <button onClick={handleStayLoggedIn} className="btn bs">
            Oturumu Sürdür
          </button>
        </div>
      </div>
    </div>
  )
}
