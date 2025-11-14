-- Migration vers structure Many-to-Many
-- Date: 2025-10-26

-- 1. Créer nouvelle table de décisions (sans chamber_id/theme_id)
CREATE TABLE supreme_court_decisions_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    decision_number TEXT UNIQUE NOT NULL,
    decision_date TEXT,
    url TEXT UNIQUE NOT NULL,
    object_ar TEXT,
    object_fr TEXT,
    download_status TEXT DEFAULT 'pending',
    local_html_path TEXT,
    analyzed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Créer table de liaison
CREATE TABLE supreme_court_decision_classifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    decision_id INTEGER NOT NULL,
    chamber_id INTEGER NOT NULL,
    theme_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (decision_id) REFERENCES supreme_court_decisions(id) ON DELETE CASCADE,
    FOREIGN KEY (chamber_id) REFERENCES supreme_court_chambers(id) ON DELETE CASCADE,
    FOREIGN KEY (theme_id) REFERENCES supreme_court_themes(id) ON DELETE CASCADE,
    UNIQUE(decision_id, chamber_id, theme_id)
);

-- 3. Migrer les décisions existantes
INSERT INTO supreme_court_decisions_new 
    (id, decision_number, decision_date, url, object_ar, object_fr, download_status, local_html_path, analyzed_at, created_at)
SELECT DISTINCT
    id, decision_number, decision_date, url, object_ar, object_fr, download_status, local_html_path, analyzed_at, created_at
FROM supreme_court_decisions;

-- 4. Migrer les classifications (relations)
INSERT INTO supreme_court_decision_classifications (decision_id, chamber_id, theme_id)
SELECT DISTINCT id, chamber_id, theme_id
FROM supreme_court_decisions
WHERE chamber_id IS NOT NULL AND theme_id IS NOT NULL;

-- 5. Remplacer l'ancienne table
DROP TABLE supreme_court_decisions;
ALTER TABLE supreme_court_decisions_new RENAME TO supreme_court_decisions;

-- 6. Index pour performance
CREATE INDEX idx_classifications_decision ON supreme_court_decision_classifications(decision_id);
CREATE INDEX idx_classifications_chamber ON supreme_court_decision_classifications(chamber_id);
CREATE INDEX idx_classifications_theme ON supreme_court_decision_classifications(theme_id);

SELECT 'Migration terminée' as status;
