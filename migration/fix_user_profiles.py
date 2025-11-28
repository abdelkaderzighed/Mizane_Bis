#!/usr/bin/env python3
import psycopg2
from psycopg2.extras import RealDictCursor

dest_db = "postgresql://postgres:Piano_2025_Sup@db.pxcwsfnuvmowlvtycslc.supabase.co:5432/postgres"

print("Connexion à MizaneDb...")
conn = psycopg2.connect(dest_db)
cur = conn.cursor(cursor_factory=RealDictCursor)

print("\n🔍 Vérification des correspondances auth.users <-> user_profiles\n")

# Lister les utilisateurs auth
cur.execute("SELECT id, email FROM auth.users ORDER BY email")
auth_users = cur.fetchall()

print(f"Utilisateurs dans auth.users : {len(auth_users)}")
for user in auth_users:
    print(f"  - {user['email']} (ID: {user['id']})")

print("\n" + "="*60 + "\n")

# Lister les user_profiles
cur.execute("SELECT id, email FROM user_profiles ORDER BY email")
profiles = cur.fetchall()

print(f"Profils dans user_profiles : {len(profiles)}")
for profile in profiles:
    print(f"  - {profile['email']} (ID: {profile['id']})")

print("\n" + "="*60 + "\n")

# Vérifier les correspondances
print("Vérification des correspondances par email...\n")
for auth_user in auth_users:
    cur.execute("SELECT id, email FROM user_profiles WHERE email = %s", (auth_user['email'],))
    profile = cur.fetchone()
    
    if profile:
        if profile['id'] == auth_user['id']:
            print(f"✓ {auth_user['email']} : IDs correspondent")
        else:
            print(f"✗ {auth_user['email']} : IDs différents")
            print(f"    auth.users ID: {auth_user['id']}")
            print(f"    user_profiles ID: {profile['id']}")
            print(f"    → Correction en cours...")
            
            # Corriger l'ID dans user_profiles
            cur.execute("""
                UPDATE user_profiles 
                SET id = %s 
                WHERE email = %s
            """, (auth_user['id'], auth_user['email']))
            conn.commit()
            print(f"    ✓ Corrigé !")
    else:
        print(f"⚠ {auth_user['email']} : Pas de profil trouvé, création...")
        # Créer un profil basique
        cur.execute("""
            INSERT INTO user_profiles (id, email, role, subscription_status)
            VALUES (%s, %s, 'premium', 'active')
        """, (auth_user['id'], auth_user['email']))
        conn.commit()
        print(f"    ✓ Profil créé !")

cur.close()
conn.close()

print("\n✅ Vérification et corrections terminées !")
