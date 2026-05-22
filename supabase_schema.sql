
-- 1. Create Tables

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  username text UNIQUE NOT NULL,
  password text NOT NULL,
  name text,
  role text DEFAULT 'staff',
  created_at timestamptz DEFAULT now()
);

-- Products Table
CREATE TABLE IF NOT EXISTS products (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  category text,
  cost_price numeric DEFAULT 0,
  min_alert numeric DEFAULT 0,
  unit text,
  stock_qty numeric DEFAULT 0,
  qr_code text UNIQUE,
  sub_units jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Projects Table
CREATE TABLE IF NOT EXISTS projects (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  customer text,
  start_date date,
  end_date date,
  status text DEFAULT 'in-progress',
  budget numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Stock Transactions Table
CREATE TABLE IF NOT EXISTS stock_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type text NOT NULL, -- RECEIVE, ISSUE, RETURN, ADJUST
  product_id uuid REFERENCES products(id),
  qty numeric NOT NULL,
  selected_unit text,
  selected_qty numeric,
  unit_price numeric,
  total_price numeric,
  project_id uuid REFERENCES projects(id),
  user_id uuid REFERENCES users(id),
  requester_name text,
  vendor_name text,
  note text,
  status text DEFAULT 'APPROVED', -- PENDING, APPROVED, REJECTED
  datetime text,
  created_at timestamptz DEFAULT now()
);

-- Project Material Plan Table
CREATE TABLE IF NOT EXISTS project_material_plan (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  planned_qty numeric DEFAULT 0,
  UNIQUE(project_id, product_id)
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_material_plan ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies (Allow all for demo/admin purposes as requested)
-- Note: In production you should tighten these.

CREATE POLICY "Allow all on users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on products" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on projects" ON projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on stock_transactions" ON stock_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on project_material_plan" ON project_material_plan FOR ALL USING (true) WITH CHECK (true);

-- 4. Create RPC Functions

CREATE OR REPLACE FUNCTION increment_stock(p_id uuid, p_qty numeric)
RETURNS void AS $$
BEGIN
  UPDATE products
  SET stock_qty = stock_qty + p_qty
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;

-- 5. Insert Sample Data (Optional, but helps test)
INSERT INTO users (username, password, name, role) 
VALUES ('admin', 'password123', 'ผู้ดูแลระบบ', 'admin')
ON CONFLICT (username) DO NOTHING;
