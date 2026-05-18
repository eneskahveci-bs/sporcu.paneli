'use client'

export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="skip-link"
      style={{
        position: 'fixed',
        top: 8,
        left: 8,
        background: 'var(--bg2)',
        color: 'var(--text)',
        padding: '8px 14px',
        border: '1px solid var(--border2)',
        borderRadius: 8,
        textDecoration: 'none',
        fontSize: 13,
        fontWeight: 600,
        zIndex: 10000,
        transform: 'translateY(-200%)',
        transition: 'transform 0.18s',
      }}
      onFocus={e => { e.currentTarget.style.transform = 'translateY(0)' }}
      onBlur={e => { e.currentTarget.style.transform = 'translateY(-200%)' }}
    >
      Ana içeriğe geç
    </a>
  )
}
