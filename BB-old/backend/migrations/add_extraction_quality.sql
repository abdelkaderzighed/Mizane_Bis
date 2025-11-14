-- Migration: Ajout des colonnes de qualité d'extraction
-- Date: 2025-11-02

-- Ajouter les colonnes pour évaluer la qualité d'extraction dans document_ai_analysis
ALTER TABLE document_ai_analysis ADD COLUMN extraction_quality TEXT DEFAULT 'unknown';
ALTER TABLE document_ai_analysis ADD COLUMN extraction_method TEXT DEFAULT 'pypdf2';
ALTER TABLE document_ai_analysis ADD COLUMN char_count INTEGER DEFAULT 0;
ALTER TABLE document_ai_analysis ADD COLUMN extraction_confidence REAL DEFAULT 0.0;

-- Mettre à jour char_count pour les analyses existantes
UPDATE document_ai_analysis
SET char_count = extracted_text_length
WHERE extracted_text_length IS NOT NULL;

-- Calculer char_count et qualité pour les fichiers texte existants
-- (sera exécuté via script Python pour lire les fichiers)
