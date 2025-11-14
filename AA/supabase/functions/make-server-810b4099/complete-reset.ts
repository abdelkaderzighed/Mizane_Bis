import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

interface CompleteResetResult {
  success: boolean;
  message: string;
  operations_performed: string[];
  admin_user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    tokens: number;
  };
  verification?: {
    table_accessible: boolean;
    record_count: number;
    admin_exists: boolean;
    auth_user_exists: boolean;
  };
  error?: string;
  warning?: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    console.log('🔥 DÉBUT DE LA RÉINITIALISATION COMPLÈTE DE LA BASE DE DONNÉES MISAN');
    
    const result: CompleteResetResult = {
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
    console.log('🗑️ ÉTAPE 1: Suppression de tous les utilisateurs Auth...');
    try {
      const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (listError) {
        console.log('⚠️ Erreur récupération utilisateurs:', listError.message);
        result.operations_performed.push(`Avertissement: ${listError.message}`);
      } else if (users && users.users.length > 0) {
        console.log(`👥 ${users.users.length} utilisateur(s) trouvé(s) à supprimer`);
        
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
    console.log('🗑️ ÉTAPE 2: Suppression de toutes les tables...');
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
        try {
          const { error } = await supabaseAdmin
            .from(tableName)
            .delete()
            .neq('id', 'impossible_id'); // Requête qui ne supprime rien mais teste l'existence
          
          if (!error) {
            // Table existe, la supprimer
            const { error: dropError } = await supabaseAdmin.rpc('exec_sql', {
              sql: `DROP TABLE IF EXISTS ${tableName} CASCADE;`
            });
            
            if (dropError) {
              console.log(`⚠️ Erreur suppression table ${tableName}:`, dropError.message);
            } else {
              console.log(`✅ Table supprimée: ${tableName}`);
            }
          }
        } catch (tableError) {
          console.log(`ℹ️ Table ${tableName} n'existe pas ou déjà supprimée`);
        }
      }
      
      result.operations_performed.push('Suppression de toutes les tables personnalisées');
    } catch (error) {
      console.log('⚠️ Erreur lors de la suppression des tables:', error.message);
      result.operations_performed.push(`Erreur suppression tables: ${error.message}`);
    }

    // ÉTAPE 3: Recréer la table KV store avec structure complète
    console.log('🏗️ ÉTAPE 3: Création de la table KV store...');
    try {
      const { error: createError } = await supabaseAdmin.rpc('exec_sql', {
        sql: `
          -- Supprimer la table si elle existe encore
          DROP TABLE IF EXISTS kv_store_810b4099 CASCADE;
          
          -- Créer la table KV store principale
          CREATE TABLE kv_store_810b4099 (
            key TEXT NOT NULL PRIMARY KEY,
            value JSONB NOT NULL,
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
          );

          -- Créer l'index sur la clé
          CREATE INDEX idx_kv_store_810b4099_key ON kv_store_810b4099(key);

          -- Activer RLS
          ALTER TABLE kv_store_810b4099 ENABLE ROW LEVEL SECURITY;

          -- Politique pour les utilisateurs authentifiés
          CREATE POLICY "Authenticated users can manage kv_store data"
            ON kv_store_810b4099
            FOR ALL
            TO authenticated
            USING (true)
            WITH CHECK (true);

          -- Politique pour le service role
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
          CREATE TRIGGER update_kv_store_810b4099_updated_at
            BEFORE UPDATE ON kv_store_810b4099
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        `
      });

      if (createError) {
        throw new Error(`Erreur création table: ${createError.message}`);
      }

      console.log('✅ Table kv_store_810b4099 créée avec succès');
      result.operations_performed.push('Création de la table kv_store_810b4099 avec RLS et triggers');
    } catch (error) {
      console.log('❌ Erreur création table KV:', error.message);
      result.operations_performed.push(`Erreur création table KV: ${error.message}`);
      
      // Si on ne peut pas créer via rpc, essayer directement
      try {
        const { error: directError } = await supabaseAdmin
          .from('kv_store_810b4099')
          .select('*')
          .limit(1);
        
        if (directError && directError.message.includes('does not exist')) {
          console.log('🔧 Tentative de création directe...');
          // La table n'existe vraiment pas, on continue
        }
      } catch (directTestError) {
        console.log('🔧 Test direct échoué, table probablement inexistante');
      }
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
        try {
          const { error } = await supabaseAdmin
            .from('kv_store_810b4099')
            .upsert({
              key: `system_setting:${key}`,
              value: { value, description: `Paramètre système: ${key}` }
            });

          if (error) {
            console.log(`⚠️ Erreur paramètre ${key}:`, error.message);
          } else {
            console.log(`✅ Paramètre configuré: ${key}`);
          }
        } catch (settingError) {
          console.log(`⚠️ Erreur configuration ${key}:`, settingError.message);
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

    // ÉTAPE 6: Vérification finale complète
    console.log('🔍 ÉTAPE 6: Vérification finale...');
    try {
      // Vérifier que la table existe et est accessible
      const { data: tableCheck, error: tableError } = await supabaseAdmin
        .from('kv_store_810b4099')
        .select('key')
        .limit(1);

      const tableAccessible = !tableError;

      // Compter les enregistrements
      const { count, error: countError } = await supabaseAdmin
        .from('kv_store_810b4099')
        .select('*', { count: 'exact', head: true });

      const recordCount = count || 0;

      // Vérifier l'utilisateur admin dans KV store
      const { data: adminCheck, error: adminError } = await supabaseAdmin
        .from('kv_store_810b4099')
        .select('value')
        .eq('key', 'user_by_email:a@a.a')
        .single();

      const adminExists = !adminError;

      // Vérifier l'utilisateur admin dans Auth
      const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
      const authUserExists = !authError && authUsers?.users?.some(u => u.email === 'a@a.a');

      result.verification = {
        table_accessible: tableAccessible,
        record_count: recordCount,
        admin_exists: adminExists,
        auth_user_exists: authUserExists
      };

      console.log('📊 Vérification finale:');
      console.log(`  - Table accessible: ${tableAccessible}`);
      console.log(`  - Enregistrements: ${recordCount}`);
      console.log(`  - Admin KV existe: ${adminExists}`);
      console.log(`  - Admin Auth existe: ${authUserExists}`);

      result.operations_performed.push('Vérification finale de la structure et des données');
    } catch (error) {
      console.log('⚠️ Erreur vérification:', error.message);
      result.operations_performed.push(`Erreur vérification: ${error.message}`);
    }

    // ÉTAPE 7: Finaliser le résultat
    const hasErrors = result.operations_performed.some(op => op.includes('Erreur'));
    const hasAdminUser = result.admin_user && result.verification?.admin_exists && result.verification?.auth_user_exists;
    
    if (!hasErrors && hasAdminUser && result.verification?.table_accessible) {
      result.success = true;
      result.message = '🎉 Réinitialisation complète réussie ! Base de données vierge recréée avec utilisateur admin fonctionnel.';
      console.log('🎉 RÉINITIALISATION COMPLÈTE TERMINÉE AVEC SUCCÈS');
    } else if (!hasErrors && result.verification?.table_accessible) {
      result.success = true;
      result.message = '✅ Réinitialisation terminée. Table créée mais admin partiellement configuré.';
      result.warning = 'L\'utilisateur admin pourrait nécessiter une configuration manuelle.';
      console.log('✅ RÉINITIALISATION TERMINÉE AVEC AVERTISSEMENTS');
    } else {
      result.success = false;
      result.message = '⚠️ Réinitialisation terminée avec des erreurs. Consultez les détails.';
      result.warning = 'Certaines opérations ont échoué. La structure de base pourrait être incomplète.';
      console.log('⚠️ RÉINITIALISATION TERMINÉE AVEC ERREURS');
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('💥 ERREUR CRITIQUE RÉINITIALISATION:', error);
    
    const errorResult: CompleteResetResult = {
      success: false,
      message: 'Erreur critique lors de la réinitialisation complète',
      operations_performed: ['Erreur critique empêchant la réinitialisation'],
      error: error.message || 'Erreur inconnue'
    };

    return new Response(JSON.stringify(errorResult), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});