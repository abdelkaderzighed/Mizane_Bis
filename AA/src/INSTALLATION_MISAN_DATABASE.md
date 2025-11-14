# 🗄️ Installation de la Base de Données Misan

Guide complet pour initialiser la base de données de l'assistant juridique virtuel Misan.

## 📋 Prérequis

- Projet Supabase créé et configuré
- Accès à l'interface SQL de Supabase Dashboard
- Variables d'environnement configurées :
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`  
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_DB_URL`

## 🚀 Options d'installation

### Option 1 : Installation via l'interface Misan (Recommandée)

1. **Lancez l'application** Misan
2. **Page d'authentification** : Cliquez sur "Initialiser la base de données"
3. **Attendez la confirmation** : Le système créera automatiquement tout
4. **Connectez-vous** avec `zighed@zighed.com` / `admin`

> ✅ Cette méthode utilise le système key-value store et configure automatiquement l'utilisateur admin.

### Option 2 : Installation SQL complète

Si vous préférez créer une structure de base de données traditionnelle avec des tables :

1. **Accédez au Supabase Dashboard** → SQL Editor
2. **Exécutez le script principal** :
   ```sql
   -- Copiez et collez le contenu de /supabase/functions/server/complete-database-init.sql
   ```
3. **Vérifiez l'installation** :
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name LIKE '%user%' OR table_name LIKE '%subscription%';
   ```

### Option 3 : Installation rapide (Tables essentielles uniquement)

Pour une configuration minimale :

1. **Exécutez le script rapide** :
   ```sql
   -- Copiez et collez le contenu de /supabase/functions/server/quick-setup.sql
   ```

## 🏗️ Structure de la base de données

### Tables créées

| Table | Description | Usage |
|-------|-------------|--------|
| `user_profiles` | Profils utilisateurs étendus | Informations complètes utilisateur |
| `subscriptions` | Gestion des abonnements | Pro (payant) vs Premium (essai gratuit) |
| `transactions` | Historique des paiements | Facturation et jetons |
| `user_alerts` | Alertes personnalisées | Notifications selon seuils |
| `system_settings` | Configuration globale | Paramètres admin |
| `ai_usage_logs` | Logs d'utilisation IA | Suivi consommation |
| `invoices` | Factures générées | Comptabilité |

### Système Key-Value (par défaut)

L'application utilise la table `kv_store_810b4099` avec ces clés :

| Clé | Contenu |
|-----|---------|
| `user:{uuid}` | Profil utilisateur complet |
| `user_by_email:{email}` | Mapping email → user_id |
| `subscription:{uuid}` | Abonnement utilisateur |
| `system_settings` | Configuration globale |

## 👤 Utilisateur Admin

### Informations de connexion
- **Email** : `zighed@zighed.com`
- **Mot de passe** : `admin`
- **Rôle** : Administrateur
- **Jetons** : Illimités (999 999 999)
- **Expiration** : 31 décembre 2030

### Privilèges admin
- ✅ Accès complet à l'IA sans limitation de jetons
- ✅ Gestion des paramètres système
- ✅ Visualisation de tous les profils utilisateurs
- ✅ Accès aux logs d'utilisation
- ✅ Gestion des abonnements et transactions

## ⚙️ Paramètres système par défaut

### Essai gratuit
- **Durée** : 7 jours
- **Jetons inclus** : 100 000
- **Rôle** : Premium
- **Auto-expiration** : Oui

### Abonnement Pro
- **Prix mensuel** : 4 000 DA HT
- **Jetons inclus** : Non (achat séparé)
- **Alertes** : 20j, 7j, 2j, 0j
- **Seuils jetons** : 100k, 50k, 0

### Alertes Premium
- **Alertes abonnement** : 5j, 3j, 2j, 0j
- **Seuils jetons** : 50k, 25k, 10k, 0

## 🔧 Vérification post-installation

### Test de santé du serveur
```bash
curl -X GET "https://YOUR_PROJECT.supabase.co/functions/v1/make-server-810b4099/health" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### Vérification des tables (si Option 2 ou 3)
```sql
-- Compter les utilisateurs
SELECT COUNT(*) as total_users, role 
FROM user_profiles 
GROUP BY role;

-- Vérifier les paramètres
SELECT key, value, description 
FROM system_settings 
WHERE category = 'general';

-- Vérifier l'admin
SELECT email, name, role, tokens_balance 
FROM user_profiles 
WHERE role = 'admin';
```

### Test d'authentification
1. Tentez de vous connecter avec `zighed@zighed.com` / `admin`
2. Vérifiez que le badge "🔧 MODE DEV" n'apparaît PAS (mode production)
3. Confirmez l'accès aux fonctionnalités admin

## 🚨 Dépannage

### Erreur "Profil introuvable"
- Vérifiez que l'utilisateur admin existe dans Supabase Auth
- Confirmez que le profil est créé (KV store ou table)
- Rechargez la page et reconnectez-vous

### Erreur "Serveur indisponible"
- Vérifiez que les Edge Functions sont déployées
- Contrôlez les variables d'environnement
- Utilisez le mode développement en local

### Erreur de permissions
- Vérifiez les politiques RLS
- Confirmez le rôle admin de l'utilisateur
- Rechargez les paramètres système

## 📝 Maintenance

### Nettoyage périodique
```sql
-- Supprimer les alertes expirées
DELETE FROM user_alerts WHERE expires_at < NOW();

-- Mettre à jour les abonnements expirés
SELECT check_and_update_expired_subscriptions();
```

### Sauvegarde recommandée
```bash
# Exporter la configuration
pg_dump --data-only --table=system_settings YOUR_DB > misan_settings_backup.sql

# Exporter les profils utilisateurs
pg_dump --data-only --table=user_profiles YOUR_DB > misan_users_backup.sql
```

## 🎯 Prochaines étapes

Après installation réussie :

1. **Testez la connexion** avec les identifiants admin
2. **Explorez l'interface** et les fonctionnalités
3. **Créez un utilisateur test** avec la fonction d'inscription
4. **Configurez les paramètres** depuis le panneau admin
5. **Activez le mode production** en déployant les Edge Functions

---

**Support technique** : En cas de problème, vérifiez d'abord les logs de la console navigateur et les logs Supabase.