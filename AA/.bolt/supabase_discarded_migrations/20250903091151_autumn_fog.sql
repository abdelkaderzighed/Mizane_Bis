@@ .. @@
 -- ============================================
 -- ÉTAPE 2: CRÉATION DES TABLES PRINCIPALES
 -- ============================================
 
+-- Table de stockage clé-valeur pour l'application
+CREATE TABLE IF NOT EXISTS kv_store_810b4099 (
+  key TEXT PRIMARY KEY,
+  value JSONB NOT NULL,
+  created_at TIMESTAMPTZ DEFAULT NOW(),
+  updated_at TIMESTAMPTZ DEFAULT NOW()
+);
+
 -- Table des profils utilisateurs (étend auth.users)
 CREATE TABLE IF NOT EXISTS user_profiles (
@@ .. @@
 -- Index pour user_profiles
 CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
 CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
 CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription_status ON user_profiles(subscription_status);
 CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription_end ON user_profiles(subscription_end);
 CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at ON user_profiles(created_at);
 
+-- Index pour kv_store_810b4099
+CREATE INDEX IF NOT EXISTS idx_kv_store_810b4099_key ON kv_store_810b4099(key);
+
 -- Index pour subscriptions
@@ .. @@
 -- Triggers pour updated_at
 DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
 CREATE TRIGGER update_user_profiles_updated_at
   BEFORE UPDATE ON user_profiles
   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
 
+DROP TRIGGER IF EXISTS update_kv_store_810b4099_updated_at ON kv_store_810b4099;
+CREATE TRIGGER update_kv_store_810b4099_updated_at
+  BEFORE UPDATE ON kv_store_810b4099
+  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
+
 DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
@@ .. @@
 -- Activer RLS sur toutes les tables
 ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
 ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
 ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
 ALTER TABLE user_alerts ENABLE ROW LEVEL SECURITY;
 ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
 ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;
 ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
+ALTER TABLE kv_store_810b4099 ENABLE ROW LEVEL SECURITY;
 
+-- Politiques pour kv_store_810b4099
+DROP POLICY IF EXISTS "Authenticated users can manage kv_store data" ON kv_store_810b4099;
+CREATE POLICY "Authenticated users can manage kv_store data" ON kv_store_810b4099
+  FOR ALL TO authenticated USING (true) WITH CHECK (true);
+
+DROP POLICY IF EXISTS "Service role has full access to kv_store" ON kv_store_810b4099;
+CREATE POLICY "Service role has full access to kv_store" ON kv_store_810b4099
+  FOR ALL TO service_role USING (true) WITH CHECK (true);
+
 -- Politiques pour user_profiles
@@ .. @@
 SELECT 
   'Tables créées: ' || COUNT(*) as result
 FROM information_schema.tables 
 WHERE table_schema = 'public' 
   AND table_name IN (
+    'kv_store_810b4099',
     'user_profiles', 
     'subscriptions', 
     'transactions', 
     'user_alerts', 
     'system_settings', 
     'ai_usage_logs', 
     'invoices'
   );