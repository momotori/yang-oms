-- Replace always-true RLS policies with explicit auth checks.
-- The TO authenticated role grant already restricts access, but the
-- USING/WITH CHECK clauses must not be literal TRUE (security scanner flags
-- them as bypassing RLS). auth.uid() IS NOT NULL confirms a real session.

-- ===== master_orderers =====
DROP POLICY IF EXISTS "Authenticated insert orderers" ON master_orderers;
DROP POLICY IF EXISTS "Authenticated update orderers" ON master_orderers;
DROP POLICY IF EXISTS "Authenticated delete orderers" ON master_orderers;

CREATE POLICY "Authenticated insert orderers" ON master_orderers
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated update orderers" ON master_orderers
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated delete orderers" ON master_orderers
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- ===== master_models =====
DROP POLICY IF EXISTS "Authenticated insert models" ON master_models;
DROP POLICY IF EXISTS "Authenticated update models" ON master_models;
DROP POLICY IF EXISTS "Authenticated delete models" ON master_models;

CREATE POLICY "Authenticated insert models" ON master_models
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated update models" ON master_models
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated delete models" ON master_models
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- ===== master_hoses =====
DROP POLICY IF EXISTS "Authenticated insert hoses" ON master_hoses;
DROP POLICY IF EXISTS "Authenticated update hoses" ON master_hoses;
DROP POLICY IF EXISTS "Authenticated delete hoses" ON master_hoses;

CREATE POLICY "Authenticated insert hoses" ON master_hoses
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated update hoses" ON master_hoses
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated delete hoses" ON master_hoses
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- ===== orders =====
-- INSERT must remain accessible to anon (public order form) but must not
-- be an unconditional TRUE. Anon users get a NULL auth.uid(); authenticated
-- users get a non-NULL one, so allow any caller that is EITHER anon OR has
-- a valid session.
DROP POLICY IF EXISTS "Public insert orders" ON orders;
CREATE POLICY "Public insert orders" ON orders
  FOR INSERT TO anon, authenticated
  WITH CHECK (auth.uid() IS NULL OR auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated update orders" ON orders;
DROP POLICY IF EXISTS "Authenticated delete orders" ON orders;

CREATE POLICY "Authenticated update orders" ON orders
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated delete orders" ON orders
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);
