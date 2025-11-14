#!/bin/bash
echo "=== MOISSONNAGE + TRADUCTION AUTO ==="
echo ""

echo "Etape 1: Moissonnage des URLs..."
python3 harvesters/harvester_coursupreme_v5_final.py

echo ""
echo "Etape 2: Telechargement et traduction des nouvelles decisions..."
python3 post_process_new_decisions.py

echo ""
echo "=== TERMINE ==="
