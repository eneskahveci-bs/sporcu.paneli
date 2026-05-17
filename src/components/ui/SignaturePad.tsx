'use client'
import { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react'

export interface SignaturePadHandle {
  clear: () => void
  isEmpty: () => boolean
  toDataURL: () => string
}

export const SignaturePad = forwardRef<SignaturePadHandle, { height?: number }>(function SignaturePad({ height = 200 }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const empty = useRef(true)
  const [, force] = useState(0)

  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const ratio = window.devicePixelRatio || 1
    const rect = cv.getBoundingClientRect()
    cv.width = rect.width * ratio
    cv.height = rect.height * ratio
    const ctx = cv.getContext('2d')!
    ctx.scale(ratio, ratio)
    ctx.lineWidth = 2.2
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#0f172a'
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, rect.width, rect.height)

    const getPos = (e: MouseEvent | TouchEvent) => {
      const r = cv.getBoundingClientRect()
      const t = 'touches' in e ? e.touches[0] : (e as MouseEvent)
      return { x: t.clientX - r.left, y: t.clientY - r.top }
    }

    const start = (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      drawing.current = true
      empty.current = false
      const { x, y } = getPos(e)
      ctx.beginPath()
      ctx.moveTo(x, y)
    }

    const move = (e: MouseEvent | TouchEvent) => {
      if (!drawing.current) return
      e.preventDefault()
      const { x, y } = getPos(e)
      ctx.lineTo(x, y)
      ctx.stroke()
    }

    const end = () => { drawing.current = false }

    cv.addEventListener('mousedown', start)
    cv.addEventListener('mousemove', move)
    window.addEventListener('mouseup', end)
    cv.addEventListener('touchstart', start, { passive: false })
    cv.addEventListener('touchmove', move, { passive: false })
    cv.addEventListener('touchend', end)

    return () => {
      cv.removeEventListener('mousedown', start)
      cv.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', end)
      cv.removeEventListener('touchstart', start)
      cv.removeEventListener('touchmove', move)
      cv.removeEventListener('touchend', end)
    }
  }, [])

  useImperativeHandle(ref, () => ({
    clear: () => {
      const cv = canvasRef.current
      if (!cv) return
      const ctx = cv.getContext('2d')!
      ctx.save()
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, cv.width, cv.height)
      ctx.restore()
      empty.current = true
      force(n => n + 1)
    },
    isEmpty: () => empty.current,
    toDataURL: () => canvasRef.current?.toDataURL('image/png') || '',
  }))

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%', height,
        background: '#fff', borderRadius: 10,
        border: '2px dashed var(--border2)', cursor: 'crosshair',
        touchAction: 'none',
      }}
    />
  )
})
