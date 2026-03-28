-- 005_sms_logs_users.sql
-- SMS gönderim logları
CREATE TABLE IF NOT EXISTS sms_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  recipient_name text DEFAULT '',
  recipient_phone text DEFAULT '',
  message text DEFAULT '',
  status text DEFAULT 'pending',     -- sent, failed, pending
  type text DEFAULT 'sms',           -- sms, whatsapp
  sent_at timestamptz DEFAULT now()
);

ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "sms_logs_org" ON sms_logs
  FOR ALL USING (organization_id = (SELECT (auth.jwt()->'user_metadata'->>'organization_id')::uuid));

-- Kullanıcılar tablosu (yönetici / antrenör kayıtları)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  first_name text DEFAULT '',
  last_name text DEFAULT '',
  role text DEFAULT 'admin' CHECK (role IN ('admin', 'coach', 'athlete', 'parent')),
  phone text,
  avatar_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- Kendi kaydını okuyabilir
CREATE POLICY IF NOT EXISTS "users_self_read" ON users
  FOR SELECT USING (id = auth.uid());
-- Aynı organizasyondaki üyeler okuyabilir
CREATE POLICY IF NOT EXISTS "users_org_read" ON users
  FOR SELECT USING (organization_id = (SELECT (auth.jwt()->'user_metadata'->>'organization_id')::uuid));
-- Yalnızca insert/update için org kontrolü
CREATE POLICY IF NOT EXISTS "users_org_write" ON users
  FOR ALL USING (organization_id = (SELECT (auth.jwt()->'user_metadata'->>'organization_id')::uuid));
