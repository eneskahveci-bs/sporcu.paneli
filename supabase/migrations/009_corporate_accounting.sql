-- ============================================================
-- KURUMSAL MUHASEBE — gider, kasa/banka, tedarikçi, fatura,
-- bütçe, hatırlatma, banka mutabakatı (idempotent)
-- ============================================================

-- ─── Gider Kategorileri ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  color           text DEFAULT '#64748b',
  is_active       boolean DEFAULT true,
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "expcat_org" ON public.expense_categories;
CREATE POLICY "expcat_org" ON public.expense_categories FOR ALL
  USING (organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id'))
  WITH CHECK (organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id'));

-- ─── Tedarikçiler / Cari Hesaplar ───────────────────────────
CREATE TABLE IF NOT EXISTS public.suppliers (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  tax_no          text,
  tax_office      text,
  phone           text,
  email           text,
  address         text,
  notes           text,
  is_active       boolean DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "suppliers_org" ON public.suppliers;
CREATE POLICY "suppliers_org" ON public.suppliers FOR ALL
  USING (organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id'))
  WITH CHECK (organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id'));

-- ─── Kasa & Banka Hesapları ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cash_accounts (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id       uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  name            text NOT NULL,
  type            text NOT NULL DEFAULT 'cash' CHECK (type IN ('cash','bank','pos','online')),
  bank_name       text,
  iban            text,
  currency        text DEFAULT 'TL',
  opening_balance numeric(14,2) DEFAULT 0,
  is_active       boolean DEFAULT true,
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE public.cash_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cashacc_org" ON public.cash_accounts;
CREATE POLICY "cashacc_org" ON public.cash_accounts FOR ALL
  USING (organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id'))
  WITH CHECK (organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id'));

-- ─── Kasa Hareketleri (account ledger) ──────────────────────
CREATE TABLE IF NOT EXISTS public.account_transactions (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  account_id      uuid NOT NULL REFERENCES public.cash_accounts(id) ON DELETE CASCADE,
  direction       text NOT NULL CHECK (direction IN ('in','out')),
  amount          numeric(14,2) NOT NULL,
  description     text,
  category        text,
  related_payment_id  uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  transfer_account_id uuid REFERENCES public.cash_accounts(id) ON DELETE SET NULL,
  occurred_at     date DEFAULT current_date,
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE public.account_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "acctx_org" ON public.account_transactions;
CREATE POLICY "acctx_org" ON public.account_transactions FOR ALL
  USING (organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id'))
  WITH CHECK (organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id'));
CREATE INDEX IF NOT EXISTS idx_acctx_account ON public.account_transactions(account_id, occurred_at DESC);

-- Hesap bakiyesi view (açılış + giriş − çıkış)
CREATE OR REPLACE VIEW public.account_balances AS
SELECT
  ca.id AS account_id,
  ca.organization_id,
  ca.name,
  ca.type,
  ca.currency,
  ca.opening_balance
    + COALESCE((SELECT SUM(CASE WHEN t.direction='in' THEN t.amount ELSE -t.amount END)
                FROM public.account_transactions t WHERE t.account_id = ca.id), 0) AS balance
FROM public.cash_accounts ca;
GRANT SELECT ON public.account_balances TO authenticated;

-- ─── Giderler (zengin gider kaydı) ──────────────────────────
CREATE TABLE IF NOT EXISTS public.expenses (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id       uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  category_id     uuid REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  supplier_id     uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  account_id      uuid REFERENCES public.cash_accounts(id) ON DELETE SET NULL,
  description     text NOT NULL,
  amount          numeric(14,2) NOT NULL,
  vat_rate        numeric(5,2) DEFAULT 0,
  vat_amount      numeric(14,2) DEFAULT 0,
  status          text DEFAULT 'paid' CHECK (status IN ('paid','pending','cancelled')),
  expense_date    date DEFAULT current_date,
  document_no     text,
  notes           text,
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "expenses_org" ON public.expenses;
CREATE POLICY "expenses_org" ON public.expenses FOR ALL
  USING (organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id'))
  WITH CHECK (organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id'));
CREATE INDEX IF NOT EXISTS idx_expenses_org_date ON public.expenses(organization_id, expense_date DESC);

-- ─── Faturalar / Makbuzlar (sıralı no + KDV) ────────────────
CREATE TABLE IF NOT EXISTS public.invoice_counters (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  year            int NOT NULL,
  last_no         int NOT NULL DEFAULT 0,
  PRIMARY KEY (organization_id, year)
);
ALTER TABLE public.invoice_counters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "invcounter_org" ON public.invoice_counters;
CREATE POLICY "invcounter_org" ON public.invoice_counters FOR ALL
  USING (organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id'))
  WITH CHECK (organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id'));

CREATE TABLE IF NOT EXISTS public.invoices (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invoice_no      text NOT NULL,
  type            text DEFAULT 'receipt' CHECK (type IN ('receipt','invoice','proforma')),
  athlete_id      uuid REFERENCES public.athletes(id) ON DELETE SET NULL,
  customer_name   text NOT NULL,
  customer_tax_no text,
  customer_address text,
  subtotal        numeric(14,2) NOT NULL DEFAULT 0,
  vat_rate        numeric(5,2) DEFAULT 0,
  vat_amount      numeric(14,2) DEFAULT 0,
  total           numeric(14,2) NOT NULL DEFAULT 0,
  status          text DEFAULT 'issued' CHECK (status IN ('draft','issued','paid','cancelled')),
  einvoice_uuid   text,
  einvoice_status text DEFAULT 'none' CHECK (einvoice_status IN ('none','queued','sent','accepted','rejected')),
  issued_at       date DEFAULT current_date,
  notes           text,
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz DEFAULT now(),
  UNIQUE(organization_id, invoice_no)
);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "invoices_org" ON public.invoices;
CREATE POLICY "invoices_org" ON public.invoices FOR ALL
  USING (organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id'))
  WITH CHECK (organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id'));

CREATE TABLE IF NOT EXISTS public.invoice_items (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id  uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity    numeric(10,2) NOT NULL DEFAULT 1,
  unit_price  numeric(14,2) NOT NULL DEFAULT 0,
  vat_rate    numeric(5,2) DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "invitems_org" ON public.invoice_items;
CREATE POLICY "invitems_org" ON public.invoice_items FOR ALL
  USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id
    AND i.organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id
    AND i.organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id')));

-- Sıralı fatura numarası üret (org + yıl bazlı, satır kilidiyle)
CREATE OR REPLACE FUNCTION public.next_invoice_no(p_org uuid)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_year int := EXTRACT(YEAR FROM current_date);
  v_no   int;
BEGIN
  INSERT INTO public.invoice_counters (organization_id, year, last_no)
  VALUES (p_org, v_year, 1)
  ON CONFLICT (organization_id, year)
  DO UPDATE SET last_no = public.invoice_counters.last_no + 1
  RETURNING last_no INTO v_no;

  RETURN v_year::text || '-' || LPAD(v_no::text, 5, '0');
END;
$$;
GRANT EXECUTE ON FUNCTION public.next_invoice_no TO authenticated;

-- ─── Bütçe (planlanan vs gerçekleşen) ───────────────────────
CREATE TABLE IF NOT EXISTS public.budgets (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  year            int NOT NULL,
  month           int CHECK (month BETWEEN 1 AND 12),
  type            text NOT NULL CHECK (type IN ('income','expense')),
  category        text NOT NULL,
  planned_amount  numeric(14,2) NOT NULL DEFAULT 0,
  notes           text,
  created_at      timestamptz DEFAULT now(),
  UNIQUE(organization_id, year, month, type, category)
);
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "budgets_org" ON public.budgets;
CREATE POLICY "budgets_org" ON public.budgets FOR ALL
  USING (organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id'))
  WITH CHECK (organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id'));

-- ─── Otomatik Hatırlatma Ayarları ───────────────────────────
CREATE TABLE IF NOT EXISTS public.reminder_settings (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  enabled         boolean DEFAULT false,
  days_before     int[] DEFAULT ARRAY[3,1],
  days_after      int[] DEFAULT ARRAY[1,3,7],
  channels        text[] DEFAULT ARRAY['email'],
  late_fee_enabled boolean DEFAULT false,
  late_fee_pct    numeric(5,2) DEFAULT 0,
  late_fee_grace_days int DEFAULT 0,
  message_template text,
  updated_at      timestamptz DEFAULT now()
);
ALTER TABLE public.reminder_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reminders_org" ON public.reminder_settings;
CREATE POLICY "reminders_org" ON public.reminder_settings FOR ALL
  USING (organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id'))
  WITH CHECK (organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id'));

-- ─── Banka Ekstresi / Mutabakat ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.bank_statements (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  account_id      uuid REFERENCES public.cash_accounts(id) ON DELETE SET NULL,
  txn_date        date NOT NULL,
  description     text,
  amount          numeric(14,2) NOT NULL,
  direction       text CHECK (direction IN ('in','out')),
  matched_payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  matched_expense_id uuid REFERENCES public.expenses(id) ON DELETE SET NULL,
  status          text DEFAULT 'unmatched' CHECK (status IN ('unmatched','matched','ignored')),
  raw_line        text,
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE public.bank_statements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bankstmt_org" ON public.bank_statements;
CREATE POLICY "bankstmt_org" ON public.bank_statements FOR ALL
  USING (organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id'))
  WITH CHECK (organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id'));

-- ─── Alacak Yaşlandırma View (vadesi geçmiş aidat) ──────────
CREATE OR REPLACE VIEW public.receivables_aging AS
SELECT
  p.organization_id,
  p.athlete_id,
  p.athlete_name,
  p.id AS payment_id,
  p.amount,
  p.due_date,
  (current_date - p.due_date) AS days_overdue,
  CASE
    WHEN p.due_date >= current_date THEN 'current'
    WHEN current_date - p.due_date BETWEEN 1 AND 30 THEN 'd1_30'
    WHEN current_date - p.due_date BETWEEN 31 AND 60 THEN 'd31_60'
    WHEN current_date - p.due_date BETWEEN 61 AND 90 THEN 'd61_90'
    ELSE 'd90_plus'
  END AS bucket
FROM public.payments p
WHERE p.type = 'income'
  AND p.status IN ('pending','overdue')
  AND p.due_date IS NOT NULL;
GRANT SELECT ON public.receivables_aging TO authenticated;
