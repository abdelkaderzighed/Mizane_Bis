import re

with open('CoursSupremeViewer.jsx', 'r') as f:
    lines = f.readlines()

print("Recherche du panneau de recherche dans le modal métadonnées...")

# Trouver le modal métadonnées
for i, line in enumerate(lines):
    if 'metadataModalOpen && selectedMetadata' in line:
        print(f"Modal métadonnées trouvé ligne {i+1}")
        
        # Chercher le panneau de recherche avancée après cette ligne
        for j in range(i, min(i+200, len(lines))):
            if 'setShowAdvancedSearch(!showAdvancedSearch)' in lines[j]:
                print(f"Panneau recherche trouvé ligne {j+1}")
                
                # Trouver la fin du panneau (le </div> fermant après "Rechercher avec filtres")
                end_line = j
                for k in range(j, min(j+50, len(lines))):
                    if 'Rechercher avec filtres' in lines[k]:
                        # Trouver les 3 </div> suivants pour fermer le panneau
                        div_count = 0
                        for m in range(k, min(k+10, len(lines))):
                            if '</div>' in lines[m]:
                                div_count += 1
                                if div_count == 2:  # Le 2ème </div> ferme le panneau
                                    end_line = m
                                    break
                        break
                
                print(f"Suppression lignes {j+1} à {end_line+1}...")
                del lines[j:end_line+1]
                print(f"✅ {end_line-j+1} lignes supprimées")
                break
        break

with open('CoursSupremeViewer.jsx', 'w') as f:
    f.writelines(lines)

print("✅ Panneau de recherche avancée supprimé du modal")
