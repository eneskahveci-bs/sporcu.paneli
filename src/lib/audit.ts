import { createClient } from '@supabase/supabase-js'

interface AuditEntry {
  organization_id?: string | null
  user_id?: string | null
  user_email?: string | null
  action: string
  resource_type?: string
  resource_id?: string
  resource_name?: string
  ip_address?: string
  metadata?: Record<string, unknown>
}

// Audit log yazar — asenkron, ana işlemi bloklamaz
export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    await admin.from('audit_logs').insert({
      organization_id: entry.organization_id || null,
      user_id:         entry.user_id || null,
      user_email:      entry.user_email || null,
      action:          entry.action,
      resource_type:   entry.resource_type || null,
      resource_id:     entry.resource_id || null,
      resource_name:   entry.resource_name || null,
      ip_address:      entry.ip_address || null,
      metadata:        entry.metadata || null,
    })
  } catch {
    // Audit log hatası ana işlemi durdurmamalı
    // Production'da burası bir monitoring servisine (Sentry vb.) gönderilmeli
  }
}

// İstek IP'sini al
export function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}
