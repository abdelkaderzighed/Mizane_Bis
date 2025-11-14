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

CREATE OR REPLACE FUNCTION set_alert_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_email_templates_updated_at()
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
  subscription_status TEXT NOT NULL DEFAULT 'active' CHECK (subscription_status IN ('active', 'inactive', 'pending', 'expired')),
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
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'expired', 'cancelled')),
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

-- Table des règles d'alertes configurables
CREATE TABLE IF NOT EXISTS alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('login', 'assistant_access', 'scheduled')) DEFAULT 'scheduled',
  target TEXT NOT NULL CHECK (target IN ('subscription', 'tokens')),
  comparator TEXT NOT NULL CHECK (comparator IN ('<', '<=', '=', '>=', '>')),
  threshold INTEGER NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error')),
  message_template TEXT NOT NULL,
  applies_to_role TEXT NOT NULL CHECK (applies_to_role IN ('pro', 'premium', 'any')) DEFAULT 'any',
  is_blocking BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table des templates emails
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  recipients TEXT NOT NULL CHECK (recipients IN ('user', 'admin', 'both')),
  cc TEXT[] DEFAULT ARRAY[]::TEXT[],
  bcc TEXT[] DEFAULT ARRAY[]::TEXT[],
  body TEXT NOT NULL,
  signature TEXT NOT NULL DEFAULT 'L''équipe Misan\nVous accompagne dans votre réussite',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

-- Index pour alert_rules
CREATE UNIQUE INDEX IF NOT EXISTS idx_alert_rules_name ON alert_rules(name);

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

DROP TRIGGER IF EXISTS update_alert_rules_updated_at ON alert_rules;
CREATE TRIGGER update_alert_rules_updated_at
  BEFORE UPDATE ON alert_rules
  FOR EACH ROW EXECUTE FUNCTION set_alert_rules_updated_at();

DROP TRIGGER IF EXISTS update_email_templates_updated_at ON email_templates;
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW EXECUTE FUNCTION set_email_templates_updated_at();

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
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
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

-- Politiques pour alert_rules
DROP POLICY IF EXISTS "Admins manage alert rules" ON alert_rules;
CREATE POLICY "Admins manage alert rules" ON alert_rules
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins manage email templates" ON email_templates;
CREATE POLICY "Admins manage email templates" ON email_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

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

INSERT INTO alert_rules (name, description, trigger_type, target, comparator, threshold, severity, message_template, applies_to_role, is_blocking)
VALUES
  ('Abonnement Pro - 20 jours', 'Alerte lorsque la fin d''abonnement pro approche (20 jours).', 'scheduled', 'subscription', '=', 20, 'info', 'Votre abonnement Pro expire dans {{days}} jours.', 'pro', false),
  ('Abonnement Pro - 7 jours', 'Alerte lorsque la fin d''abonnement pro approche (7 jours).', 'scheduled', 'subscription', '=', 7, 'warning', 'Votre abonnement Pro expire dans {{days}} jours.', 'pro', false),
  ('Abonnement Pro - 2 jours', 'Alerte lorsque la fin d''abonnement pro approche (2 jours).', 'scheduled', 'subscription', '=', 2, 'error', 'Votre abonnement Pro expire dans {{days}} jours !', 'pro', true),
  ('Abonnement Premium - 5 jours', 'Alerte lorsque la fin de l''essai premium approche (5 jours).', 'scheduled', 'subscription', '=', 5, 'info', 'Votre essai gratuit se termine dans {{days}} jours.', 'premium', false),
  ('Abonnement Premium - 3 jours', 'Alerte lorsque la fin de l''essai premium approche (3 jours).', 'scheduled', 'subscription', '=', 3, 'warning', 'Votre essai gratuit se termine dans {{days}} jours.', 'premium', false),
  ('Abonnement Premium - 2 jours', 'Alerte lorsque la fin de l''essai premium approche (2 jours).', 'scheduled', 'subscription', '=', 2, 'warning', 'Votre essai gratuit se termine dans {{days}} jours.', 'premium', false),
  ('Abonnement Premium - 0 jour', 'Alerte lorsque l''essai premium se termine.', 'scheduled', 'subscription', '=', 0, 'error', 'Votre essai gratuit a expiré. Passez à un abonnement Pro.', 'premium', true),
  ('Jetons Pro - 100k', 'Alerte lorsque le solde de jetons Pro passe sous 100 000.', 'scheduled', 'tokens', '<=', 100000, 'info', 'Il vous reste {{tokens}} jetons.', 'pro', false),
  ('Jetons Pro - 50k', 'Alerte lorsque le solde de jetons Pro passe sous 50 000.', 'scheduled', 'tokens', '<=', 50000, 'warning', 'Il vous reste {{tokens}} jetons. Pensez à recharger.', 'pro', false),
  ('Jetons Pro - 0', 'Alerte lorsque le solde de jetons Pro est épuisé.', 'scheduled', 'tokens', '<=', 0, 'error', 'Votre solde de jetons est épuisé.', 'pro', true),
  ('Jetons Premium - 50k', 'Alerte lorsque le solde de jetons Premium passe sous 50 000.', 'scheduled', 'tokens', '<=', 50000, 'info', 'Il vous reste {{tokens}} jetons d''essai.', 'premium', false),
  ('Jetons Premium - 25k', 'Alerte lorsque le solde de jetons Premium passe sous 25 000.', 'scheduled', 'tokens', '<=', 25000, 'warning', 'Il vous reste {{tokens}} jetons d''essai. Pensez à recharger.', 'premium', false),
  ('Jetons Premium - 0', 'Alerte lorsque le solde de jetons Premium est épuisé.', 'scheduled', 'tokens', '<=', 0, 'error', 'Votre solde de jetons d''essai est épuisé.', 'premium', true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO email_templates (name, subject, recipients, body, cc, bcc, is_active)
VALUES
  ('Inscription', 'Bienvenue sur Misan', 'both', 'Bonjour {{user_name}},\n\nMerci pour votre inscription sur Misan. Nous avons bien reçu vos informations ({{user_email}}) et notre équipe validera votre accès dans les plus brefs délais.\n\nVous recevrez un email de confirmation dès que votre compte sera activé. En attendant, vous pouvez consulter nos offres depuis la page tarifs.\n\nÀ très vite !', ARRAY[]::TEXT[], ARRAY[]::TEXT[], TRUE),
  ('Confirmation inscription', 'Votre compte Misan est validé', 'user', 'Bonjour {{user_name}},\n\nVotre inscription vient d''être validée par notre équipe.\n\nVous disposez maintenant d''un accès complet à la plateforme.\n\nBonne utilisation !', ARRAY[]::TEXT[], ARRAY[]::TEXT[], TRUE),
  ('Confirmation achat', 'Nous avons bien reçu votre commande', 'user', 'Bonjour {{user_name}},\n\nVotre commande a bien été enregistrée.\n\nPour finaliser le paiement par virement, merci de suivre les instructions indiquées dans votre espace client.\n\nNous vous confirmerons la réception du règlement dans les plus brefs délais.', ARRAY[]::TEXT[], ARRAY[]::TEXT[], TRUE),
  ('Confirmation paiement en ligne', 'Paiement confirmé', 'user', 'Bonjour {{user_name}},\n\nNous confirmons la réception de votre paiement.\n\nVotre abonnement ou votre pack de jetons est désormais actif.\n\nMerci de votre confiance !', ARRAY[]::TEXT[], ARRAY[]::TEXT[], TRUE),
  ('Réception virement', 'Nous avons reçu votre virement', 'user', 'Bonjour {{user_name}},\n\nNous vous informons que votre virement a bien été réceptionné.\n\nVotre accès est maintenant pleinement actif.\n\nMerci pour votre paiement.', ARRAY[]::TEXT[], ARRAY[]::TEXT[], TRUE),
  ('Avertissement suspension', 'Important : votre compte Misan', 'user', 'Bonjour {{user_name}},\n\nNous constatons que votre compte présente un incident.\n\nMerci de régulariser votre situation afin d''éviter la suspension ou la suppression de votre accès.\n\nContactez-nous si vous avez besoin d''assistance.', ARRAY[]::TEXT[], ARRAY['admin.misan@parene.org']::TEXT[], TRUE),
  ('Confirmation suppression compte', 'Confirmation de suppression de votre compte Misan', 'user', 'Bonjour {{user_name}},\n\nNous vous confirmons que votre compte Misan a été supprimé et que vous n''avez plus accès à la plateforme.\n\nSi vous pensez qu''il s''agit d''une erreur ou souhaitez rouvrir un compte, contactez-nous à {{support_email}}.\n\nMerci d''avoir utilisé nos services.', ARRAY[]::TEXT[], ARRAY[]::TEXT[], TRUE),
  ('Relance paiement', 'Relance : paiement en attente', 'user', 'Bonjour {{user_name}},\n\nNous revenons vers vous concernant le paiement de votre commande toujours en attente.\n\nSans règlement sous 48h, nous serons contraints de suspendre l''accès au service.\n\nMerci de votre rapidité.', ARRAY[]::TEXT[], ARRAY['admin.misan@parene.org']::TEXT[], TRUE)
ON CONFLICT (name) DO NOTHING;

INSERT INTO email_templates (name, subject, recipients, body, cc, bcc, is_active, metadata)
VALUES (
  'modèle-de-sortie-email',
  'Modèle d''email Misan',
  'user',
  $$<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{{subject}}</title>
  <style>
    :root { color-scheme: light; }
    body {
      margin: 0;
      padding: 0;
      background-color: #f4f6fb;
      font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
      color: #0f172a;
    }
    a {
      color: #2563eb;
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#f4f6fb;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6fb; padding:32px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%; max-width:600px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 8px 24px rgba(15,23,42,0.08);">
          <tr>
            <td style="padding:28px 32px; background:linear-gradient(135deg, #1e3a8a, #2563eb); color:#f8fafc;">
              <span style="text-transform:uppercase; letter-spacing:0.08em; font-size:12px; color:#c7d2fe;">Misan</span>
              <h1 style="margin:12px 0 0; font-size:26px; line-height:1.2; font-weight:600; color:#f8fafc;">{{headline}}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px; font-size:16px; line-height:1.6;">Bonjour {{user_name}},</p>
              <p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:#475569;">{{intro}}</p>
              <p style="margin:0 0 24px; font-size:15px; line-height:1.6; color:#1f2937;">{{body_text}}</p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
                <tr>
                  <td style="background-color:#2563eb; border-radius:999px;">
                    <a href="{{cta_url}}" style="display:inline-block; padding:14px 32px; font-size:15px; font-weight:600; color:#ffffff; text-decoration:none;">{{cta_label}}</a>
                  </td>
                </tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; margin:0 0 24px;">
                <tr>
                  <td style="padding:18px 20px; border:1px solid #e2e8f0; border-radius:12px; background-color:#f8fafc;">
                    <p style="margin:0; font-size:14px; font-weight:600; color:#0f172a;">Points clés</p>
                    <p style="margin:8px 0 0; font-size:14px; line-height:1.6; color:#475569;">{{summary}}</p>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 16px; font-size:14px; line-height:1.6; color:#64748b;">Besoin d'assistance ? Contactez-nous sur <a href="mailto:support.misan@parene.org" style="color:#2563eb; text-decoration:none;">support.misan@parene.org</a>.</p>
              <p style="margin:0; font-size:14px; line-height:1.6; color:#0f172a;">Bien cordialement,<br />{{signature}}</p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#0f172a; padding:24px 32px; text-align:center; color:#cbd5f5;">
              <p style="margin:0 0 8px; font-size:12px; letter-spacing:0.06em; text-transform:uppercase;">Misan</p>
              <p style="margin:0; font-size:12px; line-height:1.6;">{{footer_links}}</p>
            </td>
          </tr>
        </table>
        <p style="margin:24px 0 0; font-size:11px; color:#94a3b8;">Vous recevez cet email car votre adresse est enregistrée sur Misan.</p>
      </td>
    </tr>
  </table>
</body>
</html>$$,
  ARRAY[]::TEXT[],
  ARRAY[]::TEXT[],
  TRUE,
  jsonb_build_object(
    'category', 'layout',
    'description', 'Template HTML stylisé servant de base à dupliquer pour les communications Misan',
    'placeholders', jsonb_build_array('headline', 'intro', 'body_text', 'cta_label', 'cta_url', 'summary', 'footer_links', 'signature')
  )
)
ON CONFLICT (name) DO UPDATE SET
  subject = EXCLUDED.subject,
  recipients = EXCLUDED.recipients,
  body = EXCLUDED.body,
  cc = EXCLUDED.cc,
  bcc = EXCLUDED.bcc,
  is_active = EXCLUDED.is_active,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

INSERT INTO email_templates (name, subject, recipients, body, cc, bcc, signature, is_active, metadata)
VALUES (
  'message-utilisateur-libre',
  'Votre message personnalisé',
  'user',
  'Bonjour {{user_name}},\n\n{{message_contenu}}\n\n',
  ARRAY[]::TEXT[],
  ARRAY[]::TEXT[],
  'L''équipe Misan\nVous accompagne dans votre réussite',
  TRUE,
  jsonb_build_object(
    'allowAttachments', true,
    'description', 'Modèle libre pour les communications personnalisées envoyées depuis la fiche utilisateur'
  )
)
ON CONFLICT (name) DO NOTHING;

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
