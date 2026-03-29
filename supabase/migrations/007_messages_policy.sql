-- ── Messages: Admin tüm org mesajlarını görebilsin ──────────────────────────
-- Mevcut policy'yi genişlet: sender veya receiver + org admin
DROP POLICY IF EXISTS "Users can view their messages" ON messages;

CREATE POLICY "Users can view their messages"
  ON messages FOR SELECT
  USING (
    sender_id = auth.uid()
    OR receiver_id = auth.uid()
    OR (
      organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::UUID
      AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    )
  );

-- Admin mesaj gönderebilir (mevcut policy sadece sender_id kontrolü yapar)
DROP POLICY IF EXISTS "Users can send messages" ON messages;

CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
  );

-- Admin mesajları güncelleyebilir (is_read işareti için)
DROP POLICY IF EXISTS "Users can update their messages" ON messages;

CREATE POLICY "Users can update their messages"
  ON messages FOR UPDATE
  USING (
    receiver_id = auth.uid()
    OR (
      organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::UUID
      AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    )
  );
