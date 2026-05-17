-- ============================================================
-- FEATURE ROADMAP — Sprint 1/2/3 tabloları (idempotent)
-- Tüm tablolar org_id ile RLS izole edilmiştir.
-- ============================================================

-- ─── 1.1 PayTR Recurring / Otomatik Aylık Aidat ─────────────
CREATE TABLE IF NOT EXISTS public.recurring_payments (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id   uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id         uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  athlete_id        uuid NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  amount            numeric(10,2) NOT NULL,
  currency          text DEFAULT 'TL',
  day_of_month      smallint NOT NULL CHECK (day_of_month BETWEEN 1 AND 28),
  paytr_card_token  text,
  status            text DEFAULT 'active' CHECK (status IN ('active','paused','cancelled')),
  last_charged_at   timestamptz,
  next_charge_at    timestamptz,
  retry_count       smallint DEFAULT 0,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),
  UNIQUE(athlete_id)
);
ALTER TABLE public.recurring_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recurring_org_read" ON public.recurring_payments;
CREATE POLICY "recurring_org_read" ON public.recurring_payments FOR SELECT
  USING (organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id'));

DROP POLICY IF EXISTS "recurring_org_write" ON public.recurring_payments;
CREATE POLICY "recurring_org_write" ON public.recurring_payments FOR ALL
  USING (organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id'))
  WITH CHECK (organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id'));

CREATE INDEX IF NOT EXISTS idx_recurring_next_charge ON public.recurring_payments(next_charge_at) WHERE status='active';
CREATE INDEX IF NOT EXISTS idx_recurring_org ON public.recurring_payments(organization_id);

-- payments tablosuna recurring referansı
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS recurring_id uuid REFERENCES public.recurring_payments(id) ON DELETE SET NULL;


-- ─── 1.3 QR Kod ile Yoklama ──────────────────────────────────
ALTER TABLE public.athletes
  ADD COLUMN IF NOT EXISTS qr_token text UNIQUE;

CREATE INDEX IF NOT EXISTS idx_athletes_qr_token ON public.athletes(qr_token) WHERE qr_token IS NOT NULL;

CREATE OR REPLACE FUNCTION public.mark_attendance_by_qr(
  p_token text,
  p_class_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_athlete record;
  v_today date := current_date;
  v_existing uuid;
BEGIN
  SELECT id, organization_id, first_name, last_name, class_id
    INTO v_athlete
    FROM public.athletes
    WHERE qr_token = p_token AND status = 'active'
    LIMIT 1;

  IF v_athlete.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_token');
  END IF;

  SELECT id INTO v_existing
    FROM public.attendance
    WHERE athlete_id = v_athlete.id AND date = v_today;

  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_marked',
      'athlete', v_athlete.first_name || ' ' || v_athlete.last_name);
  END IF;

  INSERT INTO public.attendance (organization_id, athlete_id, date, status, recorded_by)
  VALUES (v_athlete.organization_id, v_athlete.id, v_today, 'present', auth.uid());

  RETURN jsonb_build_object('ok', true,
    'athlete', v_athlete.first_name || ' ' || v_athlete.last_name);
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_attendance_by_qr TO authenticated;


-- ─── 1.5 Web Push Bildirimi ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint        text NOT NULL UNIQUE,
  p256dh          text NOT NULL,
  auth            text NOT NULL,
  user_agent      text,
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_sub_own" ON public.push_subscriptions;
CREATE POLICY "push_sub_own" ON public.push_subscriptions FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "push_sub_admin_read" ON public.push_subscriptions;
CREATE POLICY "push_sub_admin_read" ON public.push_subscriptions FOR SELECT
  USING (organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id')
    AND (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin','superadmin'));

CREATE TABLE IF NOT EXISTS public.push_broadcasts (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title           text NOT NULL,
  body            text NOT NULL,
  target          text NOT NULL DEFAULT 'all' CHECK (target IN ('all','class','branch','custom')),
  target_ids      uuid[],
  sent_count      integer DEFAULT 0,
  failed_count    integer DEFAULT 0,
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE public.push_broadcasts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "broadcast_org_admin" ON public.push_broadcasts;
CREATE POLICY "broadcast_org_admin" ON public.push_broadcasts FOR ALL
  USING (organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id')
    AND (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin','superadmin'));


-- ─── 2.1 Fitness Test Modülü ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fitness_tests (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id       uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  athlete_id      uuid NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  test_type       text NOT NULL CHECK (test_type IN ('shuttle_run','sprint_30m','vertical_jump','cooper_test','bmi','body_fat_pct','flexibility','plank','custom')),
  value           numeric(10,3) NOT NULL,
  unit            text NOT NULL,
  notes           text,
  recorded_at     timestamptz DEFAULT now(),
  recorded_by     uuid REFERENCES auth.users(id),
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE public.fitness_tests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fitness_org_read" ON public.fitness_tests;
CREATE POLICY "fitness_org_read" ON public.fitness_tests FOR SELECT
  USING (organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id'));

DROP POLICY IF EXISTS "fitness_staff_write" ON public.fitness_tests;
CREATE POLICY "fitness_staff_write" ON public.fitness_tests FOR ALL
  USING (organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id')
    AND (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin','coach','superadmin'))
  WITH CHECK (organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id'));

CREATE INDEX IF NOT EXISTS idx_fitness_athlete ON public.fitness_tests(athlete_id, recorded_at DESC);


-- ─── 2.2 Çoklu Çocuk (Veli) Yönetimi ────────────────────────
CREATE TABLE IF NOT EXISTS public.parents (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  auth_user_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL UNIQUE,
  first_name      text NOT NULL,
  last_name       text NOT NULL,
  tc              text NOT NULL,
  phone           text,
  email           text,
  notification_prefs jsonb DEFAULT '{"push":true,"sms":false,"email":true}'::jsonb,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE(organization_id, tc)
);
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parents_org_read" ON public.parents;
CREATE POLICY "parents_org_read" ON public.parents FOR SELECT
  USING (organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id')
         OR auth_user_id = auth.uid());

DROP POLICY IF EXISTS "parents_admin_write" ON public.parents;
CREATE POLICY "parents_admin_write" ON public.parents FOR ALL
  USING (organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id')
    AND (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin','superadmin'))
  WITH CHECK (organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id'));

ALTER TABLE public.athletes
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.parents(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_athletes_parent ON public.athletes(parent_id) WHERE parent_id IS NOT NULL;


-- ─── 2.4 WhatsApp Business mesaj geçmişi ────────────────────
CREATE TABLE IF NOT EXISTS public.wa_messages (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  athlete_id      uuid REFERENCES public.athletes(id) ON DELETE SET NULL,
  to_phone        text NOT NULL,
  template_name   text,
  body            text NOT NULL,
  status          text DEFAULT 'queued' CHECK (status IN ('queued','sent','delivered','read','failed')),
  wa_message_id   text,
  error           text,
  cost_credit     numeric(10,4) DEFAULT 0,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);
ALTER TABLE public.wa_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wa_org_read" ON public.wa_messages;
CREATE POLICY "wa_org_read" ON public.wa_messages FOR SELECT
  USING (organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id'));

DROP POLICY IF EXISTS "wa_admin_write" ON public.wa_messages;
CREATE POLICY "wa_admin_write" ON public.wa_messages FOR ALL
  USING (organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id')
    AND (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin','superadmin'));


-- ─── 2.5 İndirim / Burs Sistemi ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.discount_rules (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  type            text NOT NULL CHECK (type IN ('sibling','merit','need','custom')),
  value_pct       numeric(5,2),
  value_fixed     numeric(10,2),
  is_active       boolean DEFAULT true,
  description     text,
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE public.discount_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "discount_rules_org" ON public.discount_rules;
CREATE POLICY "discount_rules_org" ON public.discount_rules FOR ALL
  USING (organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id'))
  WITH CHECK (organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id'));

CREATE TABLE IF NOT EXISTS public.athlete_discounts (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  athlete_id      uuid NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  rule_id         uuid NOT NULL REFERENCES public.discount_rules(id) ON DELETE CASCADE,
  valid_from      date DEFAULT current_date,
  valid_to        date,
  applied_by      uuid REFERENCES auth.users(id),
  notes           text,
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE public.athlete_discounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "athlete_discounts_org" ON public.athlete_discounts;
CREATE POLICY "athlete_discounts_org" ON public.athlete_discounts FOR ALL
  USING (organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id'))
  WITH CHECK (organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id'));

CREATE INDEX IF NOT EXISTS idx_athlete_discounts_athlete ON public.athlete_discounts(athlete_id);


-- ─── 2.6 Dijital Onay Formu ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.consent_forms (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id   uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  athlete_id        uuid NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  title             text NOT NULL,
  description       text,
  signature_data    text,                            -- base64 PNG
  signed_at         timestamptz,
  signer_name       text,
  signer_tc         text,
  signer_ip         text,
  status            text DEFAULT 'pending' CHECK (status IN ('pending','signed','rejected','expired')),
  expires_at        timestamptz,
  requested_by      uuid REFERENCES auth.users(id),
  created_at        timestamptz DEFAULT now()
);
ALTER TABLE public.consent_forms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "consent_org_read" ON public.consent_forms;
CREATE POLICY "consent_org_read" ON public.consent_forms FOR SELECT
  USING (organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id'));

DROP POLICY IF EXISTS "consent_admin_write" ON public.consent_forms;
CREATE POLICY "consent_admin_write" ON public.consent_forms FOR INSERT
  WITH CHECK (organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id')
    AND (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin','superadmin'));

DROP POLICY IF EXISTS "consent_self_sign" ON public.consent_forms;
CREATE POLICY "consent_self_sign" ON public.consent_forms FOR UPDATE
  USING (
    organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id')
    AND (
      (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin','superadmin','parent','athlete')
    )
  );


-- ─── 3.1 Video Paylaşım Modülü ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.videos (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id       uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  class_id        uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  title           text NOT NULL,
  description     text,
  storage_path    text NOT NULL,                  -- supabase storage path
  thumbnail_path  text,
  duration_sec    integer,
  size_bytes      bigint,
  uploaded_by     uuid REFERENCES auth.users(id),
  visibility      text DEFAULT 'org' CHECK (visibility IN ('org','class','public')),
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "videos_org_read" ON public.videos;
CREATE POLICY "videos_org_read" ON public.videos FOR SELECT
  USING (organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id'));

DROP POLICY IF EXISTS "videos_staff_write" ON public.videos;
CREATE POLICY "videos_staff_write" ON public.videos FOR ALL
  USING (organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id')
    AND (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin','coach','superadmin'))
  WITH CHECK (organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id'));

CREATE TABLE IF NOT EXISTS public.video_comments (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id    uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text,
  body        text NOT NULL,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE public.video_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "video_comments_read" ON public.video_comments;
CREATE POLICY "video_comments_read" ON public.video_comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "video_comments_write" ON public.video_comments;
CREATE POLICY "video_comments_write" ON public.video_comments FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());


-- ─── 3.2 Lig / Turnuva Modülü ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.tournaments (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  slug            text NOT NULL,
  sport_id        uuid REFERENCES public.sports(id) ON DELETE SET NULL,
  format          text DEFAULT 'league' CHECK (format IN ('league','knockout','group_stage')),
  starts_at       date,
  ends_at         date,
  is_public       boolean DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  UNIQUE(organization_id, slug)
);
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tournaments_public_read" ON public.tournaments;
CREATE POLICY "tournaments_public_read" ON public.tournaments FOR SELECT
  USING (is_public = true OR organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id'));

DROP POLICY IF EXISTS "tournaments_admin_write" ON public.tournaments;
CREATE POLICY "tournaments_admin_write" ON public.tournaments FOR ALL
  USING (organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id')
    AND (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin','superadmin'));

CREATE TABLE IF NOT EXISTS public.tournament_teams (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  name          text NOT NULL,
  logo_url      text,
  created_at    timestamptz DEFAULT now()
);
ALTER TABLE public.tournament_teams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tt_read" ON public.tournament_teams;
CREATE POLICY "tt_read" ON public.tournament_teams FOR SELECT USING (true);
DROP POLICY IF EXISTS "tt_admin_write" ON public.tournament_teams;
CREATE POLICY "tt_admin_write" ON public.tournament_teams FOR ALL
  USING (EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = tournament_id
    AND t.organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id')
    AND (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin','superadmin')));

CREATE TABLE IF NOT EXISTS public.matches (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id   uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  home_team_id    uuid REFERENCES public.tournament_teams(id) ON DELETE SET NULL,
  away_team_id    uuid REFERENCES public.tournament_teams(id) ON DELETE SET NULL,
  scheduled_at    timestamptz,
  venue           text,
  home_score      smallint,
  away_score      smallint,
  status          text DEFAULT 'scheduled' CHECK (status IN ('scheduled','in_progress','finished','cancelled')),
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "matches_read" ON public.matches;
CREATE POLICY "matches_read" ON public.matches FOR SELECT USING (true);
DROP POLICY IF EXISTS "matches_admin_write" ON public.matches;
CREATE POLICY "matches_admin_write" ON public.matches FOR ALL
  USING (EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = tournament_id
    AND t.organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id')
    AND (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin','superadmin')));

CREATE OR REPLACE FUNCTION public.tournament_standings(p_tournament_id uuid)
RETURNS TABLE(team_id uuid, name text, played int, wins int, draws int, losses int, gf int, ga int, gd int, pts int)
LANGUAGE sql STABLE AS $$
  WITH team_matches AS (
    SELECT
      tt.id AS team_id,
      tt.name AS team_name,
      m.home_team_id, m.away_team_id, m.home_score, m.away_score, m.status
    FROM public.tournament_teams tt
    LEFT JOIN public.matches m
      ON (m.home_team_id = tt.id OR m.away_team_id = tt.id) AND m.status = 'finished'
    WHERE tt.tournament_id = p_tournament_id
  ),
  scored AS (
    SELECT
      team_id, team_name,
      CASE WHEN home_team_id IS NULL AND away_team_id IS NULL THEN 0 ELSE 1 END AS played,
      CASE WHEN home_team_id = team_id THEN home_score
           WHEN away_team_id = team_id THEN away_score ELSE 0 END AS scored_for,
      CASE WHEN home_team_id = team_id THEN away_score
           WHEN away_team_id = team_id THEN home_score ELSE 0 END AS scored_against
    FROM team_matches
  )
  SELECT
    team_id,
    team_name AS name,
    COALESCE(SUM(played),0)::int AS played,
    COALESCE(SUM(CASE WHEN scored_for > scored_against THEN 1 ELSE 0 END),0)::int AS wins,
    COALESCE(SUM(CASE WHEN scored_for = scored_against AND played=1 THEN 1 ELSE 0 END),0)::int AS draws,
    COALESCE(SUM(CASE WHEN scored_for < scored_against THEN 1 ELSE 0 END),0)::int AS losses,
    COALESCE(SUM(scored_for),0)::int AS gf,
    COALESCE(SUM(scored_against),0)::int AS ga,
    (COALESCE(SUM(scored_for),0) - COALESCE(SUM(scored_against),0))::int AS gd,
    (COALESCE(SUM(CASE WHEN scored_for > scored_against THEN 3
                       WHEN scored_for = scored_against AND played=1 THEN 1
                       ELSE 0 END),0))::int AS pts
  FROM scored
  GROUP BY team_id, team_name
  ORDER BY pts DESC, gd DESC, gf DESC;
$$;

GRANT EXECUTE ON FUNCTION public.tournament_standings TO anon, authenticated;


-- ─── 3.3 AI Rapor Geçmişi ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.athlete_ai_reports (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  athlete_id      uuid NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  period_from     date,
  period_to       date,
  content_md      text NOT NULL,
  model           text DEFAULT 'claude-sonnet-4-6',
  tokens_input    integer,
  tokens_output   integer,
  generated_by    uuid REFERENCES auth.users(id),
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE public.athlete_ai_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ai_reports_org" ON public.athlete_ai_reports;
CREATE POLICY "ai_reports_org" ON public.athlete_ai_reports FOR ALL
  USING (organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id'));


-- ─── 3.4 Wearable / Manuel Aktivite Girişi ──────────────────
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  athlete_id      uuid NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  activity_type   text NOT NULL,                 -- run, swim, ride, gym, other
  duration_min    integer,
  distance_km     numeric(8,3),
  calories_kcal   integer,
  heart_rate_avg  smallint,
  source          text DEFAULT 'manual' CHECK (source IN ('manual','healthkit','google_fit','strava')),
  notes           text,
  recorded_at     timestamptz DEFAULT now(),
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "activity_org" ON public.activity_logs;
CREATE POLICY "activity_org" ON public.activity_logs FOR ALL
  USING (organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id'));

CREATE INDEX IF NOT EXISTS idx_activity_athlete ON public.activity_logs(athlete_id, recorded_at DESC);


-- ─── 3.5 Multi-Tenant Superadmin Yardımcısı ─────────────────
CREATE OR REPLACE FUNCTION public.is_super_admin(p_uid uuid)
RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT EXISTS(
    SELECT 1 FROM auth.users
    WHERE id = p_uid
      AND (raw_user_meta_data ->> 'role') = 'superadmin'
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_super_admin TO authenticated;


-- ─── 3.6 Mağaza / E-ticaret ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.products (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  description     text,
  image_url       text,
  price           numeric(10,2) NOT NULL,
  stock           integer DEFAULT 0,
  sku             text,
  is_active       boolean DEFAULT true,
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_org_read" ON public.products;
CREATE POLICY "products_org_read" ON public.products FOR SELECT
  USING (organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id'));
DROP POLICY IF EXISTS "products_admin_write" ON public.products;
CREATE POLICY "products_admin_write" ON public.products FOR ALL
  USING (organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id')
    AND (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin','superadmin'))
  WITH CHECK (organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id'));

CREATE TABLE IF NOT EXISTS public.orders (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  athlete_id      uuid REFERENCES public.athletes(id) ON DELETE SET NULL,
  buyer_user_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  total_amount    numeric(10,2) NOT NULL,
  status          text DEFAULT 'pending' CHECK (status IN ('pending','paid','preparing','shipped','delivered','cancelled')),
  payment_id      uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  shipping_address text,
  notes           text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_org_read" ON public.orders;
CREATE POLICY "orders_org_read" ON public.orders FOR SELECT
  USING (organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id'));
DROP POLICY IF EXISTS "orders_buyer_insert" ON public.orders;
CREATE POLICY "orders_buyer_insert" ON public.orders FOR INSERT
  WITH CHECK (organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id'));
DROP POLICY IF EXISTS "orders_admin_update" ON public.orders;
CREATE POLICY "orders_admin_update" ON public.orders FOR UPDATE
  USING (organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id')
    AND (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin','superadmin'));

CREATE TABLE IF NOT EXISTS public.order_items (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id    uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id  uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  unit_price  numeric(10,2) NOT NULL,
  quantity    integer NOT NULL,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "oi_read" ON public.order_items;
CREATE POLICY "oi_read" ON public.order_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id
    AND o.organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id')));
DROP POLICY IF EXISTS "oi_write" ON public.order_items;
CREATE POLICY "oi_write" ON public.order_items FOR ALL
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id
    AND o.organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id
    AND o.organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id')));


-- ─── 3.7 Sponsor Yönetimi ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sponsors (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  logo_url        text,
  website         text,
  tier            text DEFAULT 'bronze' CHECK (tier IN ('platinum','gold','silver','bronze')),
  valid_from      date DEFAULT current_date,
  valid_to        date,
  is_active       boolean DEFAULT true,
  display_order   integer DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sponsors_public_read" ON public.sponsors;
CREATE POLICY "sponsors_public_read" ON public.sponsors FOR SELECT
  USING (is_active = true);
DROP POLICY IF EXISTS "sponsors_admin_write" ON public.sponsors;
CREATE POLICY "sponsors_admin_write" ON public.sponsors FOR ALL
  USING (organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id')
    AND (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin','superadmin'));


-- ─── 3.8 Gamification / Devamlılık Skoru ────────────────────
CREATE OR REPLACE VIEW public.athlete_streaks AS
WITH ordered AS (
  SELECT athlete_id, date, status,
         row_number() OVER (PARTITION BY athlete_id ORDER BY date) AS rn,
         date - (row_number() OVER (PARTITION BY athlete_id ORDER BY date)) * interval '1 day' AS grp
  FROM public.attendance
  WHERE status = 'present'
),
streaks AS (
  SELECT athlete_id, count(*) AS streak_length, max(date) AS streak_end
  FROM ordered
  GROUP BY athlete_id, grp
),
agg AS (
  SELECT
    a.id AS athlete_id,
    a.first_name, a.last_name, a.organization_id,
    COALESCE(MAX(CASE WHEN s.streak_end >= current_date - 1 THEN s.streak_length ELSE 0 END), 0) AS current_streak,
    COALESCE(MAX(s.streak_length), 0) AS max_streak,
    (SELECT count(*) FROM public.attendance WHERE athlete_id = a.id AND status='present') AS total_present,
    (SELECT count(*) FROM public.attendance WHERE athlete_id = a.id) AS total_records
  FROM public.athletes a
  LEFT JOIN streaks s ON s.athlete_id = a.id
  GROUP BY a.id, a.first_name, a.last_name, a.organization_id
)
SELECT
  athlete_id, first_name, last_name, organization_id,
  current_streak, max_streak, total_present,
  CASE WHEN total_records > 0 THEN ROUND((total_present::numeric / total_records) * 100, 1) ELSE 0 END AS attendance_pct
FROM agg;

GRANT SELECT ON public.athlete_streaks TO authenticated;
