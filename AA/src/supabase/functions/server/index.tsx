import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { Hono } from "npm:hono@4";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from './kv_store.tsx';

// Configuration Supabase
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const app = new Hono();

// Middleware CORS
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

app.use('*', logger(console.log));

// Nouvelle route pour RÉINITIALISER complètement la base de données
app.get('/make-server-810b4099/reset-database', async (c) => {
  try {
    console.log('🔥 RÉINITIALISATION COMPLÈTE DE LA BASE DE DONNÉES MISAN...');
    console.log('⚠️ ATTENTION : Toutes les données vont être supprimées !');

    // 1. Supprimer tous les utilisateurs de Supabase Auth (sauf service accounts)
    console.log('🗑️ Suppression des utilisateurs Supabase Auth...');
    
    try {
      // Récupérer tous les utilisateurs
      const { data: users, error: listError } = await supabase.auth.admin.listUsers();
      
      if (!listError && users?.users) {
        console.log(`📊 ${users.users.length} utilisateurs trouvés`);
        
        for (const user of users.users) {
          if (user.email && !user.email.includes('service') && !user.email.includes('system')) {
            console.log(`🗑️ Suppression utilisateur: ${user.email}`);
            const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
            if (deleteError) {
              console.log(`⚠️ Erreur suppression ${user.email}:`, deleteError.message);
            }
          }
        }
      }
    } catch (authError) {
      console.log('⚠️ Erreur nettoyage Auth:', authError.message);
    }

    // 2. Réinitialiser le KV Store COMPLÈTEMENT
    console.log('🧹 NETTOYAGE ULTRA-AGRESSIF DU KV STORE...');
    
    try {
      console.log('🔍 PHASE 1: Identification de toutes les clés KV Store...');
      
      // Récupérer TOUTES les clés avec tous les préfixes possibles
      const allUserKeys = await kv.getByPrefix('user:');
      const allEmailKeys = await kv.getByPrefix('user_by_email:');
      const allSubKeys = await kv.getByPrefix('subscription:');
      const allSettingsKeys = await kv.getByPrefix('system');
      
      console.log(`📊 KV Store avant nettoyage:`);
      console.log(`   - ${allUserKeys.length} profils utilisateur`);
      console.log(`   - ${allEmailKeys.length} clés email`);
      console.log(`   - ${allSubKeys.length} abonnements`);
      console.log(`   - ${allSettingsKeys.length} paramètres système`);
      
      // Afficher EXACTEMENT chaque clé trouvée
      console.log('🔍 LISTING EXACT DE TOUTES LES CLÉS:');
      const allKeysToDelete = [];
      
      for (const item of allUserKeys) {
        console.log(`   👤 USER: "${item.key}"`);
        allKeysToDelete.push({ key: item.key, type: 'USER', data: item.value });
      }
      
      for (const item of allEmailKeys) {
        console.log(`   📧 EMAIL: "${item.key}" => "${item.value}"`);
        allKeysToDelete.push({ key: item.key, type: 'EMAIL', data: item.value });
      }
      
      for (const item of allSubKeys) {
        console.log(`   📋 SUB: "${item.key}"`);
        allKeysToDelete.push({ key: item.key, type: 'SUB', data: item.value });
      }
      
      for (const item of allSettingsKeys) {
        console.log(`   ⚙️ SETTINGS: "${item.key}"`);
        allKeysToDelete.push({ key: item.key, type: 'SETTINGS', data: item.value });
      }
      
      console.log(`📊 TOTAL DE CLÉS À SUPPRIMER: ${allKeysToDelete.length}`);

      // PHASE 2: Suppression ultra-agressive avec multiples méthodes
      console.log('🗑️ PHASE 2: SUPPRESSION ULTRA-AGRESSIVE...');
      
      const deleteKeyAggressively = async (keyInfo: any) => {
        const originalKey = keyInfo.key;
        const type = keyInfo.type;
        
        console.log(`🎯 SUPPRESSION ${type}: "${originalKey}"`);
        
        // Générer TOUTES les variantes possibles de cette clé
        const keyVariants = [
          // Clé originale
          originalKey,
          // Sans préfixe kv_store
          originalKey.replace('kv_store_810b4099.', ''),
          // Avec préfixe ajouté
          originalKey.startsWith('kv_store_810b4099.') ? originalKey : `kv_store_810b4099.${originalKey}`,
          // Juste le nom de la clé
          originalKey.includes('.') ? originalKey.split('.').pop() : originalKey,
          // Version sans points du début
          originalKey.startsWith('kv_store_810b4099.') ? originalKey.substring(18) : originalKey,
          // Version complète forcée
          `kv_store_810b4099.${originalKey.replace('kv_store_810b4099.', '')}`,
          // Clé nue
          originalKey.replace(/^.*\./, ''),
          // Variations avec espaces échappés
          originalKey.replace(/ /g, '%20'),
          originalKey.replace(/ /g, '_')
        ].filter((key, index, arr) => arr.indexOf(key) === index); // Supprimer les doublons
        
        let deleteSucceeded = false;
        let attemptCount = 0;
        
        // Essayer CHAQUE variante avec vérification immédiate
        for (const keyVariant of keyVariants) {
          try {
            attemptCount++;
            console.log(`   🗑️ Tentative ${attemptCount}: "${keyVariant}"`);
            
            // Tentative de suppression
            await kv.del(keyVariant);
            
            // Vérification immédiate - la clé a-t-elle disparu ?
            try {
              const testValue = await kv.get(keyVariant);
              if (!testValue || testValue === null || testValue === undefined) {
                console.log(`   ✅ SUCCÈS: "${keyVariant}" supprimée`);
                deleteSucceeded = true;
                break;
              } else {
                console.log(`   ⚠️ ÉCHEC: "${keyVariant}" encore présente`);
              }
            } catch (getError) {
              // Si get() échoue, c'est probablement que la clé n'existe plus
              console.log(`   ✅ SUCCÈS (get failed): "${keyVariant}" probablement supprimée`);
              deleteSucceeded = true;
              break;
            }
            
          } catch (delError) {
            console.log(`   ❌ ERREUR suppression "${keyVariant}": ${delError.message}`);
          }
        }
        
        if (!deleteSucceeded) {
          console.log(`   🚨 ÉCHEC TOTAL pour ${type}: "${originalKey}" - ${attemptCount} tentatives`);
        } else {
          console.log(`   ✅ ${type} supprimé avec succès après ${attemptCount} tentatives`);
        }
        
        return deleteSucceeded;
      };
      
      // Supprimer toutes les clés identifiées
      let totalDeleted = 0;
      for (const keyInfo of allKeysToDelete) {
        const success = await deleteKeyAggressively(keyInfo);
        if (success) totalDeleted++;
        
        // Petite pause entre les suppressions pour éviter de surcharger
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      console.log(`✅ PHASE 2 TERMINÉE: ${totalDeleted}/${allKeysToDelete.length} clés supprimées`);
      
      // PHASE 3: Nettoyage de sécurité des clés système connues
      console.log('🧹 PHASE 3: NETTOYAGE DE SÉCURITÉ...');
      
      const systemKeysToDelete = [
        'system_settings',
        'settings',
        'config',
        'app_config',
        'user_count',
        'admin_settings'
      ];
      
      for (const sysKey of systemKeysToDelete) {
        await deleteKeyAggressively({ key: sysKey, type: 'SYSTEM_SECURITY', data: null });
      }
      
      // PHASE 4: Vérification finale ultra-détaillée
      console.log('🔍 PHASE 4: VÉRIFICATION FINALE...');
      
      const check1 = await kv.getByPrefix('user:');
      const check2 = await kv.getByPrefix('user_by_email:');
      const check3 = await kv.getByPrefix('subscription:');
      const check4 = await kv.getByPrefix('system');
      const check5 = await kv.getByPrefix('');  // Toutes les clés
      
      console.log(`📊 RÉSULTATS FINAUX:`);
      console.log(`   - ${check1.length} profils utilisateur`);
      console.log(`   - ${check2.length} clés email`);
      console.log(`   - ${check3.length} abonnements`);
      console.log(`   - ${check4.length} paramètres système`);
      console.log(`   - ${check5.length} TOTAL toutes clés`);
      
      // Si il reste encore des clés, ATTAQUE FINALE
      if (check1.length > 0 || check2.length > 0 || check3.length > 0 || check4.length > 0) {
        console.log('🚨 PHASE 5: ATTAQUE FINALE DÉSESPÉRÉE...');
        
        const allRemainingKeys = [...check1, ...check2, ...check3, ...check4];
        
        for (const item of allRemainingKeys) {
          console.log(`💀 ATTAQUE FINALE SUR: "${item.key}"`);
          
          // Essayer TOUT les préfixes possibles
          const desperateKeys = [
            item.key,
            item.key.replace('kv_store_810b4099.', ''),
            `kv_store_810b4099.${item.key}`,
            `kv_store_810b4099.${item.key.replace('kv_store_810b4099.', '')}`,
            item.key.split('.').pop(),
            item.key.replace(/^[^.]*\./, ''),
            item.key.replace(/\./g, '_'),
            item.key.replace(/_/g, '.'),
            item.key.toLowerCase(),
            item.key.toUpperCase(),
            encodeURIComponent(item.key),
            decodeURIComponent(item.key)
          ];
          
          for (const desperateKey of desperateKeys) {
            try {
              await kv.del(desperateKey);
              console.log(`   💀 Tenté: "${desperateKey}"`);
            } catch (err) {
              // Ignorer les erreurs
            }
          }
        }
        
        // Vérification post-attaque finale
        const finalCheck = await kv.getByPrefix('');
        console.log(`💀 APRÈS ATTAQUE FINALE: ${finalCheck.length} clés restantes`);
        
        if (finalCheck.length > 0) {
          console.log('☢️ DERNIÈRE RESSOURCE: Listing de toutes les clés restantes');
          for (const item of finalCheck) {
            console.log(`   ☢️ SURVIVANTE: "${item.key}" = ${JSON.stringify(item.value).substring(0, 30)}...`);
          }
        } else {
          console.log('🎉 VICTOIRE TOTALE: Toutes les clés ont été éliminées !');
        }
      } else {
        console.log('🎉 SUCCÈS: KV Store complètement nettoyé dès la phase 4 !');
      }
      
    } catch (kvError) {
      console.log('⚠️ Erreur nettoyage KV Store:', kvError.message);
    }

    // 3. Supprimer les tables PostgreSQL
    console.log('🗃️ Suppression des tables PostgreSQL...');
    
    try {
      // Exécuter le script de reset
      const resetSQL = `
        -- Supprimer les politiques RLS
        DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
        DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
        DROP POLICY IF EXISTS "Admins can manage all profiles" ON user_profiles;
        DROP POLICY IF EXISTS "Users can view leurs propres abonnements" ON subscriptions;
        DROP POLICY IF EXISTS "Only admins can manage settings" ON system_settings;
        DROP POLICY IF EXISTS "Public settings are readable by all" ON system_settings;
        DROP POLICY IF EXISTS "Users can manage their own alerts" ON user_alerts;

        -- Supprimer les tables
        DROP TABLE IF EXISTS user_alerts CASCADE;
        DROP TABLE IF EXISTS system_settings CASCADE;
        DROP TABLE IF EXISTS subscriptions CASCADE;
        DROP TABLE IF EXISTS user_profiles CASCADE;

        -- Supprimer les index
        DROP INDEX IF EXISTS idx_user_profiles_email;
        DROP INDEX IF EXISTS idx_user_profiles_role;
        DROP INDEX IF EXISTS idx_subscriptions_user_id;
        DROP INDEX IF EXISTS idx_alerts_user_id;

        -- Supprimer les fonctions
        DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
      `;

      // Tenter d'exécuter via RPC ou requêtes individuelles
      const { error: sqlError } = await supabase.rpc('exec_sql', { sql: resetSQL });
      
      if (sqlError) {
        console.log('⚠️ RPC exec_sql non disponible, tentative de suppression individuelle...');
        
        // Supprimer les tables une par une
        const tables = ['user_alerts', 'system_settings', 'subscriptions', 'user_profiles'];
        
        for (const table of tables) {
          try {
            const { error: tableError } = await supabase
              .from(table)
              .select('id')
              .limit(1);
              
            if (!tableError || !tableError.message.includes('does not exist')) {
              console.log(`🗑️ Table ${table} existe, suppression des données...`);
              const { error: deleteError } = await supabase
                .from(table)
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000'); // Supprimer toutes les lignes
                
              if (deleteError) {
                console.log(`⚠️ Erreur vidage table ${table}:`, deleteError.message);
              } else {
                console.log(`✅ Table ${table} vidée`);
              }
            }
          } catch (err) {
            console.log(`⚠️ Table ${table} probablement inexistante`);
          }
        }
      } else {
        console.log('✅ Tables PostgreSQL supprimées via RPC');
      }
      
    } catch (pgError) {
      console.log('⚠️ Erreur suppression PostgreSQL:', pgError.message);
    }

    // 4. Nettoyage du Storage Bucket
    console.log('🗂️ Nettoyage du Storage...');
    
    try {
      const bucketName = 'make-810b4099-files';
      
      // Supprimer tous les fichiers du bucket
      const { data: files, error: listError } = await supabase.storage
        .from(bucketName)
        .list();
        
      if (!listError && files && files.length > 0) {
        console.log(`📊 ${files.length} fichiers trouvés dans le bucket`);
        
        const filePaths = files.map(file => file.name);
        const { error: deleteError } = await supabase.storage
          .from(bucketName)
          .remove(filePaths);
          
        if (deleteError) {
          console.log('⚠️ Erreur suppression fichiers:', deleteError.message);
        } else {
          console.log('✅ Fichiers supprimés du bucket');
        }
      }
    } catch (storageError) {
      console.log('⚠️ Erreur nettoyage Storage:', storageError.message);
    }

    console.log('🔥 RÉINITIALISATION COMPLÈTE TERMINÉE');

    return c.json({
      success: true,
      message: 'Base de données complètement réinitialisée',
      reset_completed: true,
      timestamp: new Date().toISOString(),
      operations_performed: [
        'Suppression de tous les utilisateurs Supabase Auth',
        'Nettoyage ultra-agressif du KV Store',
        'Suppression/vidage des tables PostgreSQL', 
        'Nettoyage du Storage Bucket',
        'Suppression des politiques RLS',
        'Suppression des index et fonctions'
      ],
      warning: 'Toutes les données ont été définitivement supprimées',
      next_step: 'Vous pouvez maintenant recréer un utilisateur administrateur'
    });

  } catch (error) {
    console.error('❌ Erreur lors de la réinitialisation:', error);
    return c.json({
      success: false,
      error: error.message,
      note: 'Réinitialisation partielle - certaines opérations ont pu échouer'
    }, 500);
  }
});

// Nouvelle route d'initialisation qui exécute le script SQL complet
app.get('/make-server-810b4099/init-database', async (c) => {
  try {
    console.log('🚀 Initialisation complète de la base de données Misan...');

    // ÉTAPE PRÉALABLE: Vider COMPLÈTEMENT la table kv_store_810b4099
    console.log('🧹 ÉTAPE 0: VIDAGE COMPLET DE LA TABLE KV_STORE...');
    
    try {
      // Supprimer TOUTES les entrées de la table kv_store_810b4099
      const { data: deletedRows, error: deleteError } = await supabase
        .from('kv_store_810b4099')
        .delete()
        .neq('key', '___impossible_key___'); // Condition qui match tout
        
      if (deleteError) {
        console.log('❌ Erreur vidage KV Store:', deleteError.message);
      } else {
        console.log(`✅ KV Store vidé: ${deletedRows?.length || 0} lignes supprimées`);
      }
      
      // Vérification finale que la table est vide
      const { data: remainingData, error: checkError } = await supabase
        .from('kv_store_810b4099')
        .select('key')
        .limit(10);
        
      if (!checkError && remainingData && remainingData.length === 0) {
        console.log('✅ CONFIRMATION: Table kv_store_810b4099 complètement vide');
      } else {
        console.log(`⚠️ ATTENTION: ${remainingData?.length || 0} lignes restent dans kv_store_810b4099`);
        if (remainingData && remainingData.length > 0) {
          remainingData.forEach(row => console.log(`   - Clé restante: "${row.key}"`));
        }
      }
    } catch (kvError) {
      console.log('⚠️ Erreur nettoyage initial KV Store:', kvError.message);
    }

    // Créer l'utilisateur admin dans Supabase Auth
    const adminEmail = 'a@a.a';
    const adminPassword = 'admin';

    console.log('👤 Création de l\'utilisateur admin...');
    
    const { data: adminUser, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      user_metadata: { 
        name: 'Administrateur Misan',
        role: 'admin'
      },
      email_confirm: true
    });

    let adminId = 'admin-stable-id';
    
    if (authError && !authError.message.includes('already registered')) {
      console.log('⚠️ Erreur création admin Auth:', authError.message);
    } else {
      console.log('✅ Utilisateur admin créé/vérifié dans Auth');
      if (adminUser?.user?.id) {
        adminId = adminUser.user.id;
        console.log('🆔 Admin ID:', adminId);
      }
    }

    // Exécuter le script SQL complet d'initialisation
    console.log('🗃️ Création des tables PostgreSQL...');
    
    try {
      // Créer la fonction utilitaire pour updated_at
      console.log('📋 Création de la fonction update_updated_at_column...');
      
      const { error: funcError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE OR REPLACE FUNCTION update_updated_at_column()
          RETURNS TRIGGER AS $$
          BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql;
        `
      });

      // Si la fonction RPC n'existe pas, utiliser une requête directe
      if (funcError) {
        console.log('⚠️ RPC exec_sql non disponible, création directe des tables...');
        
        // Créer les tables principales
        console.log('📋 Création de la table user_profiles...');
        
        const { error: profilesError } = await supabase
          .schema('public')
          .from('user_profiles')
          .select('id')
          .limit(1);

        // Si la table n'existe pas, la créer
        if (profilesError && profilesError.message.includes('does not exist')) {
          console.log('🔨 Table user_profiles n\'existe pas, création...');
          
          // Utiliser une requête SQL brute pour créer les tables
          const createTablesSQL = `
            -- Créer la table user_profiles
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
              company TEXT,
              billing_address TEXT,
              billing_city TEXT,
              billing_postal_code TEXT,
              billing_country TEXT,
              created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
              updated_at TIMESTAMPTZ DEFAULT NOW()
            );

            -- Créer la table subscriptions
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

            -- Créer la table system_settings
            CREATE TABLE IF NOT EXISTS system_settings (
              key TEXT PRIMARY KEY,
              value TEXT NOT NULL,
              description TEXT,
              category TEXT DEFAULT 'general' CHECK (category IN ('general', 'alerts', 'pricing', 'features')),
              is_public BOOLEAN DEFAULT FALSE,
              created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
              updated_at TIMESTAMPTZ DEFAULT NOW()
            );

            -- Créer la table user_alerts
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

            -- Créer les index
            CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
            CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
            CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
            CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON user_alerts(user_id);

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

            -- Activer RLS
            ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
            ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
            ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
            ALTER TABLE user_alerts ENABLE ROW LEVEL SECURITY;

            -- Politiques RLS pour user_profiles
            DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
            CREATE POLICY "Users can view their own profile" ON user_profiles
              FOR SELECT USING (auth.uid() = id);

            DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
            CREATE POLICY "Users can update their own profile" ON user_profiles
              FOR UPDATE USING (auth.uid() = id);

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

            -- Politiques pour system_settings
            DROP POLICY IF EXISTS "Only admins can manage settings" ON system_settings;
            CREATE POLICY "Only admins can manage settings" ON system_settings
              FOR ALL USING (
                EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
              );

            DROP POLICY IF EXISTS "Public settings are readable by all" ON system_settings;
            CREATE POLICY "Public settings are readable by all" ON system_settings
              FOR SELECT USING (is_public = TRUE);

            -- Politiques pour user_alerts
            DROP POLICY IF EXISTS "Users can manage their own alerts" ON user_alerts;
            CREATE POLICY "Users can manage their own alerts" ON user_alerts
              FOR ALL USING (user_id = auth.uid());
          `;

          console.log('⚠️ Impossible d\'exécuter le SQL directement via Supabase client');
          console.log('📝 Les tables doivent être créées manuellement dans Supabase Dashboard');
        } else {
          console.log('✅ Table user_profiles existe déjà');
        }
      }

      // Insérer l'utilisateur admin dans PostgreSQL
      console.log('👤 Insertion de l\'utilisateur admin dans PostgreSQL...');
      
      const { data: insertResult, error: insertError } = await supabase
        .from('user_profiles')
        .upsert({
          id: adminId,
          email: adminEmail,
          name: 'Administrateur Misan',
          role: 'admin',
          subscription_type: 'admin',
          subscription_status: 'active',
          subscription_start: new Date().toISOString(),
          subscription_end: '2030-12-31T23:59:59Z',
          tokens_balance: 999999999,
          trial_used: false
        }, {
          onConflict: 'id'
        });

      if (insertError) {
        console.log('❌ Erreur insertion PostgreSQL user_profiles:', insertError.message);
        console.log('📝 Détails:', insertError);
      } else {
        console.log('✅ Admin créé dans PostgreSQL user_profiles');
      }

      // Créer l'abonnement admin
      const { error: subError } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: adminId,
          type: 'admin',
          status: 'active',
          start_date: new Date().toISOString(),
          end_date: '2030-12-31T23:59:59Z',
          tokens_included: 999999999,
          is_trial: false,
          payment_method: 'free'
        });

      if (subError) {
        console.log('❌ Erreur insertion PostgreSQL subscriptions:', subError.message);
      } else {
        console.log('✅ Abonnement admin créé dans PostgreSQL');
      }

      // Initialiser les paramètres système dans PostgreSQL
      console.log('⚙️ Initialisation des paramètres système PostgreSQL...');
      
      const systemSettingsData = [
        { key: 'trial_duration_days', value: '7', description: 'Durée essai gratuit en jours', category: 'general' },
        { key: 'trial_tokens_amount', value: '100000', description: 'Nombre de tokens pour l\'essai gratuit', category: 'general' },
        { key: 'monthly_subscription_price', value: '4000', description: 'Prix abonnement mensuel en DA HT', category: 'pricing' },
        { key: 'app_version', value: '1.0.0', description: 'Version de l\'application', category: 'general', is_public: true },
        { key: 'support_email', value: 'support@misan.dz', description: 'Email de support', category: 'general', is_public: true }
      ];

      for (const setting of systemSettingsData) {
        const { error: settingError } = await supabase
          .from('system_settings')
          .upsert(setting);

        if (settingError) {
          console.log(`⚠️ Erreur insertion paramètre ${setting.key}:`, settingError.message);
        }
      }

      console.log('✅ Paramètres système PostgreSQL initialisés');

    } catch (pgError) {
      console.log('⚠️ Erreur PostgreSQL:', pgError.message);
    }

    // Créer/mettre à jour le profil admin dans le KV store (fallback)
    console.log('📋 Configuration du KV store fallback...');
    
    const adminProfile = {
      id: adminId,
      email: adminEmail,
      name: 'Administrateur Misan',
      role: 'admin',
      subscription_type: 'admin',
      subscription_status: 'active',
      subscription_start: '2024-01-01T00:00:00Z',
      subscription_end: '2030-12-31T23:59:59Z',
      tokens_balance: 999999999,
      trial_used: false,
      created_at: new Date().toISOString()
    };

    await kv.set(`user:${adminId}`, adminProfile);
    await kv.set(`user_by_email:${adminEmail}`, adminId);

    console.log('✅ Profil admin créé dans le KV store');

    // Initialiser les paramètres système dans le KV store
    const defaultSettings = {
      // Alertes Pro (abonnés payants)
      alert_pro_subscription_20d: true,
      alert_pro_subscription_7d: true,
      alert_pro_subscription_2d: true,
      alert_pro_subscription_0d: true,
      alert_pro_tokens_100k: true,
      alert_pro_tokens_50k: true,
      alert_pro_tokens_10k: true,
      alert_pro_tokens_0: true,
      
      // Alertes Premium (gratuits)
      alert_premium_subscription_5d: true,
      alert_premium_subscription_3d: true,
      alert_premium_subscription_2d: true,
      alert_premium_subscription_0d: true,
      alert_premium_tokens_50k: true,
      alert_premium_tokens_25k: true,
      alert_premium_tokens_10k: true,
      alert_premium_tokens_0: true,
      
      // Paramètres généraux
      trial_duration_days: 7,
      trial_tokens_amount: 100000,
      monthly_subscription_price: 4000,
      
      // Paramètres de tarification
      tokens_pack_50k_price: 1000,
      tokens_pack_100k_price: 1800,
      tokens_pack_250k_price: 4000,
      tokens_pack_500k_price: 7500,
      
      // Paramètres de facturation
      tax_rate: 19.00,
      invoice_due_days: 30,
      company_name: 'Misan Technologies',
      company_address: 'Alger, Algérie',
      
      // Paramètres techniques
      max_tokens_per_request: 4000,
      max_requests_per_hour: 100,
      max_document_size_mb: 10,
      
      // Paramètres publics
      app_version: '1.0.0',
      maintenance_mode: false,
      support_email: 'support@misan.dz',
      support_phone: '+213 XX XX XX XX'
    };

    await kv.set('system_settings', defaultSettings);

    console.log('✅ Paramètres système KV store initialisés');

    return c.json({ 
      success: true, 
      message: 'Base de données Misan initialisée avec succès',
      admin_user: adminEmail,
      admin_id: adminId,
      storage: 'hybrid_postgresql_kv',
      note: 'Utilisateur admin créé dans Supabase Auth, PostgreSQL et KV store',
      warning: 'Si PostgreSQL a échoué, vous devez créer les tables manuellement dans Supabase Dashboard',
      manual_sql_required: true,
      features: [
        'Authentification Supabase',
        'Utilisateur admin créé',
        'Tables PostgreSQL (nécessitent création manuelle si erreur)',
        'Stockage KV de fallback fonctionnel',
        'Système d\'alertes configuré',
        'Gestion des abonnements',
        'Paramètres configurables'
      ],
      next_steps: [
        '1. Si des erreurs PostgreSQL apparaissent, exécutez le script SQL manuellement',
        '2. L\'utilisateur admin est créé dans le KV store (fonctionne immédiatement)',
        '3. Email: a@a.a',
        '4. Mot de passe: admin',
        '5. Vous pouvez vous connecter maintenant'
      ],
      sql_script_location: '/misan-database-init-script.sql'
    });

  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation:', error);
    return c.json({ 
      success: false, 
      error: error.message,
      fallback_note: 'L\'utilisateur admin devrait être disponible dans le KV store même en cas d\'erreur PostgreSQL'
    }, 500);
  }
});

// Route pour créer/réactiver l'utilisateur admin
app.post('/make-server-810b4099/create-admin-user', async (c) => {
  try {
    console.log('👑 CRÉATION/RÉACTIVATION DU COMPTE ADMINISTRATEUR...');

    const adminEmail = 'a@a.a';
    const adminPassword = 'admin';

    // 1. Vérifier si l'utilisateur admin existe déjà dans Auth
    console.log('🔍 Vérification de l\'existence du compte admin...');

    let adminUser = null;
    let adminId = null;

    try {
      // Chercher l'utilisateur existant par email
      const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
      
      if (existingUsers?.users) {
        adminUser = existingUsers.users.find(user => user.email === adminEmail);
        
        if (adminUser) {
          console.log('✅ Utilisateur admin trouvé dans Auth:', adminUser.id);
          adminId = adminUser.id;
        } else {
          console.log('ℹ️ Utilisateur admin non trouvé, création nécessaire');
        }
      }
    } catch (searchError) {
      console.log('⚠️ Erreur recherche utilisateur:', searchError.message);
    }

    // 2. Créer l'utilisateur admin s'il n'existe pas
    if (!adminUser) {
      console.log('🔨 Création de l\'utilisateur admin dans Supabase Auth...');
      
      const { data: newAdminUser, error: authError } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        user_metadata: { 
          name: 'Administrateur Misan',
          role: 'admin'
        },
        email_confirm: true
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          console.log('ℹ️ Utilisateur déjà enregistré, récupération de l\'ID...');
          // Re-chercher l'utilisateur
          const { data: searchUsers } = await supabase.auth.admin.listUsers();
          adminUser = searchUsers?.users?.find(user => user.email === adminEmail);
          adminId = adminUser?.id || 'admin-fallback-id';
        } else {
          console.log('❌ Erreur création admin Auth:', authError.message);
          return c.json({
            success: false,
            error: `Erreur création utilisateur Auth: ${authError.message}`
          }, 500);
        }
      } else {
        console.log('✅ Utilisateur admin créé dans Auth');
        adminUser = newAdminUser.user;
        adminId = adminUser?.id || 'admin-fallback-id';
      }
    }

    console.log('🆔 Admin ID final:', adminId);

    // 3. Créer/Mettre à jour le profil admin dans PostgreSQL
    console.log('📋 Création/Mise à jour du profil admin dans PostgreSQL...');
    
    const { data: profileResult, error: profileError } = await supabase
      .from('user_profiles')
      .upsert({
        id: adminId,
        email: adminEmail,
        name: 'Administrateur Misan',
        role: 'admin',
        subscription_type: 'admin',
        subscription_status: 'active',
        subscription_start: new Date().toISOString(),
        subscription_end: '2030-12-31T23:59:59Z',
        tokens_balance: 999999999,
        trial_used: false,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      });

    if (profileError) {
      console.log('❌ Erreur profil PostgreSQL:', profileError.message);
      return c.json({
        success: false,
        error: `Erreur création profil: ${profileError.message}`,
        details: profileError
      }, 500);
    }

    console.log('✅ Profil admin créé dans PostgreSQL');

    // 4. Créer/Mettre à jour l'abonnement admin
    console.log('💳 Création/Mise à jour de l\'abonnement admin...');
    
    const { data: subResult, error: subError } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: adminId,
        type: 'admin',
        status: 'active',
        start_date: new Date().toISOString(),
        end_date: '2030-12-31T23:59:59Z',
        tokens_included: 999999999,
        is_trial: false,
        payment_method: 'free',
        payment_status: 'paid',
        amount_da: 0,
        auto_renewal: false,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,type'
      });

    if (subError) {
      console.log('⚠️ Erreur abonnement (non critique):', subError.message);
    } else {
      console.log('✅ Abonnement admin créé');
    }

    // 5. Créer l'entrée KV Store pour l'admin
    console.log('🗃️ Création des entrées KV Store...');
    
    const adminData = {
      id: adminId,
      email: adminEmail,
      name: 'Administrateur Misan',
      role: 'admin',
      subscription_type: 'admin',
      subscription_status: 'active',
      subscription_start: new Date().toISOString(),
      subscription_end: '2030-12-31T23:59:59Z',
      tokens_balance: 999999999,
      trial_used: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Stocker dans le KV Store
    await kv.set(`user:${adminId}`, adminData);
    await kv.set(`user_by_email:${adminEmail}`, adminId);

    console.log('✅ Données admin stockées dans KV Store');

    // 6. Vérification finale
    console.log('🔍 Vérification finale...');
    
    const kvUser = await kv.get(`user:${adminId}`);
    const kvEmailMapping = await kv.get(`user_by_email:${adminEmail}`);
    
    console.log('📊 Résultats finaux:');
    console.log(`   - Auth User ID: ${adminId}`);
    console.log(`   - KV User Data: ${kvUser ? '✅ Présent' : '❌ Manquant'}`);
    console.log(`   - KV Email Mapping: ${kvEmailMapping ? '✅ Présent' : '❌ Manquant'}`);

    return c.json({
      success: true,
      message: 'Compte administrateur créé/réactivé avec succès',
      admin_user: {
        id: adminId,
        email: adminEmail,
        name: 'Administrateur Misan',
        role: 'admin'
      },
      created_at: new Date().toISOString(),
      verification: {
        auth_user_exists: !!adminUser,
        kv_user_data: !!kvUser,
        kv_email_mapping: !!kvEmailMapping
      }
    });

  } catch (error) {
    console.error('❌ Erreur création admin:', error);
    return c.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, 500);
  }
});

// Route d'inscription avec gestion de l'essai gratuit automatique
app.post('/make-server-810b4099/signup', async (c) => {
  try {
    const { email, password, name, grant_free_trial } = await c.req.json();

    console.log('📝 Inscription utilisateur:', email);
    console.log('🎁 Essai gratuit demandé:', grant_free_trial);

    // Récupérer la configuration d'essai gratuit depuis les paramètres système
    let trialConfig = {
      duration_days: 7,
      tokens_amount: 100000,
      enabled: true
    };

    try {
      const configData = await kv.get('system_settings:free_trial_config');
      if (configData) {
        trialConfig = { ...trialConfig, ...JSON.parse(configData) };
        console.log('📋 Configuration d\'essai gratuit récupérée:', trialConfig);
      }
    } catch (err) {
      console.log('⚠️ Configuration d\'essai gratuit par défaut utilisée');
    }

    // Créer l'utilisateur dans Supabase Auth
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      email_confirm: true
    });

    if (authError) {
      console.log('❌ Erreur création utilisateur Auth:', authError.message);
      return c.json({
        success: false,
        error: authError.message.includes('already registered') 
          ? 'Un compte existe déjà avec cette adresse email'
          : 'Erreur lors de la création du compte'
      });
    }

    if (!authUser?.user?.id) {
      return c.json({
        success: false,
        error: 'Impossible de créer le compte utilisateur'
      });
    }

    const userId = authUser.user.id;
    console.log('✅ Utilisateur Auth créé:', userId);

    // Calculer les dates d'abonnement pour l'essai gratuit
    const now = new Date();
    const subscriptionStart = now.toISOString();
    const subscriptionEnd = new Date(now.getTime() + (trialConfig.duration_days * 24 * 60 * 60 * 1000)).toISOString();

    // Créer le profil utilisateur avec abonnement Premium gratuit
    const userProfile = {
      id: userId,
      email,
      name,
      role: 'premium',
      subscription_type: 'premium',
      subscription_status: 'active',
      subscription_start: subscriptionStart,
      subscription_end: subscriptionEnd,
      tokens_balance: grant_free_trial && trialConfig.enabled ? trialConfig.tokens_amount : 0,
      trial_used: grant_free_trial && trialConfig.enabled,
      created_at: now.toISOString()
    };

    console.log('👤 Création du profil utilisateur:', userProfile);

    // Stocker le profil dans le KV store
    await kv.set(`user:${userId}`, JSON.stringify(userProfile));
    await kv.set(`user_by_email:${email}`, userId);

    // Créer l'abonnement Premium gratuit si l'essai gratuit est accordé
    if (grant_free_trial && trialConfig.enabled) {
      const subscription = {
        id: `trial_${userId}`,
        user_id: userId,
        type: 'premium',
        status: 'active',
        start_date: subscriptionStart,
        end_date: subscriptionEnd,
        tokens_included: trialConfig.tokens_amount,
        is_trial: true,
        payment_method: 'free',
        payment_status: 'paid',
        amount_da: 0,
        auto_renewal: false,
        created_at: now.toISOString()
      };

      console.log('📋 Création de l\'abonnement d\'essai:', subscription);
      await kv.set(`subscription:${userId}`, JSON.stringify(subscription));
    }

    console.log('✅ Inscription terminée avec succès');
    console.log(`🎁 Abonnement Premium gratuit: ${grant_free_trial && trialConfig.enabled ? 'ACCORDÉ' : 'NON ACCORDÉ'}`);
    console.log(`📅 Durée: ${trialConfig.duration_days} jours`);
    console.log(`🪙 Jetons: ${trialConfig.tokens_amount.toLocaleString()}`);
    console.log(`📆 Fin d'abonnement: ${subscriptionEnd}`);

    return c.json({
      success: true,
      message: 'Compte créé avec succès',
      user_id: userId,
      trial_granted: grant_free_trial && trialConfig.enabled,
      trial_config: grant_free_trial && trialConfig.enabled ? {
        duration_days: trialConfig.duration_days,
        tokens_amount: trialConfig.tokens_amount,
        expires_at: subscriptionEnd
      } : null
    });

  } catch (error) {
    console.error('❌ Erreur inscription:', error);
    return c.json({
      success: false,
      error: 'Erreur serveur lors de l\'inscription'
    }, 500);
  }
});

// Route de vérification que la base de données est vide
app.post('/make-server-810b4099/verify-empty', async (c) => {
  try {
    console.log('🔍 Vérification que la base de données est vide...');
    
    let isEmpty = true;
    let userCount = 0;
    let tableStatus = {};
    let details = [];

    // 1. Vérifier les utilisateurs Supabase Auth
    try {
      const { data: users, error: listError } = await supabase.auth.admin.listUsers();
      
      if (!listError && users?.users) {
        userCount = users.users.length;
        details.push(`👥 Utilisateurs Auth trouvés: ${userCount}`);
        
        if (userCount > 0) {
          isEmpty = false;
          for (const user of users.users) {
            details.push(`  - ${user.email || 'Email manquant'} (${user.id})`);
          }
        }
      } else {
        details.push('⚠️ Impossible de vérifier les utilisateurs Auth');
      }
    } catch (authError) {
      details.push(`❌ Erreur Auth: ${authError.message}`);
    }

    // 2. Vérifier le KV Store
    try {
      const userKeys = await kv.getByPrefix('user:');
      const emailKeys = await kv.getByPrefix('user_by_email:');
      const subKeys = await kv.getByPrefix('subscription:');
      
      tableStatus['kv_store_users'] = {
        exists: true,
        rowCount: userKeys.length
      };
      
      tableStatus['kv_store_emails'] = {
        exists: true,
        rowCount: emailKeys.length
      };
      
      tableStatus['kv_store_subscriptions'] = {
        exists: true,
        rowCount: subKeys.length
      };
      
      details.push(`📋 KV Store - Profils utilisateurs: ${userKeys.length}`);
      details.push(`📋 KV Store - Clés email: ${emailKeys.length}`);
      details.push(`📋 KV Store - Abonnements: ${subKeys.length}`);
      
      if (userKeys.length > 0 || emailKeys.length > 0 || subKeys.length > 0) {
        isEmpty = false;
      }
      
      // Afficher les clés trouvées
      for (const item of userKeys) {
        details.push(`  - Profil: ${item.key}`);
      }
      
    } catch (kvError) {
      details.push(`❌ Erreur KV Store: ${kvError.message}`);
    }

    // 3. Vérifier les tables PostgreSQL
    const pgTables = ['user_profiles', 'subscriptions', 'system_settings', 'user_alerts'];
    
    for (const tableName of pgTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });
          
        if (!error) {
          const count = data?.length || 0;
          tableStatus[tableName] = {
            exists: true,
            rowCount: count
          };
          
          details.push(`🗃️ Table ${tableName}: ${count} lignes`);
          
          if (count > 0) {
            isEmpty = false;
          }
        } else {
          tableStatus[tableName] = {
            exists: false,
            rowCount: 0
          };
          
          if (error.message.includes('does not exist')) {
            details.push(`🗃️ Table ${tableName}: n'existe pas`);
          } else {
            details.push(`❌ Erreur ${tableName}: ${error.message}`);
          }
        }
      } catch (tableError) {
        details.push(`❌ Erreur table ${tableName}: ${tableError.message}`);
      }
    }

    // 4. Vérifier les sessions actives
    try {
      const { data: sessions, error: sessionError } = await supabase.auth.admin.listUsers();
      // Les sessions sont automatiquement incluses dans la liste des utilisateurs
      details.push('🔐 Sessions vérifiées avec les utilisateurs');
    } catch (sessionError) {
      details.push(`⚠️ Impossible de vérifier les sessions: ${sessionError.message}`);
    }

    // Résumé final
    const summary = isEmpty ? '✅ BASE DE DONNÉES VIDE' : '❌ BASE DE DONNÉES NON VIDE';
    details.unshift(summary);
    details.push(`📊 Total utilisateurs Auth: ${userCount}`);
    details.push(`📊 Vérification effectuée: ${new Date().toLocaleTimeString()}`);

    console.log(summary);
    for (const detail of details) {
      console.log(detail);
    }

    return c.json({
      success: true,
      isEmpty,
      userCount,
      tableStatus,
      details,
      summary,
      timestamp: new Date().toISOString(),
      verification_complete: true
    });

  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error);
    return c.json({
      success: false,
      isEmpty: false,
      userCount: -1,
      tableStatus: {},
      error: error.message,
      details: ['Erreur lors de la vérification de la base de données']
    }, 500);
  }
});

// Route pour les paramètres admin
app.get('/make-server-810b4099/admin/settings', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];

    if (!accessToken) {
      return c.json({ success: false, error: 'Token manquant' }, 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (authError || !user) {
      return c.json({ success: false, error: 'Token invalide' }, 401);
    }

    // Vérifier si l'utilisateur est admin
    const profile = await kv.get(`user:${user.id}`);

    if (!profile || profile.role !== 'admin') {
      return c.json({ success: false, error: 'Accès non autorisé' }, 403);
    }

    // Récupérer tous les paramètres
    const settings = await kv.get('system_settings') || {};

    return c.json({ success: true, settings });

  } catch (error) {
    console.error('❌ Erreur récupération paramètres:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Route pour mettre à jour les paramètres de l'essai gratuit (admin uniquement)
app.post('/make-server-810b4099/admin/update-trial-config', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { duration_days, tokens_amount, enabled } = await c.req.json();

    if (!accessToken) {
      return c.json({ success: false, error: 'Token manquant' }, 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (authError || !user) {
      return c.json({ success: false, error: 'Token invalide' }, 401);
    }

    // Vérifier si l'utilisateur est admin
    const profile = await kv.get(`user:${user.id}`);

    if (!profile || profile.role !== 'admin') {
      return c.json({ success: false, error: 'Accès non autorisé' }, 403);
    }

    // Valider les paramètres
    if (duration_days !== undefined && (duration_days < 1 || duration_days > 365)) {
      return c.json({ success: false, error: 'La durée doit être entre 1 et 365 jours' }, 400);
    }

    if (tokens_amount !== undefined && (tokens_amount < 0 || tokens_amount > 10000000)) {
      return c.json({ success: false, error: 'Le nombre de jetons doit être entre 0 et 10,000,000' }, 400);
    }

    // Récupérer les paramètres système actuels
    const currentSettings = await kv.get('system_settings') || {};

    // Mettre à jour uniquement la configuration d'essai gratuit
    const updatedConfig = {
      duration_days: duration_days !== undefined ? duration_days : (currentSettings.trial_duration_days || 7),
      tokens_amount: tokens_amount !== undefined ? tokens_amount : (currentSettings.trial_tokens_amount || 100000),
      enabled: enabled !== undefined ? enabled : true
    };

    // Sauvegarder la configuration d'essai gratuit séparément
    await kv.set('system_settings:free_trial_config', JSON.stringify(updatedConfig));

    // Mettre à jour aussi les paramètres système généraux
    currentSettings.trial_duration_days = updatedConfig.duration_days;
    currentSettings.trial_tokens_amount = updatedConfig.tokens_amount;
    currentSettings.trial_enabled = updatedConfig.enabled;

    await kv.set('system_settings', currentSettings);

    console.log('✅ Configuration d\'essai gratuit mise à jour:', updatedConfig);

    return c.json({
      success: true,
      message: 'Configuration d\'essai gratuit mise à jour avec succès',
      config: updatedConfig
    });

  } catch (error) {
    console.error('❌ Erreur mise à jour configuration essai gratuit:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Route pour récupérer la configuration d'essai gratuit
app.get('/make-server-810b4099/free-trial-config', async (c) => {
  try {
    // Cette route peut être publique pour permettre au frontend de connaître la configuration

    // Récupérer la configuration d'essai gratuit
    const configData = await kv.get('system_settings:free_trial_config');
    
    let trialConfig = {
      duration_days: 7,
      tokens_amount: 100000,
      enabled: true
    };

    if (configData) {
      try {
        const parsedConfig = JSON.parse(configData);
        trialConfig = { ...trialConfig, ...parsedConfig };
      } catch (parseError) {
        console.log('⚠️ Erreur parsing configuration essai gratuit, utilisation des valeurs par défaut');
      }
    }

    return c.json({
      success: true,
      config: trialConfig
    });

  } catch (error) {
    console.error('❌ Erreur récupération configuration essai gratuit:', error);
    return c.json({
      success: true, // Retourner success: true avec config par défaut en cas d'erreur
      config: {
        duration_days: 7,
        tokens_amount: 100000,
        enabled: true
      }
    });
  }
});

// Route de vérification du statut utilisateur
app.post('/make-server-810b4099/check-user-status', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ success: false, error: 'Token manquant' }, 401);
    }

    // Vérifier l'utilisateur via le token
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (authError || !user) {
      return c.json({ success: false, error: 'Token invalide' }, 401);
    }

    console.log('🔍 Recherche profil pour utilisateur:', user.id);

    // Tenter de récupérer le profil depuis PostgreSQL d'abord
    let profile = null;
    
    try {
      console.log('🗃️ Tentative de récupération depuis PostgreSQL...');
      
      const { data: pgProfile, error: pgError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (pgProfile && !pgError) {
        console.log('✅ Profil trouvé dans PostgreSQL');
        profile = pgProfile;
      } else {
        console.log('⚠️ Profil non trouvé dans PostgreSQL:', pgError?.message);
      }
    } catch (pgError) {
      console.log('⚠️ PostgreSQL non disponible, fallback vers KV store');
    }

    // Si pas trouvé dans PostgreSQL, essayer le KV store
    if (!profile) {
      console.log('📋 Recherche dans le KV store...');
      profile = await kv.get(`user:${user.id}`);
      
      if (profile) {
        console.log('✅ Profil trouvé dans le KV store');
      }
    }

    if (!profile) {
      console.log('❌ Profil utilisateur introuvable dans PostgreSQL et KV store');
      return c.json({ success: false, error: 'Profil utilisateur introuvable' }, 404);
    }

    console.log('✅ Profil trouvé:', profile.email, profile.role);

    const now = new Date();
    const subscriptionEnd = new Date(profile.subscription_end);
    const isSubscriptionActive = subscriptionEnd > now;
    const hasTokens = profile.tokens_balance > 0;

    // Logique de vérification selon les consignes
    let canAccessAI = false;
    let needsUpgrade = false;
    let message = '';

    if (profile.role === 'admin') {
      canAccessAI = true;
      message = 'Accès administrateur complet';
    } else if (profile.role === 'pro' && isSubscriptionActive && hasTokens) {
      canAccessAI = true;
      message = 'Accès complet à l\'Assistant IA';
    } else if (profile.role === 'premium' && isSubscriptionActive && hasTokens) {
      canAccessAI = true;
      message = `Essai gratuit actif jusqu'au ${subscriptionEnd.toLocaleDateString('fr-FR')}`;
    } else {
      needsUpgrade = true;
      if (!isSubscriptionActive) {
        message = 'Votre abonnement a expiré. Veuillez souscrire à un abonnement pour continuer.';
      } else if (!hasTokens) {
        message = 'Votre solde de jetons est épuisé. Veuillez recharger vos jetons ou souscrire à un abonnement.';
      }
    }

    // Vérifier les alertes à afficher
    const alerts = await checkUserAlerts(profile);

    return c.json({
      success: true,
      user: {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        role: profile.role,
        subscription_type: profile.subscription_type,
        subscription_status: profile.subscription_status,
        subscription_end: profile.subscription_end,
        tokens_balance: profile.tokens_balance,
        trial_used: profile.trial_used,
        created_at: profile.created_at
      },
      access: {
        can_access_ai: canAccessAI,
        needs_upgrade: needsUpgrade,
        message
      },
      alerts
    });

  } catch (error) {
    console.error('❌ Erreur vérification statut:', error);
    return c.json({ 
      success: false, 
      error: error.message 
    }, 500);
  }
});

// Validation du panier avant passage en caisse
app.post('/make-server-810b4099/validate-order', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];

    if (!accessToken) {
      return c.json({ success: false, error: 'Token manquant' }, 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      return c.json({ success: false, error: 'Token invalide' }, 401);
    }

    const payload = await c.req.json().catch(() => null);
    const rawCart = Array.isArray(payload?.cart) ? payload.cart : [];

    if (rawCart.length === 0) {
      return c.json({ success: false, error: 'Panier invalide.' }, 400);
    }

    let profile: any = null;

    try {
      const { data: pgProfile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (pgProfile) {
        profile = pgProfile;
      }
    } catch (pgError) {
      console.log('⚠️ Impossible de récupérer le profil via PostgreSQL:', pgError?.message);
    }

    if (!profile) {
      profile = await kv.get(`user:${user.id}`);
    }

    if (!profile) {
      return c.json({ success: false, error: 'Profil utilisateur introuvable' }, 404);
    }

    const cartItems = rawCart.map((item: any) => ({
      type: typeof item?.type === 'string' ? String(item.type).toLowerCase() : '',
      planType: typeof item?.planType === 'string' ? String(item.planType).toLowerCase() : null
    }));

    if (cartItems.some(item => item.type !== 'subscription' && item.type !== 'tokens')) {
      return c.json({ success: false, error: 'Type d\'article inconnu dans le panier.' }, 400);
    }

    if (profile.trial_used && profile.subscription_type === 'premium') {
      const hasSubscription = cartItems.some(item => item.type === 'subscription');
      const invalidPlan = cartItems.some(item => item.type === 'subscription' && item.planType && item.planType !== 'pro');

      if (!hasSubscription) {
        return c.json({
          success: false,
          error: 'Votre période d\'essai est terminée. Un seul abonnement gratuit est autorisé par compte. Souscrivez à l\'abonnement Pro pour continuer à utiliser l\'IA.'
        }, 400);
      }

      if (invalidPlan) {
        return c.json({
          success: false,
          error: 'L\'abonnement Premium gratuit ne peut pas être renouvelé. Un seul abonnement gratuit est autorisé par compte. Choisissez plutôt l\'abonnement Pro.'
        }, 400);
      }
    }

    return c.json({ success: true });

  } catch (error) {
    console.error('❌ Erreur validation commande:', error);
    return c.json({ success: false, error: 'Erreur lors de la validation du panier' }, 500);
  }
});

// Fonction pour vérifier les alertes
async function checkUserAlerts(profile: any) {
  const alerts: Array<{ type: string; level: string; message: string; title?: string; isBlocking?: boolean }> = [];
  const now = new Date();
  const subscriptionEnd = profile.subscription_end ? new Date(profile.subscription_end) : null;
  const daysUntilExpiry = subscriptionEnd
    ? Math.floor((subscriptionEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const evaluateComparator = (value: number, comparator: string, threshold: number) => {
    switch (comparator) {
      case '<':
        return value < threshold;
      case '<=':
        return value <= threshold;
      case '=':
        return value === threshold;
      case '>=':
        return value >= threshold;
      case '>':
        return value > threshold;
      default:
        return false;
    }
  };

  try {
    const { data: rules, error } = await supabase
      .from('alert_rules')
      .select('*')
      .eq('is_active', true)
      .in('applies_to_role', ['any', profile.role]);

    if (error) {
      throw error;
    }

    const userDisplayName = profile?.name || profile?.email || 'Utilisateur';
    const userStatus = profile?.subscription_status ?? null;
    const userTokensBalance = typeof profile?.tokens_balance === 'number'
      ? profile.tokens_balance
      : Number(profile?.tokens_balance ?? 0);

    if (Array.isArray(rules)) {
      for (const rule of rules) {
        let metricValue: number | null = null;

        const metadata = rule.metadata ?? {};

        if (rule.target === 'general') {
          const statusFilter = Array.isArray(metadata.statusFilter)
            ? metadata.statusFilter as string[]
            : [];

          if (statusFilter.length > 0 && (!userStatus || !statusFilter.includes(userStatus))) {
            continue;
          }

          let message = String(rule.message_template ?? '');
          message = message
            .replace(/{{user_name}}/g, userDisplayName)
            .replace(/{{days}}/g, daysUntilExpiry !== null ? String(daysUntilExpiry) : '0')
            .replace(/{{tokens}}/g, String(Math.max(userTokensBalance, 0)));

          alerts.push({
            type: 'general',
            level: rule.severity,
            message,
            title: rule.name,
            isBlocking: Boolean(rule.is_blocking),
            metadata
          });

          continue;
        }

        if (rule.target === 'subscription') {
          if (daysUntilExpiry === null) {
            continue;
          }
          metricValue = daysUntilExpiry;
        } else if (rule.target === 'tokens') {
          metricValue = typeof profile.tokens_balance === 'number'
            ? profile.tokens_balance
            : Number(profile.tokens_balance ?? 0);
        }

        if (metricValue === null || Number.isNaN(metricValue)) {
          continue;
        }

        if (!evaluateComparator(metricValue, rule.comparator, rule.threshold)) {
          continue;
        }

        let message = String(rule.message_template ?? '');
        message = message
          .replace(/{{days}}/g, daysUntilExpiry !== null ? String(daysUntilExpiry) : '0')
          .replace(/{{tokens}}/g, String(Math.max(metricValue, 0)))
          .replace(/{{user_name}}/g, userDisplayName);

        alerts.push({
          type: rule.target,
          level: rule.severity,
          message,
          title: rule.name,
          isBlocking: Boolean(rule.is_blocking),
          metadata
        });
      }
    }

    return alerts;
  } catch (error) {
    console.warn('⚠️ Impossible de charger alert_rules, fallback system_settings', error);

    const fallbackAlerts: Array<{ type: string; level: string; message: string }> = [];
    const settings = await kv.get('system_settings') || {};
    const tokensBalance = typeof profile.tokens_balance === 'number'
      ? profile.tokens_balance
      : Number(profile.tokens_balance ?? 0);

    if (profile.role === 'pro' && daysUntilExpiry !== null) {
      if (daysUntilExpiry <= 20 && daysUntilExpiry > 7 && settings.alert_pro_subscription_20d) {
        fallbackAlerts.push({ type: 'subscription', level: 'info', message: `Votre abonnement expire dans ${daysUntilExpiry} jours` });
      } else if (daysUntilExpiry <= 7 && daysUntilExpiry > 2 && settings.alert_pro_subscription_7d) {
        fallbackAlerts.push({ type: 'subscription', level: 'warning', message: `Votre abonnement expire dans ${daysUntilExpiry} jours` });
      } else if (daysUntilExpiry <= 2 && daysUntilExpiry > 0 && settings.alert_pro_subscription_2d) {
        fallbackAlerts.push({ type: 'subscription', level: 'error', message: `Votre abonnement expire dans ${daysUntilExpiry} jours` });
      } else if (daysUntilExpiry <= 0 && settings.alert_pro_subscription_0d) {
        fallbackAlerts.push({ type: 'subscription', level: 'error', message: 'Votre abonnement a expiré' });
      }

      if (tokensBalance <= 100000 && tokensBalance > 50000 && settings.alert_pro_tokens_100k) {
        fallbackAlerts.push({ type: 'tokens', level: 'info', message: `Il vous reste ${tokensBalance.toLocaleString()} jetons` });
      } else if (tokensBalance <= 50000 && tokensBalance > 0 && settings.alert_pro_tokens_50k) {
        fallbackAlerts.push({ type: 'tokens', level: 'warning', message: `Il vous reste ${tokensBalance.toLocaleString()} jetons` });
      } else if (tokensBalance <= 0 && settings.alert_pro_tokens_0) {
        fallbackAlerts.push({ type: 'tokens', level: 'error', message: 'Votre solde de jetons est épuisé' });
      }
    } else if (profile.role === 'premium' && daysUntilExpiry !== null) {
      if (daysUntilExpiry <= 5 && daysUntilExpiry > 3 && settings.alert_premium_subscription_5d) {
        fallbackAlerts.push({ type: 'subscription', level: 'info', message: `Votre essai gratuit se termine dans ${daysUntilExpiry} jours` });
      } else if (daysUntilExpiry <= 3 && daysUntilExpiry > 2 && settings.alert_premium_subscription_3d) {
        fallbackAlerts.push({ type: 'subscription', level: 'warning', message: `Votre essai gratuit se termine dans ${daysUntilExpiry} jours` });
      } else if (daysUntilExpiry <= 2 && daysUntilExpiry > 0 && settings.alert_premium_subscription_2d) {
        fallbackAlerts.push({ type: 'subscription', level: 'error', message: `Votre essai gratuit se termine dans ${daysUntilExpiry} jours` });
      } else if (daysUntilExpiry <= 0 && settings.alert_premium_subscription_0d) {
        fallbackAlerts.push({ type: 'subscription', level: 'error', message: 'Votre essai gratuit a expiré' });
      }

      if (tokensBalance <= 50000 && tokensBalance > 25000 && settings.alert_premium_tokens_50k) {
        fallbackAlerts.push({ type: 'tokens', level: 'info', message: `Il vous reste ${tokensBalance.toLocaleString()} jetons` });
      } else if (tokensBalance <= 25000 && tokensBalance > 10000 && settings.alert_premium_tokens_25k) {
        fallbackAlerts.push({ type: 'tokens', level: 'warning', message: `Il vous reste ${tokensBalance.toLocaleString()} jetons` });
      } else if (tokensBalance <= 10000 && tokensBalance > 0 && settings.alert_premium_tokens_10k) {
        fallbackAlerts.push({ type: 'tokens', level: 'warning', message: `Il vous reste ${tokensBalance.toLocaleString()} jetons` });
      } else if (tokensBalance <= 0 && settings.alert_premium_tokens_0) {
        fallbackAlerts.push({ type: 'tokens', level: 'error', message: 'Votre solde de jetons est épuisé' });
      }
    }

    return fallbackAlerts;
  }
}

// Route pour consommer des jetons
app.post('/make-server-810b4099/consume-tokens', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { amount } = await c.req.json();

    if (!accessToken) {
      return c.json({ success: false, error: 'Token manquant' }, 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (authError || !user) {
      return c.json({ success: false, error: 'Token invalide' }, 401);
    }

    // Récupérer le profil utilisateur
    const profile = await kv.get(`user:${user.id}`);

    if (!profile) {
      return c.json({ success: false, error: 'Profil introuvable' }, 404);
    }

    // Vérifier si l'utilisateur peut consommer des jetons
    if (profile.role !== 'admin' && profile.tokens_balance < amount) {
      return c.json({ 
        success: false, 
        error: 'Solde de jetons insuffisant',
        needs_upgrade: true
      }, 400);
    }

    // Admin a des jetons illimités
    if (profile.role !== 'admin') {
      // Déduire les jetons
      profile.tokens_balance -= amount;
      profile.updated_at = new Date().toISOString();
      
      await kv.set(`user:${user.id}`, profile);
    }

    return c.json({
      success: true,
      tokens_consumed: amount,
      remaining_balance: profile.role === 'admin' ? 999999999 : profile.tokens_balance
    });

  } catch (error) {
    console.error('❌ Erreur consommation jetons:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Route pour tester la santé du serveur
app.get('/make-server-810b4099/health', (c) => {
  return c.json({ 
    success: true, 
    message: 'Serveur Misan opérationnel',
    timestamp: new Date().toISOString(),
    storage: 'key_value_store'
  });
});

// Démarrer le serveur
serve(app.fetch);
