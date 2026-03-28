-- Inventory items table
CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text DEFAULT '',
  sku text DEFAULT '',
  unit text DEFAULT 'adet',
  unit_price numeric(10,2) DEFAULT 0,
  stock_qty integer DEFAULT 0,
  critical_stock integer DEFAULT 5,
  status text DEFAULT 'active', -- active, passive, deleted
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Inventory movements table
CREATE TABLE IF NOT EXISTS inventory_movements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  item_id uuid REFERENCES inventory_items(id) ON DELETE SET NULL,
  item_name text DEFAULT '',
  movement_type text DEFAULT 'stock_in', -- stock_in, sale, adjustment
  quantity_delta integer DEFAULT 0,
  note text DEFAULT '',
  related_payment_id uuid,
  athlete_id uuid,
  athlete_name text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY IF NOT EXISTS "inventory_items_org" ON inventory_items
  FOR ALL USING (organization_id = (SELECT (auth.jwt()->'user_metadata'->>'organization_id')::uuid));

CREATE POLICY IF NOT EXISTS "inventory_movements_org" ON inventory_movements
  FOR ALL USING (organization_id = (SELECT (auth.jwt()->'user_metadata'->>'organization_id')::uuid));
