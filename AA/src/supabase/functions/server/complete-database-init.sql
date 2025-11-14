-- Script complet d'initialisation de la base de données Misan
-- Assistant juridique virtuel pour professionnels du droit algérien
-- Version: 1.0
-- Date: Janvier 2025

-- ============================================
-- ÉTAPE 1: CRÉATION DES FONCTIONS UTILITAIRES
-- ============================================

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ÉTAPE 2: CRÉATION DES TABLES PRINCIPALES
-- ============================================

-- Table des profils utilisateurs (étend auth.users)
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
  phone TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  company TEXT,
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
  payment_method TEXT CHECK (payment_method IN ('card_cib', 'card_visa', 'bank_transfer', 'edahabia', 'free')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'cancelled')),
  amount_da INTEGER DEFAULT 0, -- Montant en dinars algériens
  renewal_date TIMESTAMPTZ,
  auto_renewal BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des transactions financières
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('subscription', 'tokens', 'refund')),
  description TEXT NOT NULL,
  amount_da INTEGER NOT NULL, -- Montant en dinars algériens HT
  tax_amount_da INTEGER DEFAULT 0, -- TVA si applicable
  total_amount_da INTEGER NOT NULL, -- Montant TTC
  tokens_amount INTEGER DEFAULT 0, -- Nombre de jetons si applicable
  payment_method TEXT NOT NULL CHECK (payment_method IN ('card_cib', 'card_visa', 'bank_transfer', 'edahabia', 'free', 'admin')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'cancelled', 'refunded')),
  reference_id TEXT, -- Référence externe (ID transaction bancaire, etc.)
  invoice_number TEXT, -- Numéro de facture généré
  subscription_id UUID REFERENCES subscriptions(id),
  processed_by UUID REFERENCES auth.users(id), -- Admin qui a traité la transaction
  processed_at TIMESTAMPTZ,
  payment_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des alertes utilisateur
CREATE TABLE IF NOT EXISTS user_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('subscription', 'tokens', 'payment', 'system')),
  level TEXT NOT NULL CHECK (level IN ('info', 'warning', 'error')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  is_dismissed BOOLEAN NOT NULL DEFAULT FALSE,
  action_url TEXT, -- URL pour action liée à l'alerte
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table des paramètres système
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'alerts', 'pricing', 'features')),
  is_public BOOLEAN DEFAULT FALSE, -- Si le paramètre peut être lu par tous
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des logs d'utilisation IA
CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('chat', 'document_generation', 'analysis', 'search', 'correction', 'translation')),
  agent_used TEXT CHECK (agent_used IN ('conversation', 'writing', 'correction', 'analysis', 'creative', 'technical')),
  llm_model TEXT, -- Modèle LLM utilisé (gpt4, claude, etc.)
  tokens_consumed INTEGER NOT NULL DEFAULT 0,
  input_length INTEGER DEFAULT 0,
  output_length INTEGER DEFAULT 0,
  processing_time_ms INTEGER DEFAULT 0,
  success BOOLEAN NOT NULL DEFAULT TRUE,
  error_message TEXT,
  cost_estimation DECIMAL(10,4) DEFAULT 0, -- Coût estimé en dinars
  session_id TEXT, -- ID de session pour grouper les interactions
  metadata JSONB, -- Informations supplémentaires (paramètres, contexte, etc.)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table des factures
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES transactions(id),
  invoice_number TEXT UNIQUE NOT NULL,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  subtotal_da INTEGER NOT NULL, -- Montant HT
  tax_rate DECIMAL(5,2) DEFAULT 19.00, -- Taux de TVA (19% en Algérie)
  tax_amount_da INTEGER NOT NULL, -- Montant TVA
  total_da INTEGER NOT NULL, -- Montant TTC
  currency TEXT DEFAULT 'DZD',
  billing_address JSONB, -- Adresse de facturation
  line_items JSONB, -- Détail des lignes de facturation
  notes TEXT,
  pdf_url TEXT, -- URL du PDF généré
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ÉTAPE 3: CRÉATION DES INDEX
-- ============================================

-- Index pour user_profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription_status ON user_profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription_end ON user_profiles(subscription_end);
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at ON user_profiles(created_at);

-- Index pour subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_end_date ON subscriptions(end_date);
CREATE INDEX IF NOT EXISTS idx_subscriptions_renewal_date ON subscriptions(renewal_date);

-- Index pour transactions
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_reference_id ON transactions(reference_id);
CREATE INDEX IF NOT EXISTS idx_transactions_invoice_number ON transactions(invoice_number);

-- Index pour user_alerts
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON user_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_is_read ON user_alerts(is_read);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON user_alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON user_alerts(type);

-- Index pour ai_usage_logs
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_id ON ai_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created_at ON ai_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_action_type ON ai_usage_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_ai_usage_session_id ON ai_usage_logs(session_id);

-- Index pour invoices
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON invoices(issue_date);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);

-- ============================================
-- ÉTAPE 4: CRÉATION DES TRIGGERS
-- ============================================

-- Triggers pour updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings;
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ÉTAPE 5: CONFIGURATION DE LA SÉCURITÉ RLS
-- ============================================

-- Activer RLS sur toutes les tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Politiques pour user_profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
CREATE POLICY "Admins can view all profiles" ON user_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can manage all profiles" ON user_profiles;
CREATE POLICY "Admins can manage all profiles" ON user_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Politiques pour subscriptions
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON subscriptions;
CREATE POLICY "Users can view their own subscriptions" ON subscriptions
  FOR SELECT USING (
    user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Politiques pour transactions
DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;
CREATE POLICY "Users can view their own transactions" ON transactions
  FOR SELECT USING (
    user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Politiques pour user_alerts
DROP POLICY IF EXISTS "Users can manage their own alerts" ON user_alerts;
CREATE POLICY "Users can manage their own alerts" ON user_alerts
  FOR ALL USING (user_id = auth.uid());

-- Politiques pour system_settings
DROP POLICY IF EXISTS "Only admins can manage settings" ON system_settings;
CREATE POLICY "Only admins can manage settings" ON system_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Public settings are readable by all" ON system_settings;
CREATE POLICY "Public settings are readable by all" ON system_settings
  FOR SELECT USING (is_public = TRUE);

-- Politiques pour ai_usage_logs
DROP POLICY IF EXISTS "Users can view their own usage logs" ON ai_usage_logs;
CREATE POLICY "Users can view their own usage logs" ON ai_usage_logs
  FOR SELECT USING (
    user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Politiques pour invoices
DROP POLICY IF EXISTS "Users can view their own invoices" ON invoices;
CREATE POLICY "Users can view their own invoices" ON invoices
  FOR SELECT USING (
    user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- ÉTAPE 6: INITIALISATION DES PARAMÈTRES SYSTÈME
-- ============================================

-- Paramètres d'alertes pour abonnés Pro
INSERT INTO system_settings (key, value, description, category) VALUES
-- Alertes abonnement Pro
('alert_pro_subscription_20d', 'true', 'Alerte abonnement Pro à 20 jours', 'alerts'),
('alert_pro_subscription_7d', 'true', 'Alerte abonnement Pro à 7 jours', 'alerts'),
('alert_pro_subscription_2d', 'true', 'Alerte abonnement Pro à 2 jours', 'alerts'),
('alert_pro_subscription_0d', 'true', 'Alerte abonnement Pro le jour même', 'alerts'),

-- Alertes jetons Pro
('alert_pro_tokens_100k', 'true', 'Alerte tokens Pro à 100 000', 'alerts'),
('alert_pro_tokens_50k', 'true', 'Alerte tokens Pro à 50 000', 'alerts'),
('alert_pro_tokens_10k', 'true', 'Alerte tokens Pro à 10 000', 'alerts'),
('alert_pro_tokens_0', 'true', 'Alerte tokens Pro à 0', 'alerts'),

-- Alertes abonnement Premium (essai gratuit)
('alert_premium_subscription_5d', 'true', 'Alerte abonnement Premium à 5 jours', 'alerts'),
('alert_premium_subscription_3d', 'true', 'Alerte abonnement Premium à 3 jours', 'alerts'),
('alert_premium_subscription_2d', 'true', 'Alerte abonnement Premium à 2 jours', 'alerts'),
('alert_premium_subscription_0d', 'true', 'Alerte abonnement Premium le dernier jour', 'alerts'),

-- Alertes jetons Premium
('alert_premium_tokens_50k', 'true', 'Alerte tokens Premium à 50 000', 'alerts'),
('alert_premium_tokens_25k', 'true', 'Alerte tokens Premium à 25 000', 'alerts'),
('alert_premium_tokens_10k', 'true', 'Alerte tokens Premium à 10 000', 'alerts'),
('alert_premium_tokens_0', 'true', 'Alerte tokens Premium à 0', 'alerts'),

-- Paramètres généraux
('trial_duration_days', '7', 'Durée essai gratuit en jours', 'general'),
('trial_tokens_amount', '100000', 'Nombre de tokens pour l''essai gratuit', 'general'),
('monthly_subscription_price', '4000', 'Prix abonnement mensuel en DA HT', 'pricing'),

-- Paramètres de tarification
('tokens_pack_50k_price', '1000', 'Prix pack 50k jetons en DA HT', 'pricing'),
('tokens_pack_100k_price', '1800', 'Prix pack 100k jetons en DA HT', 'pricing'),
('tokens_pack_250k_price', '4000', 'Prix pack 250k jetons en DA HT', 'pricing'),
('tokens_pack_500k_price', '7500', 'Prix pack 500k jetons en DA HT', 'pricing'),

-- Paramètres de facturation
('tax_rate', '19.00', 'Taux de TVA en pourcentage', 'pricing'),
('invoice_due_days', '30', 'Délai de paiement facture en jours', 'general'),
('company_name', 'Misan Technologies', 'Nom de l''entreprise', 'general'),
('company_address', 'Alger, Algérie', 'Adresse de l''entreprise', 'general'),

-- Paramètres techniques
('max_tokens_per_request', '4000', 'Nombre maximum de tokens par requête IA', 'features'),
('max_requests_per_hour', '100', 'Nombre maximum de requêtes par heure', 'features'),
('max_document_size_mb', '10', 'Taille maximum document en MB', 'features'),

-- Paramètres publics (accessibles à tous les utilisateurs)
('app_version', '1.0.0', 'Version de l''application', 'general'),
('maintenance_mode', 'false', 'Mode maintenance activé', 'general'),
('support_email', 'support@misan.dz', 'Email de support', 'general'),
('support_phone', '+213 XX XX XX XX', 'Téléphone de support', 'general')

ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  updated_at = NOW();

-- Marquer certains paramètres comme publics
UPDATE system_settings SET is_public = TRUE WHERE key IN (
  'app_version', 'support_email', 'support_phone', 'company_name'
);

-- ============================================
-- ÉTAPE 7: FONCTIONS UTILITAIRES
-- ============================================

-- Fonction pour vérifier et mettre à jour les abonnements expirés
CREATE OR REPLACE FUNCTION check_and_update_expired_subscriptions()
RETURNS TEXT AS $$
DECLARE
  expired_count INTEGER := 0;
BEGIN
  -- Mettre à jour les profils dont l'abonnement a expiré
  UPDATE user_profiles 
  SET 
    subscription_status = 'expired',
    updated_at = NOW()
  WHERE 
    subscription_end < NOW() 
    AND subscription_status = 'active'
    AND role != 'admin';

  GET DIAGNOSTICS expired_count = ROW_COUNT;

  -- Mettre à jour les abonnements expirés
  UPDATE subscriptions 
  SET 
    status = 'expired',
    updated_at = NOW()
  WHERE 
    end_date < NOW() 
    AND status = 'active';

  RETURN 'Abonnements expirés mis à jour: ' || expired_count;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour générer le prochain numéro de facture
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  current_year TEXT;
  current_month TEXT;
  next_number INTEGER;
  invoice_number TEXT;
BEGIN
  current_year := EXTRACT(YEAR FROM NOW())::TEXT;
  current_month := LPAD(EXTRACT(MONTH FROM NOW())::TEXT, 2, '0');
  
  -- Trouver le prochain numéro pour le mois en cours
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM '(\d+)$') AS INTEGER)), 0) + 1
  INTO next_number
  FROM invoices
  WHERE invoice_number LIKE 'MISAN-' || current_year || current_month || '-%';
  
  invoice_number := 'MISAN-' || current_year || current_month || '-' || LPAD(next_number::TEXT, 4, '0');
  
  RETURN invoice_number;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour calculer le coût estimé d'une requête IA
CREATE OR REPLACE FUNCTION calculate_ai_cost(
  tokens_consumed INTEGER,
  model_used TEXT DEFAULT 'gpt4'
)
RETURNS DECIMAL(10,4) AS $$
DECLARE
  cost_per_token DECIMAL(10,6);
  estimated_cost DECIMAL(10,4);
BEGIN
  -- Coûts approximatifs par token en dinars algériens
  cost_per_token := CASE model_used
    WHEN 'gpt4' THEN 0.0001
    WHEN 'gpt35' THEN 0.00005
    WHEN 'claude35sonnet' THEN 0.00008
    WHEN 'claude3haiku' THEN 0.00003
    ELSE 0.00005
  END;
  
  estimated_cost := tokens_consumed * cost_per_token;
  
  RETURN ROUND(estimated_cost, 4);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ÉTAPE 8: CRÉATION UTILISATEUR ADMIN
-- ============================================

-- Note: L'utilisateur admin doit être créé via Supabase Auth API
-- Cette section sera exécutée par le serveur Edge Function

-- Exemple de création d'un utilisateur admin (à adapter selon votre implémentation)
/*
-- Cette partie sera gérée par le code TypeScript du serveur
INSERT INTO user_profiles (
  id, 
  email, 
  name, 
  role, 
  subscription_type, 
  subscription_status,
  subscription_start,
  subscription_end,
  tokens_balance, 
  trial_used,
  created_at
) VALUES (
  'admin-uuid-here', -- ID généré par Supabase Auth
  'zighed@zighed.com',
  'Administrateur Misan',
  'admin',
  'admin',
  'active',
  NOW(),
  '2030-12-31 23:59:59+00', -- Admin sans expiration
  999999999, -- Jetons illimités
  false,
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  subscription_type = 'admin',
  subscription_status = 'active',
  tokens_balance = 999999999,
  updated_at = NOW();
*/

-- ============================================
-- SCRIPT D'INITIALISATION TERMINÉ
-- ============================================

-- Pour vérifier que tout s'est bien passé
SELECT 
  'Tables créées: ' || COUNT(*) as result
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'user_profiles', 
    'subscriptions', 
    'transactions', 
    'user_alerts', 
    'system_settings', 
    'ai_usage_logs', 
    'invoices'
  );

-- Afficher les paramètres système créés
SELECT 
  'Paramètres système initialisés: ' || COUNT(*) as result
FROM system_settings;

-- Message de fin
SELECT 'Base de données Misan initialisée avec succès !' as message;