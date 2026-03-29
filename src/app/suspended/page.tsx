'use client'
import Link from 'next/link'
import { ThemeProvider } from '@/providers/ThemeProvider'

function SuspendedPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: '1rem', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ width: '100%', maxWidth: 480, textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 20 }}>🔒</div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text)', marginBottom: 12 }}>Hesabınız Askıya Alındı</h1>
        <p style={{ color: 'var(--text2)', fontSize: '1rem', lineHeight: 1.7, marginBottom: 32 }}>
          Aboneliğiniz sona erdi veya ödemeniz gecikti. Erişiminizi yeniden açmak için lütfen yönetici ile iletişime geçin.
        </p>
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 12, padding: '20px 24px', marginBottom: 28, textAlign: 'left' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text3)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>İletişim</div>
          <a href="mailto:eneskahveci.bs@gmail.com" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--blue2)', textDecoration: 'none', fontSize: 14, marginBottom: 8 }}>
            📧 eneskahveci.bs@gmail.com
          </a>
          <a href="tel:+905469775868" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--blue2)', textDecoration: 'none', fontSize: 14 }}>
            📞 +90 546 977 58 68
          </a>
        </div>
        <Link href="/" style={{ display: 'inline-block', padding: '10px 24px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 8, color: 'var(--text2)', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>
          ← Ana sayfaya dön
        </Link>
      </div>
    </div>
  )
}

export default function Page() {
  return <ThemeProvider><SuspendedPage /></ThemeProvider>
}
