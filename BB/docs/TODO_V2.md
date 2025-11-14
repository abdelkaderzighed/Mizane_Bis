# TODO V2 - Cour Suprême

## ✅ FAIT
- [x] Tables BDD (chambers, themes, decisions)
- [x] Harvester avec découverte auto
- [x] POC validé (moissonnage fonctionne)
- [x] Site ajouté et visible dans l'interface

## 🔨 À FAIRE

### Phase 1 : Backend API (2-3 jours)
- [ ] Endpoint `/api/sites/2/chambers` - Liste des chambres
- [ ] Endpoint `/api/chambers/:id/decisions` - Décisions par chambre
- [ ] Intégrer harvester dans le workflow existant
- [ ] Job automatique de moissonnage

### Phase 2 : Amélioration extraction (1-2 jours)
- [ ] Améliorer regex pour extraction numéro (arabe)
- [ ] Améliorer parsing date (formats arabes)
- [ ] Extraire toutes les métadonnées structurées

### Phase 3 : Interface (2-3 jours)
- [ ] Onglet "Cour Suprême" dans le frontend
- [ ] Vue hiérarchique : Chambres > Décisions
- [ ] Recherche et filtres
- [ ] Téléchargement HTML/PDF des décisions

### Phase 4 : Traduction (optionnel)
- [ ] Intégration Google Translate API
- [ ] Traduction automatique AR → FR
- [ ] Stockage versions bilingues

## 📊 ESTIMATION TOTALE
- **Minimum viable** : 5-7 jours
- **Version complète** : 10-12 jours

## 🎯 PROCHAINE SESSION
1. Créer endpoints API pour Cour Suprême
2. Tester avec Postman/curl
3. Connecter au frontend
