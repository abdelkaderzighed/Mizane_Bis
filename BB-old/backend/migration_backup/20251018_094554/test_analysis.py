#!/usr/bin/env python3
"""Script de test pour le module d'analyse"""

from analysis import get_analysis_stats, process_documents_batch
import os
import sys

def main():
    # Vérifier la clé API
    api_key = os.getenv('ANTHROPIC_API_KEY')
    if not api_key:
        print("❌ Variable ANTHROPIC_API_KEY non définie")
        print("\nPour la définir :")
        print("  export ANTHROPIC_API_KEY='votre_clé_api_claude'")
        sys.exit(1)
    
    print("="*60)
    print("📊 STATISTIQUES DES ANALYSES")
    print("="*60)
    
    # Récupérer les stats
    stats = get_analysis_stats()
    
    print(f"\n📦 Documents téléchargés : {stats['total_downloaded']}")
    print(f"✅ Documents analysés    : {stats['total_analyzed']}")
    print(f"⏳ En attente d'analyse  : {stats['total_pending']}")
    print(f"❌ Erreurs d'analyse     : {stats['total_errors']}")
    print(f"📈 Taux de complétion    : {stats['completion_rate']:.1f}%")
    
    # Proposer d'analyser si des docs en attente
    if stats['total_pending'] > 0:
        print("\n" + "="*60)
        print(f"💡 {stats['total_pending']} document(s) en attente d'analyse")
        print("="*60)
        
        response = input("\n🚀 Lancer l'analyse maintenant ? (o/n) : ").strip().lower()
        
        if response in ['o', 'oui', 'y', 'yes']:
            print("\n🔄 Démarrage de l'analyse...\n")
            result = process_documents_batch(api_key)
            
            print("\n" + "="*60)
            print("📊 RÉSULTATS DE L'ANALYSE")
            print("="*60)
            print(f"✅ Réussies : {result['successful']}")
            print(f"❌ Échouées : {result['failed']}")
            print(f"🎯 Tokens   : {result['total_tokens']:,}")
            print(f"💰 Coût est.: ${result['estimated_cost']:.2f}")
        else:
            print("\n⏸️  Analyse annulée")
    else:
        print("\n✅ Tous les documents téléchargés sont analysés !")
    
    print("\n" + "="*60)

if __name__ == '__main__':
    main()
