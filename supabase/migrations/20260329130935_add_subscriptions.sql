-- ============================================================
-- SPORCU PANELİ - SaaS Abonelik Sistemi Migration
-- Supabase SQL Editor'da çalıştır
-- ============================================================

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                   uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id      uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan                 text DEFAULT 'trial' CHECK (plan IN ('trial','starter','pro','enterprise')),
  status               text DEFAULT 'trial' CHECK (status IN ('trial','active','overdue','suspended','cancelled')),
  price_monthly        numeric(10,2) DEFAULT 0,
  billing_day          smallint DEFAULT 1 CHECK (billing_day BETWEEN 1 AND 28),
  trial_ends_at        timestamptz DEFAULT (now() + interval '14 days'),
  current_period_start timestamptz DEFAULT now(),
  current_period_end   timestamptz DEFAULT (now() + interval '14 days'),
  max_athletes         integer DEFAULT 30,
  max_branches         integer DEFAULT 1,
  notes                text,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now(),
  UNIQUE(organization_id)
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_read_own_subscription" ON public.subscriptions
  FOR SELECT USING (
    organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id')
  );

CREATE INDEX IF NOT EXISTS idx_subscriptions_org_id ON public.subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status  ON public.subscriptions(status);

-- Mevcut organizasyonlar için trial abonelik oluştur (varsa)
INSERT INTO public.subscriptions (organization_id)
SELECT id FROM public.organizations
WHERE id NOT IN (SELECT organization_id FROM public.subscriptions)
ON CONFLICT DO NOTHING;
