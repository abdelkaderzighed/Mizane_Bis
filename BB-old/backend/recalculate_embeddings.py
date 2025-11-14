#!/usr/bin/env python3
"""
Script de recalcul des embeddings pour les décisions existantes
Recalcule embedding_ar ET embedding_fr pour chaque décision
"""

import os
import sys
import sqlite3
import time
from sentence_transformers import SentenceTransformer

DB_PATH = 'harvester.db'

class EmbeddingRecalculator:
    """Recalcule les embeddings AR et FR pour toutes les décisions"""

    def __init__(self):
        print("🔧 Initialisation du modèle d'embeddings...")
        self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        self.stats = {
            'total': 0,
            'success': 0,
            'failed': 0,
            'skipped': 0
        }
        self.start_time = time.time()
        print("✅ Modèle chargé\n")

    def calculate_embeddings(self, dec_id, decision):
        """Calculer les embeddings pour une décision"""

        print(f"\n{'='*70}")
        print(f"📄 Décision {dec_id}: {decision['decision_number']}")
        print(f"{'='*70}")

        # Vérifier si les embeddings existent déjà
        if decision['embedding_ar'] and decision['embedding_fr']:
            print("   ✅ Embeddings déjà calculés, ignorée")
            self.stats['skipped'] += 1
            return True

        # Lire le texte depuis les fichiers
        text_ar = ""
        text_fr = ""

        if decision['file_path_ar'] and os.path.exists(decision['file_path_ar']):
            try:
                with open(decision['file_path_ar'], 'r', encoding='utf-8') as f:
                    text_ar = f.read()
                print(f"   ✅ Texte AR lu: {len(text_ar)} caractères")
            except Exception as e:
                print(f"   ⚠️ Erreur lecture fichier AR: {e}")

        if decision['file_path_fr'] and os.path.exists(decision['file_path_fr']):
            try:
                with open(decision['file_path_fr'], 'r', encoding='utf-8') as f:
                    text_fr = f.read()
                print(f"   ✅ Texte FR lu: {len(text_fr)} caractères")
            except Exception as e:
                print(f"   ⚠️ Erreur lecture fichier FR: {e}")

        if not text_ar and not text_fr:
            print("   ❌ Aucun texte disponible")
            self.stats['failed'] += 1
            return False

        # Calculer les embeddings
        print("   🧬 Calcul des embeddings...")
        try:
            embedding_ar = None
            embedding_fr = None

            if text_ar:
                embedding_ar = self.embedding_model.encode(text_ar[:5000]).tobytes()
                print("      ✅ Embedding AR calculé")

            if text_fr:
                embedding_fr = self.embedding_model.encode(text_fr[:5000]).tobytes()
                print("      ✅ Embedding FR calculé")

            # Mettre à jour la base de données
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()

            cursor.execute("""
                UPDATE supreme_court_decisions
                SET
                    embedding_ar = ?,
                    embedding_fr = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (embedding_ar, embedding_fr, dec_id))

            conn.commit()
            conn.close()

            print("   💾 Base de données mise à jour")
            self.stats['success'] += 1
            return True

        except Exception as e:
            print(f"   ❌ Erreur calcul embeddings: {e}")
            import traceback
            traceback.print_exc()
            self.stats['failed'] += 1
            return False

    def print_progress(self, current, total):
        """Afficher la progression"""
        elapsed = time.time() - self.start_time
        rate = current / elapsed if elapsed > 0 else 0
        remaining = (total - current) / rate if rate > 0 else 0

        print(f"\n{'='*70}")
        print(f"📊 PROGRESSION: {current}/{total} ({current/total*100:.1f}%)")
        print(f"   ⏱️  Temps écoulé:  {elapsed/60:.1f} minutes")
        print(f"   ⚡ Vitesse:       {rate*60:.1f} décisions/heure")
        print(f"   ⏳ Temps restant: {remaining/60:.1f} minutes (estimation)")
        print(f"   ✅ Succès:       {self.stats['success']}")
        print(f"   ⏭️  Ignorées:     {self.stats['skipped']}")
        print(f"   ❌ Échecs:       {self.stats['failed']}")
        print(f"{'='*70}")

    def print_final_stats(self):
        """Afficher les statistiques finales"""
        elapsed = time.time() - self.start_time

        print(f"\n\n{'='*70}")
        print(f"🎉 RECALCUL TERMINÉ")
        print(f"{'='*70}")
        print(f"📊 Statistiques:")
        print(f"   Total traité:    {self.stats['total']}")
        print(f"   ✅ Succès:        {self.stats['success']}")
        print(f"   ⏭️  Ignorées:      {self.stats['skipped']}")
        print(f"   ❌ Échecs:        {self.stats['failed']}")
        print(f"   ⏱️  Durée totale:  {elapsed/60:.1f} minutes")
        if self.stats['success'] > 0:
            print(f"   ⚡ Vitesse moy.:  {self.stats['success']/elapsed*60:.1f} décisions/heure")
        print(f"{'='*70}\n")


def main():
    """Point d'entrée principal"""

    print("""
╔════════════════════════════════════════════════════════════════════╗
║                                                                    ║
║        RECALCUL DES EMBEDDINGS COUR SUPRÊME                        ║
║                                                                    ║
║  Ce script recalcule les embeddings pour toutes les décisions:   ║
║    - embedding_ar : calculé depuis le texte arabe                 ║
║    - embedding_fr : calculé depuis le texte français              ║
║                                                                    ║
║  Les décisions déjà traitées sont ignorées.                       ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
    """)

    # Initialiser le recalculateur
    try:
        recalculator = EmbeddingRecalculator()
    except Exception as e:
        print(f"❌ Erreur initialisation: {e}")
        sys.exit(1)

    # Récupérer les décisions à traiter
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Décisions avec fichiers téléchargés
    cursor.execute("""
        SELECT
            id,
            decision_number,
            file_path_ar,
            file_path_fr,
            embedding_ar,
            embedding_fr
        FROM supreme_court_decisions
        WHERE (file_path_ar IS NOT NULL OR file_path_fr IS NOT NULL)
        ORDER BY id
    """)

    decisions = cursor.fetchall()
    conn.close()

    total = len(decisions)
    print(f"\n📋 {total} décisions à traiter\n")

    if total == 0:
        print("⚠️  Aucune décision à traiter")
        return

    # Compter celles qui nécessitent un recalcul
    to_process = sum(1 for d in decisions if not (d['embedding_ar'] and d['embedding_fr']))
    print(f"🔄 {to_process} décisions nécessitent un recalcul\n")

    # Traiter les décisions
    recalculator.stats['total'] = total

    for idx, decision in enumerate(decisions, 1):
        recalculator.calculate_embeddings(decision['id'], decision)

        # Afficher la progression tous les 50 documents
        if idx % 50 == 0 or idx == total:
            recalculator.print_progress(idx, total)

        # Petite pause pour ne pas surcharger le système
        if idx < total and idx % 10 == 0:
            time.sleep(0.5)

    # Afficher les statistiques finales
    recalculator.print_final_stats()


if __name__ == '__main__':
    main()
