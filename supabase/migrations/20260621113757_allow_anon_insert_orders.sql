/*
# Re-allow anon inserts on orders

## Summary
The public order-submission form (MainPage) lets any visitor create an order,
so INSERT on orders must remain open to anon. UPDATE and DELETE on orders stay
authenticated-only (admin-only operations performed from the AdminPage after
sign-in). Read stays public.

## Security
- orders INSERT: anon + authenticated (intentional public order submission).
- orders SELECT: anon + authenticated (public list/status views).
- orders UPDATE / DELETE: authenticated only (admin).
*/

DROP POLICY IF EXISTS "Authenticated insert orders" ON orders;
CREATE POLICY "Public insert orders"
  ON orders FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
