'use client'
import { useState } from 'react'
import { Search, Bell, Menu, X } from 'lucide-react'
import { Sidebar } from './Sidebar'

interface HeaderProps {
  title?: string
}

export function Header({ title }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [search, setSearch] = useState('')

  return (
    <>
      <header className="header">
        <button
          className="header-btn"
          style={{ display: 'none' }}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menüyü aç/kapat"
          id="mobile-menu-btn"
        >
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>

        {title && (
          <h1 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap' }}>
            {title}
          </h1>
        )}

        <div className="header-search">
          <Search className="header-search-icon" />
          <input
            type="search"
            placeholder="Ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Ara"
          />
        </div>

        <div className="header-actions">
          <button className="header-btn" aria-label="Bildirimler">
            <Bell size={16} />
            <span className="header-badge">3</span>
          </button>
        </div>
      </header>

      {/* Mobile overlay */}
      {menuOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            zIndex: 35, display: 'none'
          }}
          onClick={() => setMenuOpen(false)}
        />
      )}

      <style>{`
        @media (max-width: 768px) {
          #mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </>
  )
}
