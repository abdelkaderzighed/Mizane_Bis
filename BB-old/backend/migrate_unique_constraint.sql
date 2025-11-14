-- Supprimer l'ancienne contrainte
DROP INDEX IF EXISTS idx_documents_session_url;

-- Nouvelle contrainte : URL unique par collection (pas par session)
-- On utilise subdirectory_name qui devient conceptuellement collection_name
CREATE UNIQUE INDEX idx_documents_collection_url 
ON documents(
    (SELECT subdirectory_name FROM harvesting_sessions WHERE id = session_id),
    url
);

-- Note: SQLite ne permet pas de foreign key dans l'index
-- Solution alternative : Ajouter collection_name directement dans documents

-- Ou garder simple et vérifier en code Python
