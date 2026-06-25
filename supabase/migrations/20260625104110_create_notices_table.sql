CREATE TABLE notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notices ENABLE ROW LEVEL SECURITY;

-- Anyone can read notices
CREATE POLICY "select_notices" ON notices FOR SELECT
  TO anon, authenticated USING (true);

-- Only authenticated admins can insert/update/delete
CREATE POLICY "insert_notices" ON notices FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "update_notices" ON notices FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "delete_notices" ON notices FOR DELETE
  TO authenticated USING (true);

-- Seed a single row that we'll always upsert
INSERT INTO notices (content) VALUES ('');
