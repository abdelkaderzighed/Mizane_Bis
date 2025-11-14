-- Migration Many-to-Many - Version corrigée

-- 1. Créer nouvelle table décisions (toutes les colonnes SAUF chamber_id/theme_id/session_id)
CREATE TABLE supreme_court_decisions_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    decision_number TEXT UNIQUE NOT NULL,
    decision_date DATE,
    object_ar TEXT,
    object_fr TEXT,
    parties_ar TEXT,
    parties_fr TEXT,
    legal_reference_ar TEXT,
    legal_reference_fr TEXT,
    arguments_ar TEXT,
    arguments_fr TEXT,
    court_response_ar TEXT,
    court_response_fr TEXT,
    president TEXT,
    rapporteur TEXT,
    html_content_ar TEXT,
    html_content_fr TEXT,
    url TEXT UNIQUE NOT NULL,
    download_status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Copier décisions UNIQUES (sur decision_number)
INSERT INTO supreme_court_decisions_new 
SELECT DISTINCT 
    MIN(id) as id,
    decision_number,
    decision_date,
    object_ar,
    object_fr,
    parties_ar,
    parties_fr,
    legal_reference_ar,
    legal_reference_fr,
    arguments_ar,
    arguments_fr,
    court_response_ar,
    court_response_fr,
    president,
    rapporteur,
    html_content_ar,
    html_content_fr,
    url,
    download_status,
    created_at,
    updated_at
FROM supreme_court_decisions
GROUP BY decision_number;

-- 3. Créer table de liaison
CREATE TABLE supreme_court_decision_classifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    decision_id INTEGER NOT NULL,
    chamber_id INTEGER NOT NULL,
    theme_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (decision_id) REFERENCES supreme_court_decisions(id),
    FOREIGN KEY (chamber_id) REFERENCES supreme_court_chambers(id),
    FOREIGN KEY (theme_id) REFERENCES supreme_court_themes(id),
    UNIQUE(decision_id, chamber_id, theme_id)
);

-- 4. Remplir classifications
INSERT INTO supreme_court_decision_classifications (decision_id, chamber_id, theme_id)
SELECT DISTINCT
    new.id,
    old.chamber_id,
    old.theme_id
FROM supreme_court_decisions old
JOIN supreme_court_decisions_new new ON new.decision_number = old.decision_number
WHERE old.chamber_id IS NOT NULL AND old.theme_id IS NOT NULL;

-- 5. Remplacer
DROP TABLE supreme_court_decisions;
ALTER TABLE supreme_court_decisions_new RENAME TO supreme_court_decisions;

-- 6. Index
CREATE INDEX idx_sc_decisions_date ON supreme_court_decisions(decision_date);
CREATE INDEX idx_sc_decisions_status ON supreme_court_decisions(download_status);
CREATE INDEX idx_classifications_decision ON supreme_court_decision_classifications(decision_id);
CREATE INDEX idx_classifications_chamber ON supreme_court_decision_classifications(chamber_id);
CREATE INDEX idx_classifications_theme ON supreme_court_decision_classifications(theme_id);
