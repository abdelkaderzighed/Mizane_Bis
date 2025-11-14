import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

interface ResetResult {
  success: boolean;
  message: string;
  operations_performed: string[];
  admin_user?: any;
  verification?: any;
  error?: string;
  warning?: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    console.log('🔥 DÉBUT DE LA RÉINITIALISATION COMPLÈTE');
    
    const result: ResetResult = {
      success: false,
      message: '',
      operations_performed: []
    };

    // Créer le client Supabase admin
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('📡 Client Supabase admin créé');

    // ÉTAPE 1: Supprimer tous les utilisateurs Auth
    console.log('🗑️ ÉTAPE 1: Suppression des utilisateurs Auth...');
    try {
      // Récupérer tous les utilisateurs
      const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (listError) {
        console.log('⚠️ Erreur récupération utilisateurs:', listError.message);
      } else if (users && users.users.length > 0) {
        console.log(`👥 ${users.users.length} utilisateur(s) trouvé(s)`);
        
        // Supprimer chaque utilisateur
        for (const user of users.users) {
          const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
          if (deleteError) {
            console.log(`❌ Erreur suppression utilisateur ${user.email}:`, deleteError.message);
          } else {
            console.log(`✅ Utilisateur supprimé: ${user.email}`);
          }
        }
        result.operations_performed.push(`Suppression de ${users.users.length} utilisateur(s) Auth`);
      } else {
        console.log('ℹ️ Aucun utilisateur Auth trouvé');
        result.operations_performed.push('Aucun utilisateur Auth à supprimer');
      }
    } catch (error) {
      console.log('⚠️ Erreur lors de la suppression des utilisateurs:', error.message);
      result.operations_performed.push(`Erreur suppression utilisateurs: ${error.message}`);
    }

    // ÉTAPE 2: Supprimer toutes les tables personnalisées
    console.log('🗑️ ÉTAPE 2: Suppression des tables...');
    try {
      const tablesToDrop = [
        'user_alerts',
        'ai_usage_logs', 
        'invoices',
        'transactions',
        'subscriptions',
        'user_profiles',
        'system_settings',
        'kv_store_810b4099'
      ];

      for (const tableName of tablesToDrop) {
        const { error: dropError } = await supabaseAdmin
          .from('_temp_drop_table')
          .select('*')
          .limit(1);
        
        // Utiliser une requête SQL directe pour supprimer les tables
        const { error } = await supabaseAdmin.rpc('exec_sql', {
          sql: `DROP TABLE IF EXISTS ${tableName} CASCADE;`
        });
        
        if (error) {
          console.log(`⚠️ Erreur suppression table ${tableName}:`, error.message);
        } else {
          console.log(`✅ Table supprimée: ${tableName}`);
        }
      }
      
      result.operations_performed.push('Suppression de toutes les tables personnalisées');
    } catch (error) {
      console.log('⚠️ Erreur lors de la suppression des tables:', error.message);
      result.operations_performed.push(`Erreur suppression tables: ${error.message}`);
    }

    // ÉTAPE 3: Recréer la table KV store
    console.log('🏗️ ÉTAPE 3: Création de la table KV store...');
    try {
      const createTableSQL = `
        -- Créer la table KV store principale
        CREATE TABLE IF NOT EXISTS kv_store_810b4099 (
          key TEXT NOT NULL PRIMARY KEY,
          value JSONB NOT NULL,
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
        );

        -- Créer l'index sur la clé
        CREATE INDEX IF NOT EXISTS idx_kv_store_810b4099_key ON kv_store_810b4099(key);

        -- Activer RLS
        ALTER TABLE kv_store_810b4099 ENABLE ROW LEVEL SECURITY;

        -- Politique pour les utilisateurs authentifiés
        DROP POLICY IF EXISTS "Authenticated users can manage kv_store data" ON kv_store_810b4099;
        CREATE POLICY "Authenticated users can manage kv_store data"
          ON kv_store_810b4099
          FOR ALL
          TO authenticated
          USING (true)
          WITH CHECK (true);

        -- Politique pour le service role
        DROP POLICY IF EXISTS "Service role has full access to kv_store" ON kv_store_810b4099;
        CREATE POLICY "Service role has full access to kv_store"
          ON kv_store_810b4099
          FOR ALL
          TO service_role
          USING (true)
          WITH CHECK (true);

        -- Fonction pour mettre à jour updated_at
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = now();
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        -- Trigger pour updated_at
        DROP TRIGGER IF EXISTS update_kv_store_810b4099_updated_at ON kv_store_810b4099;
        CREATE TRIGGER update_kv_store_810b4099_updated_at
          BEFORE UPDATE ON kv_store_810b4099
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
      `;

      const { error: createError } = await supabaseAdmin.rpc('exec_sql', {
        sql: createTableSQL
      });

      if (createError) {
        throw new Error(`Erreur création table: ${createError.message}`);
      }

      console.log('✅ Table kv_store_810b4099 créée avec succès');
      result.operations_performed.push('Création de la table kv_store_810b4099 avec RLS et triggers');
    } catch (error) {
      console.log('❌ Erreur création table KV:', error.message);
      result.operations_performed.push(`Erreur création table KV: ${error.message}`);
    }

    // ÉTAPE 4: Initialiser les paramètres système
    console.log('⚙️ ÉTAPE 4: Initialisation des paramètres système...');
    try {
      const systemSettings = {
        'trial_duration_days': '7',
        'trial_tokens_amount': '100000',
        'monthly_subscription_price': '4000',
        'app_version': '1.0.0',
        'support_email': 'support@misan.dz',
        'company_name': 'Misan Technologies',
        'alert_pro_subscription_7d': 'true',
        'alert_premium_subscription_3d': 'true',
        'alert_pro_tokens_50k': 'true',
        'alert_premium_tokens_10k': 'true'
      };

      for (const [key, value] of Object.entries(systemSettings)) {
        const { error } = await supabaseAdmin
          .from('kv_store_810b4099')
          .upsert({
            key: `system_setting:${key}`,
            value: { value, description: `Paramètre système: ${key}` }
          });

        if (error) {
          console.log(`⚠️ Erreur paramètre ${key}:`, error.message);
        }
      }

      console.log('✅ Paramètres système initialisés');
      result.operations_performed.push('Initialisation des paramètres système dans KV store');
    } catch (error) {
      console.log('⚠️ Erreur initialisation paramètres:', error.message);
      result.operations_performed.push(`Erreur paramètres système: ${error.message}`);
    }

    // ÉTAPE 5: Créer l'utilisateur admin
    console.log('👑 ÉTAPE 5: Création de l\'utilisateur admin...');
    try {
      // Créer l'utilisateur admin via Supabase Auth
      const { data: adminUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: 'a@a.a',
        password: 'admin',
        user_metadata: {
          name: 'Administrateur Misan',
          role: 'admin'
        },
        email_confirm: true
      });

      if (authError) {
        throw new Error(`Erreur création Auth admin: ${authError.message}`);
      }

      if (!adminUser.user) {
        throw new Error('Utilisateur admin non créé');
      }

      console.log('✅ Utilisateur Auth admin créé:', adminUser.user.id);

      // Créer le profil admin dans le KV store
      const adminProfile = {
        id: adminUser.user.id,
        email: 'a@a.a',
        name: 'Administrateur Misan',
        role: 'admin',
        subscription_type: 'admin',
        subscription_status: 'active',
        subscription_start: new Date().toISOString(),
        subscription_end: '2030-12-31T23:59:59Z',
        tokens_balance: 999999999,
        trial_used: false,
        created_at: new Date().toISOString()
      };

      // Sauvegarder le profil admin
      const { error: profileError } = await supabaseAdmin
        .from('kv_store_810b4099')
        .upsert({
          key: `user:${adminUser.user.id}`,
          value: adminProfile
        });

      if (profileError) {
        throw new Error(`Erreur sauvegarde profil admin: ${profileError.message}`);
      }

      // Créer le mapping email -> user_id
      const { error: mappingError } = await supabaseAdmin
        .from('kv_store_810b4099')
        .upsert({
          key: `user_by_email:a@a.a`,
          value: { user_id: adminUser.user.id }
        });

      if (mappingError) {
        throw new Error(`Erreur mapping email admin: ${mappingError.message}`);
      }

      console.log('✅ Profil admin créé dans KV store');
      result.admin_user = {
        id: adminUser.user.id,
        email: 'a@a.a',
        name: 'Administrateur Misan',
        role: 'admin',
        tokens: 999999999
      };
      result.operations_performed.push('Création utilisateur admin complet (Auth + KV store)');
    } catch (error) {
      console.log('❌ Erreur création admin:', error.message);
      result.operations_performed.push(`Erreur création admin: ${error.message}`);
    }

    // ÉTAPE 6: Vérification finale
    console.log('🔍 ÉTAPE 6: Vérification finale...');
    try {
      // Vérifier que la table existe
      const { data: tableCheck, error: tableError } = await supabaseAdmin
        .from('kv_store_810b4099')
        .select('key')
        .limit(1);

      if (tableError) {
        throw new Error(`Table KV non accessible: ${tableError.message}`);
      }

      // Compter les enregistrements
      const { count, error: countError } = await supabaseAdmin
        .from('kv_store_810b4099')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.log('⚠️ Erreur comptage:', countError.message);
      } else {
        console.log(`📊 Enregistrements KV store: ${count}`);
      }

      // Vérifier l'utilisateur admin
      const { data: adminCheck, error: adminError } = await supabaseAdmin
        .from('kv_store_810b4099')
        .select('value')
        .eq('key', 'user_by_email:a@a.a')
        .single();

      if (adminError) {
        console.log('⚠️ Admin non trouvé dans KV store:', adminError.message);
      } else {
        console.log('✅ Admin vérifié dans KV store');
      }

      result.verification = {
        table_accessible: !tableError,
        record_count: count || 0,
        admin_exists: !adminError
      };

      result.operations_performed.push('Vérification finale de la structure');
    } catch (error) {
      console.log('⚠️ Erreur vérification:', error.message);
      result.operations_performed.push(`Erreur vérification: ${error.message}`);
    }

    // Finaliser le résultat
    const hasErrors = result.operations_performed.some(op => op.includes('Erreur'));
    
    if (!hasErrors) {
      result.success = true;
      result.message = '🎉 Réinitialisation complète réussie ! Base de données vierge recréée avec utilisateur admin.';
      console.log('🎉 RÉINITIALISATION COMPLÈTE TERMINÉE AVEC SUCCÈS');
    } else {
      result.success = false;
      result.message = '⚠️ Réinitialisation terminée avec des erreurs. Consultez les détails.';
      result.warning = 'Certaines opérations ont échoué, mais la structure de base devrait être fonctionnelle.';
      console.log('⚠️ RÉINITIALISATION TERMINÉE AVEC ERREURS');
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('💥 ERREUR CRITIQUE RÉINITIALISATION:', error);
    
    const errorResult: ResetResult = {
      success: false,
      message: 'Erreur critique lors de la réinitialisation',
      operations_performed: ['Erreur critique empêchant la réinitialisation'],
      error: error.message || 'Erreur inconnue'
    };

    return new Response(JSON.stringify(errorResult), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});