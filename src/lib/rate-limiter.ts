import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

interface RateLimitConfig {
  key: string          // benzersiz tanımlayıcı: 'ip:1.2.3.4:endpoint' veya 'user:uuid:endpoint'
  limit: number        // izin verilen istek sayısı
  windowSeconds: number // zaman penceresi (saniye)
}

// In-memory fallback (aynı instance'da hızlı kontrol)
const memCache = new Map<string, { count: number; resetAt: number }>()

/**
 * Supabase tabanlı cross-instance rate limiter.
 * Supabase'e erişilemezse in-memory fallback kullanılır.
 */
export async function checkRateLimit(config: RateLimitConfig): Promise<
  { allowed: true } | { allowed: false; retryAfterSeconds: number; response: NextResponse }
> {
  const { key, limit, windowSeconds } = config
  const now = Date.now()

  // 1. In-memory kontrol (hızlı yol)
  const mem = memCache.get(key)
  if (mem && now < mem.resetAt) {
    if (mem.count >= limit) {
      const retryAfter = Math.ceil((mem.resetAt - now) / 1000)
      return {
        allowed: false,
        retryAfterSeconds: retryAfter,
        response: NextResponse.json(
          { error: `Çok fazla istek. ${retryAfter} saniye sonra tekrar deneyin.` },
          { status: 429, headers: { 'Retry-After': String(retryAfter) } }
        ),
      }
    }
    mem.count++
  } else {
    memCache.set(key, { count: 1, resetAt: now + windowSeconds * 1000 })
  }

  // 2. Supabase tabanlı kontrol (cross-instance)
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return { allowed: true } // env yoksa sadece in-memory ile devam et
    }

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const windowEnd = new Date(now + windowSeconds * 1000).toISOString()

    // Mevcut kaydı al veya oluştur
    const { data: existing } = await admin
      .from('rate_limits')
      .select('id, count, window_end')
      .eq('key', key)
      .single()

    if (existing) {
      // Pencere dolmuşsa sıfırla
      if (new Date(existing.window_end).getTime() < now) {
        await admin.from('rate_limits').update({ count: 1, window_end: windowEnd }).eq('key', key)
        return { allowed: true }
      }

      if (existing.count >= limit) {
        const retryAfter = Math.ceil((new Date(existing.window_end).getTime() - now) / 1000)
        // In-memory cache'i de güncelle
        memCache.set(key, { count: limit, resetAt: new Date(existing.window_end).getTime() })
        return {
          allowed: false,
          retryAfterSeconds: retryAfter,
          response: NextResponse.json(
            { error: `Çok fazla istek. ${retryAfter} saniye sonra tekrar deneyin.` },
            { status: 429, headers: { 'Retry-After': String(retryAfter) } }
          ),
        }
      }

      await admin.from('rate_limits').update({ count: existing.count + 1 }).eq('key', key)
    } else {
      // Yeni kayıt oluştur
      await admin.from('rate_limits').upsert({ key, count: 1, window_end: windowEnd }, { onConflict: 'key' })
    }
  } catch {
    // DB hatasında in-memory sonucuna güven
  }

  return { allowed: true }
}

/**
 * Eski rate limit kayıtlarını temizle (periyodik çağrı)
 */
export async function cleanupRateLimits(): Promise<void> {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    await admin.from('rate_limits').delete().lt('window_end', new Date().toISOString())
  } catch { /* ignore */ }
}
