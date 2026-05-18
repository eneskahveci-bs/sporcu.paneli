import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      padding: 24,
    }}>
      <div style={{ maxWidth: 480, textAlign: 'center' }}>
        <div style={{
          fontSize: 96, fontWeight: 800,
          background: 'var(--grad)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          lineHeight: 1,
          marginBottom: 12,
        }}>404</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>
          Sayfa bulunamadı
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 24, lineHeight: 1.6 }}>
          Aradığınız sayfa kaldırılmış veya hiç var olmamış olabilir.
        </p>
        <Link href="/" className="btn bp" style={{ textDecoration: 'none' }}>
          Ana sayfaya dön
        </Link>
      </div>
    </div>
  )
}
