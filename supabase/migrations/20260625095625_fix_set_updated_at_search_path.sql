/*
# Fix mutable search_path in set_updated_at function

## Problem
The `public.set_updated_at` trigger function had a role-mutable search_path,
which is a security risk. An attacker with the ability to manipulate the search_path
could redirect function calls to malicious objects.

## Fix
Recreate the function with `SET search_path = ''` and use the fully-qualified
`pg_catalog.now()` reference so the function is immune to search_path manipulation.
*/

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = pg_catalog.now();
  RETURN NEW;
END;
$$;
