-- Script SQL pour vérifier que la base de données est vide
-- À utiliser via l'endpoint /verify-empty

-- Vérifier les utilisateurs dans auth.users
SELECT 
    'auth.users' as table_name,
    COUNT(*) as row_count
FROM auth.users
WHERE deleted_at IS NULL;

-- Vérifier la table kv_store (principale table de données)
SELECT 
    'kv_store_810b4099' as table_name,
    COUNT(*) as row_count
FROM kv_store_810b4099;

-- Vérifier s'il y a des sessions actives
SELECT 
    'auth.sessions' as table_name,
    COUNT(*) as row_count
FROM auth.sessions
WHERE expires_at > NOW();

-- Vérifier les refresh tokens
SELECT 
    'auth.refresh_tokens' as table_name,
    COUNT(*) as row_count
FROM auth.refresh_tokens
WHERE revoked = false;

-- Résumé général
SELECT 
    CASE 
        WHEN (
            (SELECT COUNT(*) FROM auth.users WHERE deleted_at IS NULL) +
            (SELECT COUNT(*) FROM kv_store_810b4099) +
            (SELECT COUNT(*) FROM auth.sessions WHERE expires_at > NOW()) +
            (SELECT COUNT(*) FROM auth.refresh_tokens WHERE revoked = false)
        ) = 0 THEN 'EMPTY'
        ELSE 'NOT_EMPTY'
    END as database_status,
    (SELECT COUNT(*) FROM auth.users WHERE deleted_at IS NULL) as active_users,
    (SELECT COUNT(*) FROM kv_store_810b4099) as kv_records,
    (SELECT COUNT(*) FROM auth.sessions WHERE expires_at > NOW()) as active_sessions,
    (SELECT COUNT(*) FROM auth.refresh_tokens WHERE revoked = false) as valid_tokens;