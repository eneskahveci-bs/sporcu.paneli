-- ======================================================
-- SPORCU PANELİ - İlk Şema
-- ======================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ======================================================
-- ENUM TYPES
-- ======================================================
CREATE TYPE user_role AS ENUM ('admin', 'coach', 'athlete', 'parent');
CREATE TYPE athlete_gender AS ENUM ('male', 'female');
CREATE TYPE athlete_status AS ENUM ('active', 'inactive', 'pending');
CREATE TYPE payment_type AS ENUM ('income', 'expense');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'overdue', 'cancelled');
CREATE TYPE payment_method AS ENUM ('cash', 'card', 'bank_transfer', 'paytr');
CREATE TYPE payment_source AS ENUM ('manual', 'plan', 'parent_notification');
CREATE TYPE notification_status AS ENUM ('pending_approval', 'approved', 'rejected');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'excused');
CREATE TYPE pre_reg_status AS ENUM ('pending', 'converted', 'rejected');

-- ======================================================
-- TABLES
-- ======================================================

-- Organizations (Akademiler)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  logo TEXT,
  phone VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Branches (Şubeler)
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sports (Spor Dalları)
CREATE TABLE sports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(10),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coaches (Antrenörler)
CREATE TABLE coaches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  sport_id UUID REFERENCES sports(id) ON DELETE SET NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  tc VARCHAR(11) UNIQUE,
  phone VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  specialization VARCHAR(255),
  license_number VARCHAR(100),
  salary DECIMAL(10, 2),
  start_date DATE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Classes (Sınıflar)
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  sport_id UUID REFERENCES sports(id) ON DELETE SET NULL,
  coach_id UUID REFERENCES coaches(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  schedule TEXT,
  max_students INTEGER,
  age_group VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Athletes (Sporcular)
CREATE TABLE athletes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  sport_id UUID REFERENCES sports(id) ON DELETE SET NULL,
  -- Kişisel Bilgiler
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  tc VARCHAR(11) NOT NULL,
  birth_date DATE,
  gender athlete_gender,
  phone VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  -- Akademik
  license_number VARCHAR(100),
  registration_date DATE DEFAULT CURRENT_DATE,
  category VARCHAR(100),
  -- Finansal
  monthly_fee DECIMAL(10, 2) DEFAULT 0,
  next_payment_date DATE,
  -- Veli
  parent_name VARCHAR(200),
  parent_phone VARCHAR(20),
  parent_email VARCHAR(255),
  -- Sağlık
  blood_type VARCHAR(5),
  height INTEGER,
  weight INTEGER,
  health_notes TEXT,
  emergency_contact VARCHAR(200),
  school VARCHAR(255),
  -- Durum
  status athlete_status DEFAULT 'active',
  notes TEXT,
  -- Auth
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  UNIQUE(organization_id, tc)
);

-- Payments (Ödemeler)
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  athlete_id UUID REFERENCES athletes(id) ON DELETE SET NULL,
  athlete_name VARCHAR(200),
  -- Miktar
  amount DECIMAL(10, 2) NOT NULL,
  type payment_type NOT NULL DEFAULT 'income',
  category VARCHAR(100),
  description TEXT,
  -- Durum
  status payment_status DEFAULT 'pending',
  due_date DATE,
  paid_date DATE,
  -- Yöntem
  method payment_method DEFAULT 'cash',
  source payment_source DEFAULT 'manual',
  slip_code VARCHAR(100),
  -- PayTR
  paytr_order_id VARCHAR(255),
  paytr_token TEXT,
  -- Bildirim
  notification_status notification_status,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

-- Payment Plans (Ödeme Planları)
CREATE TABLE payment_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL CHECK (year >= 2020),
  amount DECIMAL(10, 2) NOT NULL,
  status payment_status DEFAULT 'pending',
  due_date DATE,
  paid_date DATE,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(athlete_id, month, year)
);

-- Attendance (Yoklama)
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status attendance_status NOT NULL DEFAULT 'present',
  notes TEXT,
  recorded_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(athlete_id, date)
);

-- Messages (Mesajlar)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  sender_id UUID,
  sender_name VARCHAR(200),
  sender_role VARCHAR(50),
  receiver_id UUID,
  receiver_name VARCHAR(200),
  subject VARCHAR(500),
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pre-Registrations (Ön Kayıtlar)
CREATE TABLE pre_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  tc VARCHAR(11),
  birth_date DATE,
  gender athlete_gender,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  parent_name VARCHAR(200),
  parent_phone VARCHAR(20),
  sport_id UUID REFERENCES sports(id) ON DELETE SET NULL,
  preferred_class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  notes TEXT,
  status pre_reg_status DEFAULT 'pending',
  converted_athlete_id UUID REFERENCES athletes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Settings (Ayarlar)
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  key VARCHAR(100) NOT NULL,
  value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, key)
);

-- ======================================================
-- INDEXES
-- ======================================================
CREATE INDEX idx_athletes_org ON athletes(organization_id);
CREATE INDEX idx_athletes_tc ON athletes(tc);
CREATE INDEX idx_athletes_status ON athletes(status);
CREATE INDEX idx_athletes_class ON athletes(class_id);
CREATE INDEX idx_payments_athlete ON payments(athlete_id);
CREATE INDEX idx_payments_org ON payments(organization_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_due_date ON payments(due_date);
CREATE INDEX idx_attendance_athlete ON attendance(athlete_id);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_attendance_org ON attendance(organization_id);
CREATE INDEX idx_coaches_org ON coaches(organization_id);
CREATE INDEX idx_classes_org ON classes(organization_id);
CREATE INDEX idx_pre_reg_org ON pre_registrations(organization_id);

-- ======================================================
-- UPDATED_AT TRIGGER
-- ======================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_athletes_updated_at BEFORE UPDATE ON athletes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_coaches_updated_at BEFORE UPDATE ON coaches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_pre_reg_updated_at BEFORE UPDATE ON pre_registrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ======================================================
-- VALIDATE TC KIMLIK FUNCTION
-- ======================================================
CREATE OR REPLACE FUNCTION validate_tc(tc TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  digits INT[];
  odd_sum INT;
  even_sum INT;
  d10 INT;
  d11 INT;
  i INT;
BEGIN
  IF LENGTH(tc) != 11 THEN RETURN FALSE; END IF;
  IF tc !~ '^\d{11}$' THEN RETURN FALSE; END IF;
  IF SUBSTRING(tc, 1, 1) = '0' THEN RETURN FALSE; END IF;

  FOR i IN 1..11 LOOP
    digits[i] := CAST(SUBSTRING(tc, i, 1) AS INT);
  END LOOP;

  odd_sum := digits[1] + digits[3] + digits[5] + digits[7] + digits[9];
  even_sum := digits[2] + digits[4] + digits[6] + digits[8];
  d10 := MOD((odd_sum * 7) - even_sum, 10);
  IF d10 != digits[10] THEN RETURN FALSE; END IF;

  d11 := MOD(digits[1]+digits[2]+digits[3]+digits[4]+digits[5]+digits[6]+digits[7]+digits[8]+digits[9]+digits[10], 10);
  RETURN d11 = digits[11];
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ======================================================
-- AUTO OVERDUE PAYMENTS FUNCTION
-- ======================================================
CREATE OR REPLACE FUNCTION mark_overdue_payments()
RETURNS void AS $$
BEGIN
  UPDATE payments
  SET status = 'overdue', updated_at = NOW()
  WHERE status = 'pending'
    AND due_date < CURRENT_DATE;

  UPDATE payment_plans
  SET status = 'overdue'
  WHERE status = 'pending'
    AND due_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- ======================================================
-- ROW LEVEL SECURITY
-- ======================================================

-- Organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own organization"
  ON organizations FOR SELECT
  USING (id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::UUID);

-- Athletes
ALTER TABLE athletes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view athletes"
  ON athletes FOR SELECT
  USING (organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::UUID);
CREATE POLICY "Admin/coach can insert athletes"
  ON athletes FOR INSERT
  WITH CHECK (organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::UUID);
CREATE POLICY "Admin can update athletes"
  ON athletes FOR UPDATE
  USING (organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::UUID);
CREATE POLICY "Admin can delete athletes"
  ON athletes FOR DELETE
  USING (organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::UUID);

-- Payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view payments"
  ON payments FOR SELECT
  USING (organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::UUID);
CREATE POLICY "Org members can insert payments"
  ON payments FOR INSERT
  WITH CHECK (organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::UUID);
CREATE POLICY "Org members can update payments"
  ON payments FOR UPDATE
  USING (organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::UUID);

-- Attendance
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view attendance"
  ON attendance FOR SELECT
  USING (organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::UUID);
CREATE POLICY "Org members can manage attendance"
  ON attendance FOR ALL
  USING (organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::UUID);

-- Coaches
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view coaches"
  ON coaches FOR SELECT
  USING (organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::UUID);
CREATE POLICY "Admin can manage coaches"
  ON coaches FOR ALL
  USING (organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::UUID);

-- Sports
ALTER TABLE sports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view sports"
  ON sports FOR SELECT
  USING (organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::UUID);
CREATE POLICY "Admin can manage sports"
  ON sports FOR ALL
  USING (organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::UUID);

-- Classes
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view classes"
  ON classes FOR SELECT
  USING (organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::UUID);
CREATE POLICY "Admin can manage classes"
  ON classes FOR ALL
  USING (organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::UUID);

-- Branches
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view branches"
  ON branches FOR SELECT
  USING (organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::UUID);
CREATE POLICY "Admin can manage branches"
  ON branches FOR ALL
  USING (organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::UUID);

-- Payment Plans
ALTER TABLE payment_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view payment plans"
  ON payment_plans FOR SELECT
  USING (
    athlete_id IN (
      SELECT id FROM athletes
      WHERE organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::UUID
    )
  );
CREATE POLICY "Org members can manage payment plans"
  ON payment_plans FOR ALL
  USING (
    athlete_id IN (
      SELECT id FROM athletes
      WHERE organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::UUID
    )
  );

-- Pre-registrations
ALTER TABLE pre_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert pre-registrations"
  ON pre_registrations FOR INSERT WITH CHECK (true);
CREATE POLICY "Org members can view pre-registrations"
  ON pre_registrations FOR SELECT
  USING (organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::UUID);
CREATE POLICY "Org members can manage pre-registrations"
  ON pre_registrations FOR ALL
  USING (organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::UUID);

-- Settings
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view settings"
  ON settings FOR SELECT
  USING (organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::UUID);
CREATE POLICY "Admin can manage settings"
  ON settings FOR ALL
  USING (organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::UUID);

-- Messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their messages"
  ON messages FOR SELECT
  USING (
    organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::UUID
    OR sender_id = auth.uid()
    OR receiver_id = auth.uid()
  );
CREATE POLICY "Users can send messages"
  ON messages FOR INSERT WITH CHECK (sender_id = auth.uid());
