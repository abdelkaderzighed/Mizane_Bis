# Instructions pour créer les tables PostgreSQL dans Supabase

## Problème
La table `user_profiles` et les autres tables nécessaires n'existent pas dans votre base de données Supabase, ce qui empêche l'authentification de fonctionner correctement.

## Solution
Vous devez créer manuellement les tables en exécutant le script SQL dans Supabase Dashboard.

## Étapes détaillées

### 1. Accéder à Supabase Dashboard
1. Allez sur [https://supabase.com](https://supabase.com)
2. Connectez-vous à votre compte
3. Sélectionnez votre projet Misan

### 2. Ouvrir l'éditeur SQL
1. Dans le menu de gauche, cliquez sur **"SQL Editor"**
2. Cliquez sur **"New query"** pour créer une nouvelle requête

### 3. Exécuter le script d'initialisation
1. Copiez le contenu du fichier `/misan-database-init-script.sql`
2. Collez-le dans l'éditeur SQL de Supabase
3. Cliquez sur **"Run"** pour exécuter le script

### 4. Vérifier la création des tables
Après l'exécution, vous devriez voir dans l'onglet **"Table Editor"** :
- ✅ `user_profiles`
- ✅ `subscriptions`
- ✅ `system_settings`
- ✅ `user_alerts`
- ✅ `transactions`
- ✅ `ai_usage_logs`
- ✅ `invoices`

### 5. Réessayer l'initialisation
1. Retournez dans votre application Misan
2. Cliquez à nouveau sur **"Initialiser la base de données"**
3. Cette fois, l'utilisateur admin devrait être créé avec succès dans PostgreSQL

## Script SQL à exécuter (extrait principal)

```sql
-- Table des profils utilisateurs
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
  amount_da INTEGER DEFAULT 0,
  renewal_date TIMESTAMPTZ,
  auto_renewal BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activer RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour user_profiles
CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can manage all profiles" ON user_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

## Alternative : Mode KV Store uniquement

Si vous ne pouvez pas créer les tables PostgreSQL :

1. **L'authentification fonctionne déjà avec le KV store**
2. L'utilisateur admin est créé dans le KV store lors de l'initialisation
3. Vous pouvez vous connecter avec :
   - Email: `zighed@zighed.com`
   - Mot de passe: `admin`

## Vérification finale

Après avoir créé les tables, testez la connexion :
1. Cliquez sur "Initialiser la base de données"
2. Attendez le message de succès
3. Allez à la page de connexion
4. Connectez-vous avec les identifiants admin
5. Vérifiez que vous accédez bien à l'interface principale

## En cas de problème

Si vous rencontrez toujours des erreurs :
1. Vérifiez les logs dans la console du navigateur (F12)
2. Vérifiez que les Edge Functions sont déployées dans Supabase
3. Contactez le support avec les messages d'erreur spécifiques
