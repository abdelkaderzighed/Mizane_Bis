-- Script rapide d'initialisation de la base de données Misan
-- Version simplifiée pour déploiement immédiat

-- ============================================
-- CRÉATION DES TABLES ESSENTIELLES
-- ============================================

-- Table des profils utilisateurs
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'premium' CHECK (role IN ('admin', 'pro', 'premium')),
  subscription_type TEXT NOT NULL DEFAULT 'premium' CHECK (subscription_type IN ('admin', 'pro', 'premium')),
  subscription_status TEXT NOT NULL DEFAULT 'active' CHECK (subscription_status IN ('active', 'inactive', 'expired')),
  subscription_start TIMESTAMPTZ DEFAULT NOW(),
  subscription_end TIMESTAMPTZ,
  tokens_balance INTEGER NOT NULL DEFAULT 0,
  trial_used BOOLEAN NOT NULL DEFAULT FALSE,
  avatar_url TEXT,
  secondary_email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT,
  billing_address TEXT,
  billing_city TEXT,
  billing_postal_code TEXT,
  billing_country TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des abonnements
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('admin', 'pro', 'premium')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired', 'cancelled')),
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ,
  tokens_included INTEGER NOT NULL DEFAULT 0,
  is_trial BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table des paramètres système
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEX ESSENTIELS
-- ============================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS secondary_email TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS billing_address TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS billing_city TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS billing_postal_code TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS billing_country TEXT;

-- ============================================
-- SÉCURITÉ RLS BASIQUE
-- ============================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Politique utilisateurs peuvent voir leur profil
CREATE POLICY IF NOT EXISTS "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

-- Politique admin peut tout voir
CREATE POLICY IF NOT EXISTS "Admins can view all" ON user_profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- PARAMÈTRES SYSTÈME ESSENTIELS
-- ============================================

INSERT INTO system_settings (key, value, description) VALUES
('trial_duration_days', '7', 'Durée essai gratuit en jours'),
('trial_tokens_amount', '100000', 'Jetons pour essai gratuit'),
('monthly_subscription_price', '4000', 'Prix abonnement mensuel DA HT'),
('alert_pro_subscription_7d', 'true', 'Alerte abonnement Pro 7 jours'),
('alert_premium_subscription_3d', 'true', 'Alerte essai gratuit 3 jours'),
('alert_pro_tokens_50k', 'true', 'Alerte tokens Pro 50k'),
('alert_premium_tokens_10k', 'true', 'Alerte tokens Premium 10k')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- ============================================
-- FONCTION UTILITAIRE SIMPLE
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour user_profiles
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Message de confirmation
SELECT 'Base de données Misan - Configuration rapide terminée !' as message;
