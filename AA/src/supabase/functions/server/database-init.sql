-- Fonctions SQL pour initialiser la base de données Misan
-- Conforme aux consignes : gestion utilisateurs, abonnements, jetons, alertes

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
    subscription_end TIMESTAMPTZ,
    tokens_balance INTEGER NOT NULL DEFAULT 0,
    trial_used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Index pour optimiser les requêtes
  CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
  CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
  CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription_status ON user_profiles(subscription_status);

  -- Politique RLS pour la sécurité
  ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

  -- Politique : les utilisateurs peuvent voir leur propre profil
  CREATE POLICY IF NOT EXISTS "Users can view their own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

  -- Politique : les utilisateurs peuvent modifier leur propre profil
  CREATE POLICY IF NOT EXISTS "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

  -- Politique : les admins peuvent tout voir
  CREATE POLICY IF NOT EXISTS "Admins can view all profiles" ON user_profiles
    FOR SELECT USING (
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
    payment_method TEXT CHECK (payment_method IN ('card', 'bank_transfer', 'free')),
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'cancelled')),
    amount_da INTEGER DEFAULT 0, -- Montant en dinars algériens
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Index pour optimiser les requêtes
  CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
  CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
  CREATE INDEX IF NOT EXISTS idx_subscriptions_end_date ON subscriptions(end_date);

  -- Politique RLS
  ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

  CREATE POLICY IF NOT EXISTS "Users can view their own subscriptions" ON subscriptions
    FOR SELECT USING (
      user_id = auth.uid() OR 
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
    amount_da INTEGER NOT NULL, -- Montant en dinars algériens
    tokens_amount INTEGER DEFAULT 0, -- Nombre de jetons si applicable
    payment_method TEXT NOT NULL CHECK (payment_method IN ('card', 'bank_transfer', 'free', 'admin')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'cancelled', 'refunded')),
    reference_id TEXT, -- Référence externe (ID transaction bancaire, etc.)
    subscription_id UUID REFERENCES subscriptions(id),
    processed_by UUID REFERENCES auth.users(id), -- Admin qui a traité la transaction
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Index pour optimiser les requêtes
  CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
  CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
  CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
  CREATE INDEX IF NOT EXISTS idx_transactions_reference_id ON transactions(reference_id);

  -- Politique RLS
  ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

  CREATE POLICY IF NOT EXISTS "Users can view their own transactions" ON transactions
    FOR SELECT USING (
      user_id = auth.uid() OR 
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
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- Index pour optimiser les requêtes
  CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON user_alerts(user_id);
  CREATE INDEX IF NOT EXISTS idx_alerts_is_read ON user_alerts(is_read);
  CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON user_alerts(created_at);

  -- Politique RLS
  ALTER TABLE user_alerts ENABLE ROW LEVEL SECURITY;

  CREATE POLICY IF NOT EXISTS "Users can view their own alerts" ON user_alerts
    FOR SELECT USING (user_id = auth.uid());

  CREATE POLICY IF NOT EXISTS "Users can update their own alerts" ON user_alerts
    FOR UPDATE USING (user_id = auth.uid());

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

  -- Politique RLS
  ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

  -- Seuls les admins peuvent gérer les paramètres
  CREATE POLICY IF NOT EXISTS "Only admins can manage settings" ON system_settings
    FOR ALL USING (
      EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    )
    WITH CHECK (
      EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

  CREATE POLICY IF NOT EXISTS "Public settings are readable by all" ON system_settings
    FOR SELECT USING (is_public = TRUE);

  RETURN 'Table system_settings créée avec succès';
END;
$$ LANGUAGE plpgsql;

-- Fonction pour créer la table des règles d'alertes
CREATE OR REPLACE FUNCTION create_alert_rules_table()
RETURNS TEXT AS $$
BEGIN
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

  CREATE UNIQUE INDEX IF NOT EXISTS idx_alert_rules_name ON alert_rules(name);

  ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;

  CREATE POLICY IF NOT EXISTS "Admins manage alert rules" ON alert_rules
    FOR ALL USING (
      EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    )
    WITH CHECK (
      EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

  RETURN 'Table alert_rules créée avec succès';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_email_templates_table()
RETURNS TEXT AS $$
BEGIN
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

  ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

  CREATE POLICY IF NOT EXISTS "Admins manage email templates" ON email_templates
    FOR ALL USING (
      EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    )
    WITH CHECK (
      EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

  RETURN 'Table email_templates créée avec succès';
END;
$$ LANGUAGE plpgsql;

-- Fonction pour créer la table des logs d'utilisation IA
CREATE OR REPLACE FUNCTION create_ai_usage_logs_table()
RETURNS TEXT AS $$
BEGIN
  CREATE TABLE IF NOT EXISTS ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN ('chat', 'document_generation', 'analysis', 'search')),
    tokens_consumed INTEGER NOT NULL DEFAULT 0,
    input_length INTEGER DEFAULT 0,
    output_length INTEGER DEFAULT 0,
    model_used TEXT,
    success BOOLEAN NOT NULL DEFAULT TRUE,
    error_message TEXT,
    metadata JSONB, -- Informations supplémentaires
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- Index pour optimiser les requêtes
  CREATE INDEX IF NOT EXISTS idx_ai_usage_user_id ON ai_usage_logs(user_id);
  CREATE INDEX IF NOT EXISTS idx_ai_usage_created_at ON ai_usage_logs(created_at);
  CREATE INDEX IF NOT EXISTS idx_ai_usage_action_type ON ai_usage_logs(action_type);

  -- Politique RLS
  ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

  CREATE POLICY IF NOT EXISTS "Users can view their own usage logs" ON ai_usage_logs
    FOR SELECT USING (
      user_id = auth.uid() OR 
      EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

  RETURN 'Table ai_usage_logs créée avec succès';
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

  -- Trigger pour alert_rules
  DROP TRIGGER IF EXISTS update_alert_rules_updated_at ON alert_rules;
  CREATE TRIGGER update_alert_rules_updated_at
    BEFORE UPDATE ON alert_rules
    FOR EACH ROW EXECUTE FUNCTION set_alert_rules_updated_at();

  -- Trigger pour email_templates
  DROP TRIGGER IF EXISTS update_email_templates_updated_at ON email_templates;
  CREATE TRIGGER update_email_templates_updated_at
    BEFORE UPDATE ON email_templates
    FOR EACH ROW EXECUTE FUNCTION set_email_templates_updated_at();

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

CREATE OR REPLACE FUNCTION generate_automatic_alerts()
RETURNS TEXT AS $$
DECLARE
  alert_count INTEGER := 0;
  user_record RECORD;
  rule_record RECORD;
  days_until_expiry INTEGER;
  metric_value INTEGER;
  matches_condition BOOLEAN;
  alert_message TEXT;
  alert_title TEXT;
  alert_type TEXT;
BEGIN
  FOR user_record IN
    SELECT id, role, tokens_balance, subscription_end
    FROM user_profiles
    WHERE subscription_status = 'active' AND role != 'admin'
  LOOP
    days_until_expiry := NULL;
    IF user_record.subscription_end IS NOT NULL THEN
      days_until_expiry := FLOOR(EXTRACT(EPOCH FROM (user_record.subscription_end - NOW())) / 86400)::INTEGER;
    END IF;

    FOR rule_record IN
      SELECT *
      FROM alert_rules
      WHERE is_active = TRUE
        AND (applies_to_role = 'any' OR applies_to_role = user_record.role)
    LOOP
      metric_value := NULL;
      matches_condition := FALSE;
      alert_type := rule_record.target;

      IF rule_record.target = 'subscription' THEN
        IF days_until_expiry IS NULL THEN
          CONTINUE;
        END IF;
        metric_value := days_until_expiry;
      ELSIF rule_record.target = 'tokens' THEN
        metric_value := user_record.tokens_balance;
      END IF;

      IF metric_value IS NULL THEN
        CONTINUE;
      END IF;

      CASE rule_record.comparator
        WHEN '<' THEN matches_condition := metric_value < rule_record.threshold;
        WHEN '<=' THEN matches_condition := metric_value <= rule_record.threshold;
        WHEN '=' THEN matches_condition := metric_value = rule_record.threshold;
        WHEN '>=' THEN matches_condition := metric_value >= rule_record.threshold;
        WHEN '>' THEN matches_condition := metric_value > rule_record.threshold;
        ELSE matches_condition := FALSE;
      END CASE;

      IF matches_condition THEN
        alert_title := rule_record.name;
        alert_message := rule_record.message_template;
        alert_message := REPLACE(alert_message, '{{days}}', COALESCE(days_until_expiry::TEXT, '0'));
        alert_message := REPLACE(alert_message, '{{tokens}}', GREATEST(user_record.tokens_balance, 0)::TEXT);

        IF NOT EXISTS (
          SELECT 1 FROM user_alerts
          WHERE user_id = user_record.id
            AND type = alert_type
            AND title = alert_title
            AND message = alert_message
            AND is_read = FALSE
        ) THEN
          INSERT INTO user_alerts (user_id, type, level, title, message)
          VALUES (
            user_record.id,
            alert_type,
            rule_record.severity,
            alert_title,
            alert_message
          );
          alert_count := alert_count + 1;
        END IF;
      END IF;
    END LOOP;
  END LOOP;

  RETURN 'Alertes générées: ' || alert_count;
END;
$$ LANGUAGE plpgsql;
