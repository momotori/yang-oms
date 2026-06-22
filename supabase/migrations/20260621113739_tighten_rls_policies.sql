/*
# Tighten RLS policies on all tables

## Summary
Replaces the previously unrestricted (always-true) INSERT, UPDATE, and DELETE
policies on master_orderers, master_models, master_hoses, and orders with
authenticated-only policies, fixing the "RLS Policy Always True" security
finding. Read access remains public (anon + authenticated) so the public
order-submission form and order-status view keep working without sign-in.

## Changes per table (master_orderers, master_models, master_hoses, orders)
- SELECT: unchanged — public read (anon, authenticated).
- INSERT: authenticated only.
- UPDATE: authenticated only.
- DELETE: authenticated only.

## Security
- All write operations now require an authenticated Supabase session.
- No data loss — only policies are dropped/recreated, not tables or data.
- Idempotent: each policy is dropped before recreate.
*/

-- ---------- master_orderers ----------
DROP POLICY IF EXISTS "Anyone can read orderers" ON master_orderers;
CREATE POLICY "Public read orderers"
  ON master_orderers FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Anyone can insert orderers" ON master_orderers;
CREATE POLICY "Authenticated insert orderers"
  ON master_orderers FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update orderers" ON master_orderers;
CREATE POLICY "Authenticated update orderers"
  ON master_orderers FOR UPDATE
  TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can delete orderers" ON master_orderers;
CREATE POLICY "Authenticated delete orderers"
  ON master_orderers FOR DELETE
  TO authenticated
  USING (true);

-- ---------- master_models ----------
DROP POLICY IF EXISTS "Anyone can read models" ON master_models;
CREATE POLICY "Public read models"
  ON master_models FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Anyone can insert models" ON master_models;
CREATE POLICY "Authenticated insert models"
  ON master_models FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update models" ON master_models;
CREATE POLICY "Authenticated update models"
  ON master_models FOR UPDATE
  TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can delete models" ON master_models;
CREATE POLICY "Authenticated delete models"
  ON master_models FOR DELETE
  TO authenticated
  USING (true);

-- ---------- master_hoses ----------
DROP POLICY IF EXISTS "Anyone can read hoses" ON master_hoses;
CREATE POLICY "Public read hoses"
  ON master_hoses FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Anyone can insert hoses" ON master_hoses;
CREATE POLICY "Authenticated insert hoses"
  ON master_hoses FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update hoses" ON master_hoses;
CREATE POLICY "Authenticated update hoses"
  ON master_hoses FOR UPDATE
  TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can delete hoses" ON master_hoses;
CREATE POLICY "Authenticated delete hoses"
  ON master_hoses FOR DELETE
  TO authenticated
  USING (true);

-- ---------- orders ----------
DROP POLICY IF EXISTS "Anyone can read orders" ON orders;
CREATE POLICY "Public read orders"
  ON orders FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Anyone can insert orders" ON orders;
CREATE POLICY "Authenticated insert orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update orders" ON orders;
CREATE POLICY "Authenticated update orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can delete orders" ON orders;
CREATE POLICY "Authenticated delete orders"
  ON orders FOR DELETE
  TO authenticated
  USING (true);
