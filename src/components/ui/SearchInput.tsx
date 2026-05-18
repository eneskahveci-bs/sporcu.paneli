'use client'
import { useState, useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'

interface SearchInputProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  debounce?: number
  autoFocus?: boolean
  size?: 'sm' | 'md'
}

export function SearchInput({ value, onChange, placeholder = 'Ara...', debounce = 250, autoFocus, size = 'md' }: SearchInputProps) {
  const [local, setLocal] = useState(value)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { setLocal(value) }, [value])

  const update = (v: string) => {
    setLocal(v)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => onChange(v), debounce)
  }

  const h = size === 'sm' ? 32 : 38

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', flex: 1, maxWidth: 380 }}>
      <Search
        size={15}
        style={{ position: 'absolute', left: 11, color: 'var(--text3)', pointerEvents: 'none' }}
      />
      <input
        type="search"
        value={local}
        onChange={e => update(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        style={{
          width: '100%',
          height: h,
          background: 'var(--bg3)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: `0 ${local ? 32 : 12}px 0 36px`,
          fontSize: 13.5,
          color: 'var(--text)',
          outline: 'none',
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
        onFocus={e => { e.target.style.borderColor = 'var(--blue2)'; e.target.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--blue2) 18%, transparent)' }}
        onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
      />
      {local && (
        <button
          onClick={() => update('')}
          aria-label="Aramayı temizle"
          style={{
            position: 'absolute', right: 6,
            background: 'transparent', border: 'none',
            cursor: 'pointer', padding: 6, color: 'var(--text3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 4,
          }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}
