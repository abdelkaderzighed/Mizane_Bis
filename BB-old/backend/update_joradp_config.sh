#!/bin/bash

API_FILE="$HOME/doc_harvester/backend/api.py"

echo "🔄 Mise à jour de la configuration JORADP"

# Créer le nouveau bloc de code
cat > /tmp/joradp_new_code.py << 'ENDOFCODE'
        if harvester_type == 'joradp':
            # Nouveau mapping des champs
            # collection_name contient l'année pour JORADP
            year_value = params.get('collection_name') or params.get('year') or str(datetime.now().year)
            year = int(year_value) if str(year_value).isdigit() else datetime.now().year
            
            # Nouveaux noms de champs
            start = int(params.get('start_number') or params.get('start') or 1)
            end = int(params.get('end_number') or params.get('end') or 100)
            
            # max_results peut être vide (= tout)
            max_results_value = params.get('max_results')
            max_results = int(max_results_value) if max_results_value else None
            
            config = {
                'workers': int(params.get('workers', 2)),
                'timeout': int(params.get('timeout', 60)),
                'retry_count': int(params.get('retry_count', 3)),
                'delay_between': float(params.get('delay_between', 0.5))
            }
            
            print(f"🔍 JORADP Config: year={year}, start={start}, end={end}, max_results={max_results}")
            
            harvester = JORADPHarvester(
                base_url="https://www.joradp.dz/HFR/Index.htm",
                year=year,
                config=config
            )
            documents = harvester.harvest(max_results=max_results, start=start, end=end)
ENDOFCODE

# Remplacer les lignes 807-824
head -n 806 "$API_FILE" > /tmp/api_new.py
cat /tmp/joradp_new_code.py >> /tmp/api_new.py
tail -n +825 "$API_FILE" >> /tmp/api_new.py

# Remplacer le fichier
mv /tmp/api_new.py "$API_FILE"

echo "✅ Configuration JORADP mise à jour"
echo "📋 Vérification (lignes 807-830) :"
sed -n '807,830p' "$API_FILE"

