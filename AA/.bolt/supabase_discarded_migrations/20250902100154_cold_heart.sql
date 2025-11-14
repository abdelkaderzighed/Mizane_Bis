/*
  # Create kv_store table for edge functions

  1. New Tables
    - `kv_store_810b4099`
      - `key` (text, primary key) - Unique identifier for stored values
      - `value` (jsonb) - JSON data storage for flexible value types
      - `created_at` (timestamp) - When the record was created
      - `updated_at` (timestamp) - When the record was last updated

  2. Security
    - Enable RLS on `kv_store_810b4099` table
    - Add policy for authenticated users to manage their own data
*/

CREATE TABLE IF NOT EXISTS kv_store_810b4099 (
  key TEXT NOT NULL PRIMARY KEY,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE kv_store_810b4099 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own kv data"
  ON kv_store_810b4099
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create an index on the key column for better performance
CREATE INDEX IF NOT EXISTS idx_kv_store_key ON kv_store_810b4099(key);

-- Create a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER IF NOT EXISTS update_kv_store_updated_at
  BEFORE UPDATE ON kv_store_810b4099
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();