-- SCRIPT DE RÉINITIALISATION COMPLÈTE DE LA BASE DE DONNÉES MISAN
-- ⚠️ ATTENTION : Ce script va SUPPRIMER TOUTES les données existantes

-- 1. Supprimer toutes les politiques RLS existantes
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Only admins can manage settings" ON system_settings;
DROP POLICY IF EXISTS "Public settings are readable by all" ON system_settings;
DROP POLICY IF EXISTS "Users can manage their own alerts" ON user_alerts;

-- 2. Supprimer toutes les tables dans l'ordre inverse des dépendances
DROP TABLE IF EXISTS user_alerts CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

-- 3. Supprimer les index s'ils existent
DROP INDEX IF EXISTS idx_user_profiles_email;
DROP INDEX IF EXISTS idx_user_profiles_role;
DROP INDEX IF EXISTS idx_subscriptions_user_id;
DROP INDEX IF EXISTS idx_alerts_user_id;

-- 4. Supprimer les fonctions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- 5. Purger le bucket de stockage s'il existe
-- Note: Le bucket storage sera géré via l'interface Supabase ou code serveur

-- Message de confirmation
SELECT 'Base de données réinitialisée avec succès - toutes les données ont été supprimées' as message;