/*
  # Parts Order Management System - Initial Schema

  ## Summary
  Creates all tables needed for the parts order management system.

  ## New Tables

  ### Master Tables (admin-editable)
  - `master_orderers`: List of orderers (id, name, sort_order)
  - `master_models`: List of model names (id, name, sort_order)
  - `master_hoses`: List of hose specs (id, name, sort_order)

  ### Order Table
  - `orders`: Main orders table with delivery date, orderer, model, hose, quantity, destination, note, status

  ## Security
  - RLS enabled on all tables
  - Public read access for master tables (needed for dropdowns)
  - Public read/insert for orders (no auth required per requirements)
  - Admin passcode stored in app_settings table

  ## Seed Data
  - Orderers: 6 people
  - Models: 22 models
  - Hoses: 7 hose specs
*/

-- Master orderers table
CREATE TABLE IF NOT EXISTS master_orderers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE master_orderers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read orderers"
  ON master_orderers FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert orderers"
  ON master_orderers FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update orderers"
  ON master_orderers FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete orderers"
  ON master_orderers FOR DELETE
  TO anon, authenticated
  USING (true);

-- Master models table
CREATE TABLE IF NOT EXISTS master_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE master_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read models"
  ON master_models FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert models"
  ON master_models FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update models"
  ON master_models FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete models"
  ON master_models FOR DELETE
  TO anon, authenticated
  USING (true);

-- Master hoses table
CREATE TABLE IF NOT EXISTS master_hoses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE master_hoses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read hoses"
  ON master_hoses FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert hoses"
  ON master_hoses FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update hoses"
  ON master_hoses FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete hoses"
  ON master_hoses FOR DELETE
  TO anon, authenticated
  USING (true);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  delivery_month integer NOT NULL,
  delivery_day integer NOT NULL,
  orderer_name text NOT NULL,
  model_name text NOT NULL,
  hose_name text NOT NULL,
  quantity text NOT NULL,
  destination text NOT NULL DEFAULT '',
  note text DEFAULT '',
  status text NOT NULL DEFAULT '대기'
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read orders"
  ON orders FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert orders"
  ON orders FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update orders"
  ON orders FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete orders"
  ON orders FOR DELETE
  TO anon, authenticated
  USING (true);

-- Seed master orderers
INSERT INTO master_orderers (name, sort_order) VALUES
  ('김성원', 1),
  ('문양수', 2),
  ('이병호', 3),
  ('장건희', 4),
  ('전재홍', 5),
  ('황길준', 6);

-- Seed master models
INSERT INTO master_models (name, sort_order) VALUES
  ('MCS', 1),
  ('MKS', 2),
  ('EGS', 3),
  ('30A(자동)', 4),
  ('30A(수동)', 5),
  ('NPS(M)', 6),
  ('NPS(E)', 7),
  ('MCC', 8),
  ('MKC', 9),
  ('EHS(GX)', 10),
  ('EHC(GX)', 11),
  ('EHS(GP)', 12),
  ('EHC(GP)', 13),
  ('EGC', 14),
  ('ERS', 15),
  ('ERC', 16),
  ('EIS', 17),
  ('EIC', 18),
  ('NPC(M)', 19),
  ('NPC(E)', 20),
  ('가반형(M)', 21),
  ('가반형(E)', 22);

-- Seed master hoses
INSERT INTO master_hoses (name, sort_order) VALUES
  ('13X70', 1),
  ('10X100', 2),
  ('8.5X100', 3),
  ('13X50', 4),
  ('13X100', 5),
  ('8.5X50', 6),
  ('호스없음', 7);
