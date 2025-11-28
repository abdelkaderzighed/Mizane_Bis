#!/usr/bin/env python3
import sys
try:
    from supabase import create_client
except:
    print("Installez supabase: pip3 install supabase")
    sys.exit(1)

print("="*60)
print("CLONAGE Missan-V3 → MizaneDb")
print("="*60)
print()
print("Credentials Missan-V3:")
m_url = input("URL: ").strip()
m_key = input("service_role key: ").strip()
print()
print("Credentials MizaneDb:")
z_url = input("URL: ").strip()
z_key = input("service_role key: ").strip()

print("\nConnexion...")
m = create_client(m_url, m_key)
z = create_client(z_url, z_key)
print("✓ Connecte\n")

tables = ['user_profiles','user_alerts','ai_usage_logs','alert_rules','client_conversations','clients','document_templates','email_templates','invoices','subscriptions','support_messages','system_settings','transactions']

total = 0
for t in tables:
    try:
        rows = m.table(t).select("*").execute().data
        print(f"{t}: {len(rows)} lignes", end=" ")
        for r in rows:
            try:
                z.table(t).insert(r).execute()
            except:
                pass
        print("✓")
        total += len(rows)
    except Exception as e:
        print(f"✗ {str(e)[:40]}")

print(f"\n✓ Total: {total} lignes")
