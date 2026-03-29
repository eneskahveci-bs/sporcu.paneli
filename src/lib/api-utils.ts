import { NextResponse } from 'next/server'

/**
 * Zorunlu environment variable'ları kontrol eder.
 * Eksik varsa hata döndürür — iç detaylar client'a sızdırılmaz.
 */
export function checkEnvVars(vars: string[]): { ok: true } | { ok: false; response: NextResponse } {
  const missing = vars.filter(v => !process.env[v])
  if (missing.length > 0) {
    // Hangi var'ların eksik olduğunu yalnızca server log'a yaz
    console.error('[ENV ERROR] Eksik environment variable(lar):', missing.join(', '))
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Sunucu yapılandırma hatası. Lütfen sistem yöneticisiyle iletişime geçin.' },
        { status: 500 }
      ),
    }
  }
  return { ok: true }
}

/**
 * API hatalarını güvenli biçimde döndürür.
 * İç hata mesajlarını production'da gizler.
 */
export function safeError(err: unknown, fallback = 'İstek işlenemedi'): NextResponse {
  if (process.env.NODE_ENV !== 'production') {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
  return NextResponse.json({ error: fallback }, { status: 500 })
}
