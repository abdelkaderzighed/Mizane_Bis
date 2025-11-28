#!/usr/bin/env python3
import psycopg2
import hashlib
import secrets

dest_db = "postgresql://postgres:Piano_2025_Sup@db.pxcwsfnuvmowlvtycslc.supabase.co:5432/postgres"

print("Connexion à MizaneDb...")
conn = psycopg2.connect(dest_db)
cur = conn.cursor()

email = "djamel@zighed.com"
new_password = "admin"

print(f"\n🔍 Vérification du compte {email}...\n")

# Vérifier si l'utilisateur existe
cur.execute("SELECT id, email, email_confirmed_at, banned_until FROM auth.users WHERE email = %s", (email,))
user = cur.fetchone()

if user:
    user_id, user_email, confirmed_at, banned = user
    print(f"✓ Compte trouvé")
    print(f"  ID: {user_id}")
    print(f"  Confirmé: {confirmed_at}")
    print(f"  Banni: {banned}")
    
    # Confirmer l'email si nécessaire
    if not confirmed_at:
        print("\n⚙️ Confirmation de l'email...")
        cur.execute("""
            UPDATE auth.users 
            SET email_confirmed_at = NOW(),
                confirmation_token = '',
                confirmation_sent_at = NULL
            WHERE email = %s
        """, (email,))
    
    # Réinitialiser le mot de passe
    print(f"\n⚙️ Réinitialisation du mot de passe à '{new_password}'...")
    
    # Utiliser la fonction bcrypt de PostgreSQL
    cur.execute("SELECT crypt(%s, gen_salt('bf'))", (new_password,))
    hashed = cur.fetchone()[0]
    
    cur.execute("""
        UPDATE auth.users 
        SET encrypted_password = %s,
            updated_at = NOW()
        WHERE email = %s
    """, (hashed, email))
    
    conn.commit()
    print(f"\n✅ Compte réinitialisé !")
    print(f"\nConnexion :")
    print(f"  Email: {email}")
    print(f"  Mot de passe: {new_password}")
    
else:
    print(f"✗ Aucun compte trouvé pour {email}")

cur.close()
conn.close()
