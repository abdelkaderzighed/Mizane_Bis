CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_settings_key ON public.system_settings(key);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON public.system_settings
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to update" ON public.system_settings
  FOR ALL USING (auth.role() = 'authenticated');

INSERT INTO public.system_settings (key, value, description) VALUES
  ('pricing_subscription_monthly_price', '"29.99"'::jsonb, 'Prix mensuel'),
  ('pricing_subscription_monthly_tokens', '"1000000"'::jsonb, 'Tokens inclus'),
  ('pricing_subscription_currency', '"EUR"'::jsonb, 'Devise'),
  ('pricing_tokens_price_per_million', '"10"'::jsonb, 'Prix/million tokens'),
  ('pricing_tokens_currency', '"EUR"'::jsonb, 'Devise tokens'),
  ('pricing_discounts', '{}'::jsonb, 'Réductions'),
  ('pricing_vat_enabled', 'true'::jsonb, 'TVA activée'),
  ('pricing_vat_rate', '"20"'::jsonb, 'Taux TVA'),
  ('payment_method_settings', '{}'::jsonb, 'Moyens paiement')
ON CONFLICT (key) DO NOTHING;
