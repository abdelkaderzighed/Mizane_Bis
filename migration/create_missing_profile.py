#!/usr/bin/env python3
import psycopg2

dest_db = "postgresql://postgres:Piano_2025_Sup@db.pxcwsfnuvmowlvtycslc.supabase.co:5432/postgres"

print("Connexion à MizaneDb...")
conn = psycopg2.connect(dest_db)
cur = conn.cursor()

email = "wahidbadici@gmail.com"
user_id = "72abb791-efd5-40df-9e9f-251a4e37faf4"

print(f"\n📝 Création du profil pour {email}...\n")

cur.execute("""
    INSERT INTO user_profiles (id, email, name, role, subscription_status)
    VALUES (%s, %s, %s, 'premium', 'active')
    ON CONFLICT (id) DO NOTHING
""", (user_id, email, "Wahid Badici"))

conn.commit()
print("✓ Profil créé !")

cur.close()
conn.close()
