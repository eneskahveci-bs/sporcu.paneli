-- ── Athlete Documents ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS athlete_documents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  athlete_id uuid REFERENCES athletes(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text DEFAULT 'other' CHECK (type IN ('health_report', 'license', 'consent', 'photo', 'other')),
  file_url text,
  file_path text,
  expires_at date,
  notes text,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE athlete_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage athlete_documents"
  ON athlete_documents FOR ALL
  USING (organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::UUID);

-- ── Slip URL for payment notifications ─────────────────────────────────────
ALTER TABLE payments ADD COLUMN IF NOT EXISTS slip_url text;

-- ── Storage: documents bucket ───────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY IF NOT EXISTS "documents_insert"
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documents');
CREATE POLICY IF NOT EXISTS "documents_select"
  ON storage.objects FOR SELECT USING (bucket_id = 'documents');
CREATE POLICY IF NOT EXISTS "documents_delete"
  ON storage.objects FOR DELETE USING (bucket_id = 'documents');

-- ── Branches: add bank/address fields if missing ───────────────────────────
ALTER TABLE branches ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS manager_name text;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS city text;
