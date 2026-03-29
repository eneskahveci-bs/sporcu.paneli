-- ============================================================
-- Güvenlik: Audit Log + Rate Limit tabloları
-- ============================================================

-- Audit Log: Her önemli işlem kaydedilir
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  user_id         uuid,
  user_email      text,
  action          text NOT NULL,          -- 'athlete.create' | 'admin.create' | 'password.reset' vb.
  resource_type   text,                   -- 'athlete' | 'coach' | 'admin' | 'organization'
  resource_id     text,
  resource_name   text,
  ip_address      text,
  metadata        jsonb,                  -- ek bilgiler
  created_at      timestamptz DEFAULT now()
);

-- RLS: Yalnızca aynı org'un admini okuyabilir
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_admin_read_audit" ON public.audit_logs
  FOR SELECT USING (
    organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id')
  );

-- Süper admin service role ile tüm kayıtlara erişir (API üzerinden)

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_audit_logs_org    ON public.audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user   ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_time   ON public.audit_logs(created_at DESC);

-- Otomatik temizleme: 1 yıldan eski kayıtlar silinir (KVKK uyumu)
-- Not: Cron job ile tetiklenmesi gerekir, Supabase pg_cron ile yapılabilir
-- SELECT cron.schedule('cleanup-audit-logs', '0 2 * * 0', $$
--   DELETE FROM public.audit_logs WHERE created_at < now() - interval '1 year';
-- $$);

-- Rate Limits tablosu (cross-instance rate limiting için)
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  key        text NOT NULL,              -- 'ip:1.2.3.4:sms' | 'user:uuid:provision'
  count      integer DEFAULT 1,
  window_end timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(key)
);

-- RLS: Servis rolü hariç kimse erişemez
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- Tüm işlemler service role ile yapılır, policy gerekmez

-- İndeks
CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON public.rate_limits(key);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON public.rate_limits(window_end);
