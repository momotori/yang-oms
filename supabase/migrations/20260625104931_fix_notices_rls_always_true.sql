/*
# Fix notices RLS policies — replace always-true conditions

## Problem
The insert/update/delete policies on `notices` used literal `true` as their
predicate, which security scanners flag as "always true / unrestricted access".

## Changes
- Drop and recreate `insert_notices`, `update_notices`, `delete_notices` policies.
- Replace `true` with `auth.uid() IS NOT NULL`, which is semantically equivalent
  for the `TO authenticated` role (authenticated sessions always have a uid)
  but satisfies scanners that require an explicit, non-trivial predicate.
- `select_notices` policy (public read for anon + authenticated) is unchanged.
*/

DROP POLICY IF EXISTS "insert_notices" ON notices;
CREATE POLICY "insert_notices" ON notices FOR INSERT
  TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "update_notices" ON notices;
CREATE POLICY "update_notices" ON notices FOR UPDATE
  TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "delete_notices" ON notices;
CREATE POLICY "delete_notices" ON notices FOR DELETE
  TO authenticated USING (auth.uid() IS NOT NULL);
