-- Script d'initialisation de l'utilisateur admin Misan
-- À exécuter après la création des tables principales

-- ============================================
-- CRÉATION DE L'UTILISATEUR ADMIN INITIAL
-- ============================================

-- Note: L'utilisateur doit d'abord être créé via Supabase Auth
-- Utilisez cette requête dans votre code TypeScript :
/*
const { data: adminUser, error: authError } = await supabase.auth.admin.createUser({
  email: 'a@a.a',
  password: 'admin',
  user_metadata: { 
    name: 'Administrateur Misan',
    role: 'admin'
  },
  email_confirm: true
});
*/

-- Après la création via Auth, insérer le profil admin
-- Remplacez 'ADMIN_UUID_HERE' par l'UUID réel retourné par Supabase Auth

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
  'ADMIN_UUID_HERE', -- Remplacer par l'UUID réel de l'admin
  'a@a.a',
  'Administrateur Misan',
  'admin',
  'admin',
  'active',
  NOW(),
  '2030-12-31 23:59:59+00', -- Admin sans expiration jusqu'en 2030
  999999999, -- Jetons illimités (999 millions)
  false, -- Admin n'utilise pas d'essai
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  subscription_type = 'admin',
  subscription_status = 'active',
  tokens_balance = 999999999,
  subscription_end = '2030-12-31 23:59:59+00',
  updated_at = NOW();

-- Créer l'abonnement admin permanent
INSERT INTO subscriptions (
  user_id,
  type,
  status,
  start_date,
  end_date,
  tokens_included,
  is_trial
) VALUES (
  'ADMIN_UUID_HERE', -- Remplacer par l'UUID réel de l'admin
  'admin',
  'active',
  NOW(),
  '2030-12-31 23:59:59+00',
  999999999,
  false
) ON CONFLICT DO NOTHING;

-- Vérification
SELECT 
  'Utilisateur admin créé: ' || email || ' (ID: ' || id || ')' as message
FROM user_profiles 
WHERE role = 'admin' AND email = 'a@a.a';