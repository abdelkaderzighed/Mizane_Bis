/*
  # Création des fonctions de base de données Misan

  1. Fonctions de création de tables
    - `create_user_profiles_table()` - Table des profils utilisateurs
    - `create_subscriptions_table()` - Table des abonnements
    - `create_transactions_table()` - Table des transactions
    - `create_alerts_table()` - Table des alertes utilisateur
    - `create_settings_table()` - Table des paramètres système
    - `create_ai_usage_logs_table()` - Table des logs d'utilisation IA

  2. Fonctions utilitaires
    - `update_updated_at_column()` - Trigger pour updated_at
    - `create_updated_at_triggers()` - Création des triggers
    - `check_and_update_expired_subscriptions()` - Vérification abonnements expirés
    - `generate_automatic_alerts()` - Génération d'alertes automatiques

  3. Sécurité
    - Activation RLS sur toutes les tables
    - Politiques d'accès pour utilisateurs et admins
*/

-- Fonction pour créer la table des profils utilisateurs
CREATE OR REPLACE FUNCTION create_user_profiles_table()
RETURNS TEXT AS $$
BEGIN
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

  -- Index pour optimiser les requêtes
  CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
  CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
  CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription_status ON user_profiles(subscription_status);
  CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription_end ON user_profiles(subscription_end);

  -- Politique RLS pour la sécurité
  ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

  -- Politique : les utilisateurs peuvent voir leur propre profil
  DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
  CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

  -- Politique : les utilisateurs peuvent modifier leur propre profil
  DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
  CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

  -- Politique : les admins peuvent tout voir
  DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
  CREATE POLICY "Admins can view all profiles" ON user_profiles
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() AND role = 'admin'
      )
    );

  -- Politique : les admins peuvent tout gérer
  DROP POLICY IF EXISTS "Admins can manage all profiles" ON user_profiles;
  CREATE POLICY "Admins can manage all profiles" ON user_profiles
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() AND role = 'admin'
      )
    );

  RETURN 'Table user_profiles créée avec succès';
END;
$$ LANGUAGE plpgsql;

-- Fonction pour créer la table des abonnements
CREATE OR REPLACE FUNCTION create_subscriptions_table()
RETURNS TEXT AS $$
BEGIN
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
    amount_da INTEGER DEFAULT 0,
    renewal_date TIMESTAMPTZ,
    auto_renewal BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Index pour optimiser les requêtes
  CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
  CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
  CREATE INDEX IF NOT EXISTS idx_subscriptions_end_date ON subscriptions(end_date);
  CREATE INDEX IF NOT EXISTS idx_subscriptions_renewal_date ON subscriptions(renewal_date);

  -- Politique RLS
  ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "Users can view their own subscriptions" ON subscriptions;
  CREATE POLICY "Users can view their own subscriptions" ON subscriptions
    FOR SELECT USING (
      user_id = auth.uid() OR 
      EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

  DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON subscriptions;
  CREATE POLICY "Admins can manage all subscriptions" ON subscriptions
    FOR ALL USING (
      EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

  RETURN 'Table subscriptions créée avec succès';
END;
$$ LANGUAGE plpgsql;

-- Fonction pour créer la table des transactions
CREATE OR REPLACE FUNCTION create_transactions_table()
RETURNS TEXT AS $$
BEGIN
  CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('subscription', 'tokens', 'refund')),
    description TEXT NOT NULL,
    amount_da INTEGER NOT NULL,
    tax_amount_da INTEGER DEFAULT 0,
    total_amount_da INTEGER NOT NULL,
    tokens_amount INTEGER DEFAULT 0,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('card_cib', 'card_visa', 'bank_transfer', 'edahabia', 'free', 'admin')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'cancelled', 'refunded')),
    reference_id TEXT,
    invoice_number TEXT,
    subscription_id UUID REFERENCES subscriptions(id),
    processed_by UUID REFERENCES auth.users(id),
    processed_at TIMESTAMPTZ,
    payment_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Index pour optimiser les requêtes
  CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
  CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
  CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
  CREATE INDEX IF NOT EXISTS idx_transactions_reference_id ON transactions(reference_id);
  CREATE INDEX IF NOT EXISTS idx_transactions_invoice_number ON transactions(invoice_number);

  -- Politique RLS
  ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;
  CREATE POLICY "Users can view their own transactions" ON transactions
    FOR SELECT USING (
      user_id = auth.uid() OR 
      EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

  DROP POLICY IF EXISTS "Admins can manage all transactions" ON transactions;
  CREATE POLICY "Admins can manage all transactions" ON transactions
    FOR ALL USING (
      EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

  RETURN 'Table transactions créée avec succès';
END;
$$ LANGUAGE plpgsql;

-- Fonction pour créer la table des alertes
CREATE OR REPLACE FUNCTION create_alerts_table()
RETURNS TEXT AS $$
BEGIN
  CREATE TABLE IF NOT EXISTS user_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('subscription', 'tokens', 'payment', 'system')),
    level TEXT NOT NULL CHECK (level IN ('info', 'warning', 'error')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    is_dismissed BOOLEAN NOT NULL DEFAULT FALSE,
    action_url TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- Index pour optimiser les requêtes
  CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON user_alerts(user_id);
  CREATE INDEX IF NOT EXISTS idx_alerts_is_read ON user_alerts(is_read);
  CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON user_alerts(created_at);
  CREATE INDEX IF NOT EXISTS idx_alerts_type ON user_alerts(type);

  -- Politique RLS
  ALTER TABLE user_alerts ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "Users can manage their own alerts" ON user_alerts;
  CREATE POLICY "Users can manage their own alerts" ON user_alerts
    FOR ALL USING (user_id = auth.uid());

  DROP POLICY IF EXISTS "Admins can view all alerts" ON user_alerts;
  CREATE POLICY "Admins can view all alerts" ON user_alerts
    FOR SELECT USING (
      EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

  RETURN 'Table user_alerts créée avec succès';
END;
$$ LANGUAGE plpgsql;

-- Fonction pour créer la table des paramètres système
CREATE OR REPLACE FUNCTION create_settings_table()
RETURNS TEXT AS $$
BEGIN
  CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'general' CHECK (category IN ('general', 'alerts', 'pricing', 'features')),
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Index pour optimiser les requêtes
  CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);
  CREATE INDEX IF NOT EXISTS idx_system_settings_is_public ON system_settings(is_public);

  -- Politique RLS
  ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

  -- Seuls les admins peuvent gérer les paramètres
  DROP POLICY IF EXISTS "Only admins can manage settings" ON system_settings;
  CREATE POLICY "Only admins can manage settings" ON system_settings
    FOR ALL USING (
      EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

  -- Les paramètres publics sont lisibles par tous
  DROP POLICY IF EXISTS "Public settings are readable by all" ON system_settings;
  CREATE POLICY "Public settings are readable by all" ON system_settings
    FOR SELECT USING (is_public = TRUE);

  RETURN 'Table system_settings créée avec succès';
END;
$$ LANGUAGE plpgsql;

-- Fonction pour créer la table des logs d'utilisation IA
CREATE OR REPLACE FUNCTION create_ai_usage_logs_table()
RETURNS TEXT AS $$
BEGIN
  CREATE TABLE IF NOT EXISTS ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN ('chat', 'document_generation', 'analysis', 'search', 'correction', 'translation')),
    agent_used TEXT CHECK (agent_used IN ('conversation', 'writing', 'correction', 'analysis', 'creative', 'technical')),
    llm_model TEXT,
    tokens_consumed INTEGER NOT NULL DEFAULT 0,
    input_length INTEGER DEFAULT 0,
    output_length INTEGER DEFAULT 0,
    processing_time_ms INTEGER DEFAULT 0,
    success BOOLEAN NOT NULL DEFAULT TRUE,
    error_message TEXT,
    cost_estimation DECIMAL(10,4) DEFAULT 0,
    session_id TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- Index pour optimiser les requêtes
  CREATE INDEX IF NOT EXISTS idx_ai_usage_user_id ON ai_usage_logs(user_id);
  CREATE INDEX IF NOT EXISTS idx_ai_usage_created_at ON ai_usage_logs(created_at);
  CREATE INDEX IF NOT EXISTS idx_ai_usage_action_type ON ai_usage_logs(action_type);
  CREATE INDEX IF NOT EXISTS idx_ai_usage_session_id ON ai_usage_logs(session_id);

  -- Politique RLS
  ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "Users can view their own usage logs" ON ai_usage_logs;
  CREATE POLICY "Users can view their own usage logs" ON ai_usage_logs
    FOR SELECT USING (
      user_id = auth.uid() OR 
      EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

  DROP POLICY IF EXISTS "System can insert usage logs" ON ai_usage_logs;
  CREATE POLICY "System can insert usage logs" ON ai_usage_logs
    FOR INSERT WITH CHECK (true);

  RETURN 'Table ai_usage_logs créée avec succès';
END;
$$ LANGUAGE plpgsql;

-- Fonction pour créer la table des factures
CREATE OR REPLACE FUNCTION create_invoices_table()
RETURNS TEXT AS $$
BEGIN
  CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES transactions(id),
    invoice_number TEXT UNIQUE NOT NULL,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
    subtotal_da INTEGER NOT NULL,
    tax_rate DECIMAL(5,2) DEFAULT 20.00,
    tax_amount_da INTEGER NOT NULL,
    total_da INTEGER NOT NULL,
    currency TEXT DEFAULT 'DZD',
    billing_address JSONB,
    line_items JSONB,
    notes TEXT,
    pdf_url TEXT,
    sent_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Index pour optimiser les requêtes
  CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
  CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
  CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON invoices(issue_date);
  CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);

  -- Politique RLS
  ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "Users can view their own invoices" ON invoices;
  CREATE POLICY "Users can view their own invoices" ON invoices
    FOR SELECT USING (
      user_id = auth.uid() OR 
      EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

  DROP POLICY IF EXISTS "Admins can manage all invoices" ON invoices;
  CREATE POLICY "Admins can manage all invoices" ON invoices
    FOR ALL USING (
      EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

  RETURN 'Table invoices créée avec succès';
END;
$$ LANGUAGE plpgsql;

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer les triggers pour updated_at
CREATE OR REPLACE FUNCTION create_updated_at_triggers()
RETURNS TEXT AS $$
BEGIN
  -- Trigger pour user_profiles
  DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
  CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

  -- Trigger pour subscriptions
  DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
  CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

  -- Trigger pour transactions
  DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
  CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

  -- Trigger pour system_settings
  DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings;
  CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

  -- Trigger pour invoices
  DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
  CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

  RETURN 'Triggers updated_at créés avec succès';
END;
$$ LANGUAGE plpgsql;

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

-- Fonction pour générer des alertes automatiques
CREATE OR REPLACE FUNCTION generate_automatic_alerts()
RETURNS TEXT AS $$
DECLARE
  alert_count INTEGER := 0;
  user_record RECORD;
  days_until_expiry INTEGER;
  setting_value TEXT;
BEGIN
  -- Parcourir tous les utilisateurs actifs
  FOR user_record IN 
    SELECT * FROM user_profiles 
    WHERE subscription_status = 'active' AND role != 'admin'
  LOOP
    days_until_expiry := EXTRACT(DAY FROM (user_record.subscription_end - NOW()));

    -- Alertes pour les abonnés Pro
    IF user_record.role = 'pro' THEN
      -- Alerte abonnement à 20 jours
      IF days_until_expiry = 20 THEN
        SELECT value INTO setting_value FROM system_settings WHERE key = 'alert_pro_subscription_20d';
        IF setting_value = 'true' THEN
          INSERT INTO user_alerts (user_id, type, level, title, message)
          VALUES (
            user_record.id, 
            'subscription', 
            'info', 
            'Abonnement Pro', 
            'Votre abonnement Pro expire dans 20 jours'
          );
          alert_count := alert_count + 1;
        END IF;
      END IF;

      -- Alerte abonnement à 7 jours
      IF days_until_expiry = 7 THEN
        SELECT value INTO setting_value FROM system_settings WHERE key = 'alert_pro_subscription_7d';
        IF setting_value = 'true' THEN
          INSERT INTO user_alerts (user_id, type, level, title, message)
          VALUES (
            user_record.id, 
            'subscription', 
            'warning', 
            'Abonnement Pro', 
            'Votre abonnement Pro expire dans 7 jours'
          );
          alert_count := alert_count + 1;
        END IF;
      END IF;

      -- Alerte abonnement à 2 jours
      IF days_until_expiry = 2 THEN
        SELECT value INTO setting_value FROM system_settings WHERE key = 'alert_pro_subscription_2d';
        IF setting_value = 'true' THEN
          INSERT INTO user_alerts (user_id, type, level, title, message)
          VALUES (
            user_record.id, 
            'subscription', 
            'warning', 
            'Abonnement Pro', 
            'Votre abonnement Pro expire dans 2 jours'
          );
          alert_count := alert_count + 1;
        END IF;
      END IF;

      -- Alerte abonnement jour J
      IF days_until_expiry = 0 THEN
        SELECT value INTO setting_value FROM system_settings WHERE key = 'alert_pro_subscription_0d';
        IF setting_value = 'true' THEN
          INSERT INTO user_alerts (user_id, type, level, title, message)
          VALUES (
            user_record.id, 
            'subscription', 
            'error', 
            'Abonnement Pro expiré', 
            'Votre abonnement Pro expire aujourd\'hui'
          );
          alert_count := alert_count + 1;
        END IF;
      END IF;

      -- Alertes jetons Pro
      IF user_record.tokens_balance <= 100000 THEN
        SELECT value INTO setting_value FROM system_settings WHERE key = 'alert_pro_tokens_100k';
        IF setting_value = 'true' THEN
          INSERT INTO user_alerts (user_id, type, level, title, message)
          VALUES (
            user_record.id, 
            'tokens', 
            'warning', 
            'Jetons faibles', 
            'Il vous reste ' || user_record.tokens_balance || ' jetons'
          );
          alert_count := alert_count + 1;
        END IF;
      END IF;
    END IF;

    -- Alertes pour les abonnés Premium (essai gratuit)
    IF user_record.role = 'premium' THEN
      -- Alerte essai gratuit à 5 jours
      IF days_until_expiry = 5 THEN
        SELECT value INTO setting_value FROM system_settings WHERE key = 'alert_premium_subscription_5d';
        IF setting_value = 'true' THEN
          INSERT INTO user_alerts (user_id, type, level, title, message)
          VALUES (
            user_record.id, 
            'subscription', 
            'info', 
            'Essai gratuit', 
            'Votre essai gratuit se termine dans 5 jours'
          );
          alert_count := alert_count + 1;
        END IF;
      END IF;

      -- Alerte essai gratuit à 3 jours
      IF days_until_expiry = 3 THEN
        SELECT value INTO setting_value FROM system_settings WHERE key = 'alert_premium_subscription_3d';
        IF setting_value = 'true' THEN
          INSERT INTO user_alerts (user_id, type, level, title, message)
          VALUES (
            user_record.id, 
            'subscription', 
            'warning', 
            'Essai gratuit', 
            'Votre essai gratuit se termine dans 3 jours'
          );
          alert_count := alert_count + 1;
        END IF;
      END IF;

      -- Alerte essai gratuit à 2 jours
      IF days_until_expiry = 2 THEN
        SELECT value INTO setting_value FROM system_settings WHERE key = 'alert_premium_subscription_2d';
        IF setting_value = 'true' THEN
          INSERT INTO user_alerts (user_id, type, level, title, message)
          VALUES (
            user_record.id, 
            'subscription', 
            'warning', 
            'Essai gratuit', 
            'Votre essai gratuit se termine dans 2 jours'
          );
          alert_count := alert_count + 1;
        END IF;
      END IF;

      -- Alerte essai gratuit dernier jour
      IF days_until_expiry = 0 THEN
        SELECT value INTO setting_value FROM system_settings WHERE key = 'alert_premium_subscription_0d';
        IF setting_value = 'true' THEN
          INSERT INTO user_alerts (user_id, type, level, title, message)
          VALUES (
            user_record.id, 
            'subscription', 
            'error', 
            'Essai gratuit expiré', 
            'Votre essai gratuit expire aujourd\'hui'
          );
          alert_count := alert_count + 1;
        END IF;
      END IF;

      -- Alertes jetons Premium
      IF user_record.tokens_balance <= 50000 THEN
        SELECT value INTO setting_value FROM system_settings WHERE key = 'alert_premium_tokens_50k';
        IF setting_value = 'true' THEN
          INSERT INTO user_alerts (user_id, type, level, title, message)
          VALUES (
            user_record.id, 
            'tokens', 
            'warning', 
            'Jetons faibles', 
            'Il vous reste ' || user_record.tokens_balance || ' jetons'
          );
          alert_count := alert_count + 1;
        END IF;
      END IF;

      IF user_record.tokens_balance <= 10000 THEN
        SELECT value INTO setting_value FROM system_settings WHERE key = 'alert_premium_tokens_10k';
        IF setting_value = 'true' THEN
          INSERT INTO user_alerts (user_id, type, level, title, message)
          VALUES (
            user_record.id, 
            'tokens', 
            'error', 
            'Jetons très faibles', 
            'Il vous reste seulement ' || user_record.tokens_balance || ' jetons'
          );
          alert_count := alert_count + 1;
        END IF;
      END IF;
    END IF;
  END LOOP;

  RETURN 'Alertes générées: ' || alert_count;
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
    WHEN 'gemini' THEN 0.00004
    WHEN 'llama2' THEN 0.00002
    WHEN 'mistral' THEN 0.00003
    WHEN 'palm2' THEN 0.00003
    ELSE 0.00005
  END;
  
  estimated_cost := tokens_consumed * cost_per_token;
  
  RETURN ROUND(estimated_cost, 4);
END;
$$ LANGUAGE plpgsql;

-- Fonction pour initialiser tous les paramètres système
CREATE OR REPLACE FUNCTION initialize_system_settings()
RETURNS TEXT AS $$
DECLARE
  settings_count INTEGER := 0;
BEGIN
  -- Paramètres d'essai gratuit
  INSERT INTO system_settings (key, value, description, category, is_public) VALUES
  ('trial_duration_days', '7', 'Durée essai gratuit en jours', 'general', false),
  ('trial_tokens_amount', '100000', 'Nombre de tokens pour l''essai gratuit', 'general', false),
  
  -- Paramètres de tarification
  ('monthly_subscription_price', '4000', 'Prix abonnement mensuel en DA HT', 'pricing', false),
  ('tokens_pack_1m_price', '1000', 'Prix pack 1M jetons en DA HT', 'pricing', false),
  ('tax_rate', '20.00', 'Taux de TVA en pourcentage', 'pricing', false),
  
  -- Paramètres d'alertes Pro
  ('alert_pro_subscription_20d', 'true', 'Alerte abonnement Pro à 20 jours', 'alerts', false),
  ('alert_pro_subscription_7d', 'true', 'Alerte abonnement Pro à 7 jours', 'alerts', false),
  ('alert_pro_subscription_2d', 'true', 'Alerte abonnement Pro à 2 jours', 'alerts', false),
  ('alert_pro_subscription_0d', 'true', 'Alerte abonnement Pro le jour même', 'alerts', false),
  
  -- Paramètres d'alertes jetons Pro
  ('alert_pro_tokens_100k', 'true', 'Alerte tokens Pro à 100 000', 'alerts', false),
  ('alert_pro_tokens_50k', 'true', 'Alerte tokens Pro à 50 000', 'alerts', false),
  ('alert_pro_tokens_10k', 'true', 'Alerte tokens Pro à 10 000', 'alerts', false),
  ('alert_pro_tokens_0', 'true', 'Alerte tokens Pro à 0', 'alerts', false),
  
  -- Paramètres d'alertes Premium
  ('alert_premium_subscription_5d', 'true', 'Alerte abonnement Premium à 5 jours', 'alerts', false),
  ('alert_premium_subscription_3d', 'true', 'Alerte abonnement Premium à 3 jours', 'alerts', false),
  ('alert_premium_subscription_2d', 'true', 'Alerte abonnement Premium à 2 jours', 'alerts', false),
  ('alert_premium_subscription_0d', 'true', 'Alerte abonnement Premium le dernier jour', 'alerts', false),
  
  -- Paramètres d'alertes jetons Premium
  ('alert_premium_tokens_50k', 'true', 'Alerte tokens Premium à 50 000', 'alerts', false),
  ('alert_premium_tokens_25k', 'true', 'Alerte tokens Premium à 25 000', 'alerts', false),
  ('alert_premium_tokens_10k', 'true', 'Alerte tokens Premium à 10 000', 'alerts', false),
  ('alert_premium_tokens_0', 'true', 'Alerte tokens Premium à 0', 'alerts', false),
  
  -- Paramètres généraux publics
  ('app_version', '1.0.0', 'Version de l''application', 'general', true),
  ('support_email', 'support@misan.dz', 'Email de support', 'general', true),
  ('support_phone', '+213 XX XX XX XX', 'Téléphone de support', 'general', true),
  ('company_name', 'Misan Technologies', 'Nom de l''entreprise', 'general', true),
  ('maintenance_mode', 'false', 'Mode maintenance activé', 'general', false),
  
  -- Paramètres techniques
  ('max_tokens_per_request', '4000', 'Nombre maximum de tokens par requête IA', 'features', false),
  ('max_requests_per_hour', '100', 'Nombre maximum de requêtes par heure', 'features', false),
  ('max_document_size_mb', '10', 'Taille maximum document en MB', 'features', false)
  
  ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    is_public = EXCLUDED.is_public,
    updated_at = NOW();

  GET DIAGNOSTICS settings_count = ROW_COUNT;

  RETURN 'Paramètres système initialisés: ' || settings_count;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour créer toutes les tables en une fois
CREATE OR REPLACE FUNCTION create_all_misan_tables()
RETURNS TEXT AS $$
DECLARE
  result TEXT := '';
  temp_result TEXT;
BEGIN
  -- Créer toutes les tables
  SELECT create_user_profiles_table() INTO temp_result;
  result := result || temp_result || E'\n';
  
  SELECT create_subscriptions_table() INTO temp_result;
  result := result || temp_result || E'\n';
  
  SELECT create_transactions_table() INTO temp_result;
  result := result || temp_result || E'\n';
  
  SELECT create_alerts_table() INTO temp_result;
  result := result || temp_result || E'\n';
  
  SELECT create_settings_table() INTO temp_result;
  result := result || temp_result || E'\n';
  
  SELECT create_ai_usage_logs_table() INTO temp_result;
  result := result || temp_result || E'\n';
  
  SELECT create_invoices_table() INTO temp_result;
  result := result || temp_result || E'\n';
  
  SELECT create_updated_at_triggers() INTO temp_result;
  result := result || temp_result || E'\n';
  
  SELECT initialize_system_settings() INTO temp_result;
  result := result || temp_result || E'\n';

  RETURN 'Toutes les tables Misan créées avec succès:' || E'\n' || result;
END;
$$ LANGUAGE plpgsql;