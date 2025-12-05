#!/usr/bin/env python3
"""
Investiguer pourquoi certains documents n'apparaissent pas dans les résultats
de recherche sémantique.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from dotenv import load_dotenv
load_dotenv()

from shared.postgres import get_connection_simple
from shared.r2_storage import get_r2_client, normalize_key, get_bucket_name
import numpy as np
from sentence_transformers import SentenceTransformer
import requests
import json

def investigate_missing_documents(query="budget primitif de la nation"):
    """Trouver et analyser les documents manquants dans les résultats."""

    print("=" * 100)
    print(f"🔍 Investigation : Documents manquants pour la requête '{query}'")
    print("=" * 100)
    print()

    # 1. Récupérer tous les IDs de la base de données
    conn = get_connection_simple()
    cur = conn.cursor()
    cur.execute("SELECT id FROM joradp_documents ORDER BY id")
    all_ids = {row['id'] for row in cur.fetchall()}
    print(f"📊 Total documents dans la BD : {len(all_ids)}")

    # 2. Faire une recherche sémantique via l'API
    print(f"🔎 Recherche sémantique avec : '{query}'")
    response = requests.get(
        "http://localhost:5001/api/joradp/search/semantic",
        params={"q": query, "limit": 0}  # limit=0 pour avoir tous les résultats
    )

    if response.status_code != 200:
        print(f"❌ Erreur API : {response.status_code}")
        return

    data = response.json()
    result_ids = {r['id'] for r in data.get('results', [])}
    total_returned = data.get('total', 0)

    print(f"📊 Résultats retournés : {len(result_ids)}")
    print(f"📊 Total affiché par l'API : {total_returned}")
    print()

    # 3. Identifier les documents manquants
    missing_ids = sorted(all_ids - result_ids)

    if not missing_ids:
        print("✅ Aucun document manquant !")
        cur.close()
        conn.close()
        return

    print(f"⚠️  {len(missing_ids)} documents manquants : {missing_ids}")
    print()

    # 4. Charger le modèle pour calculer les scores manuellement
    print("📦 Chargement du modèle sentence-transformers...")
    model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
    query_vec = model.encode(query, convert_to_numpy=True)
    query_norm = np.linalg.norm(query_vec)

    # 5. Analyser chaque document manquant
    cur.execute("""
        SELECT id, url, embeddings_r2, publication_date
        FROM joradp_documents
        WHERE id = ANY(%s)
        ORDER BY id
    """, (missing_ids,))

    missing_docs = cur.fetchall()

    print("=" * 100)
    print("Analyse détaillée des documents manquants :")
    print("=" * 100)
    print()

    r2_client = get_r2_client()
    bucket = get_bucket_name()

    for doc in missing_docs:
        doc_id = doc['id']
        filename = doc['url'].split('/')[-1] if doc['url'] else f"doc_{doc_id}"
        embed_path = doc['embeddings_r2']

        print(f"📄 Document ID {doc_id} ({filename})")
        print(f"   Date publication : {doc['publication_date']}")
        print(f"   Embedding R2 : {embed_path}")

        if not embed_path:
            print(f"   ❌ Pas d'embedding R2")
            print()
            continue

        try:
            # Télécharger l'embedding depuis R2
            embed_key = normalize_key(embed_path)
            response = r2_client.get_object(Bucket=bucket, Key=embed_key)
            embed_bytes = response['Body'].read()
            embedding = np.frombuffer(embed_bytes, dtype=np.float32)

            # Vérifier la validité de l'embedding
            embed_norm = np.linalg.norm(embedding)

            print(f"   Embedding shape : {embedding.shape}")
            print(f"   Embedding norm : {embed_norm}")
            print(f"   Min/Max values : {embedding.min():.6f} / {embedding.max():.6f}")
            print(f"   Has NaN : {np.isnan(embedding).any()}")
            print(f"   Has Inf : {np.isinf(embedding).any()}")

            # Calculer le score
            if embed_norm == 0:
                score = 0.0
                print(f"   ⚠️  Score : VECTEUR NUL (norm=0)")
            elif query_norm == 0:
                score = 0.0
                print(f"   ⚠️  Score : QUERY NUL (norm=0)")
            else:
                dot_product = float(np.dot(query_vec, embedding))
                score = dot_product / (query_norm * embed_norm)
                print(f"   ✅ Score calculé : {score:.6f}")

                # Vérifier si le score est NaN ou Inf
                if np.isnan(score):
                    print(f"   ⚠️  Score est NaN !")
                elif np.isinf(score):
                    print(f"   ⚠️  Score est Inf !")

        except Exception as e:
            print(f"   ❌ Erreur : {e}")

        print()

    print("=" * 100)
    print("💡 Conclusion :")
    print("=" * 100)
    print()
    print("Si les embeddings ont des vecteurs nuls ou produisent des scores NaN/Inf,")
    print("ils sont automatiquement filtrés par le code de recherche sémantique.")
    print()
    print("Solutions possibles :")
    print("1. Re-générer les embeddings pour ces documents")
    print("2. Mettre un score de 0.0 pour les cas avec norm=0")
    print("3. Ajouter un try/except dans le code de recherche pour gérer les NaN")

    cur.close()
    conn.close()


if __name__ == '__main__':
    import sys
    query = sys.argv[1] if len(sys.argv) > 1 else "budget primitif de la nation"
    investigate_missing_documents(query)
