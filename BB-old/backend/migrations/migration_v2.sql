-- 1. Créer nouvelle table décisions (SANS chamber_id/theme_id)
CREATE TABLE supreme_court_decisions_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    decision_number TEXT UNIQUE NOT NULL,
    decision_date TEXT,
    url TEXT UNIQUE NOT NULL,
    object_ar TEXT,
    object_fr TEXT,
    download_status TEXT DEFAULT 'pending',
    analyzed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Copier décisions UNIQUES
INSERT INTO supreme_court_decisions_new (decision_number, decision_date, url, object_ar, object_fr, download_status, analyzed_at, created_at)
SELECT DISTINCT decision_number, decision_date, url, object_ar, object_fr, download_status, analyzed_at, created_at
FROM supreme_court_decisions;

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
SELECT 
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
CREATE INDEX idx_classifications_decision ON supreme_court_decision_classifications(decision_id);
CREATE INDEX idx_classifications_chamber ON supreme_court_decision_classifications(chamber_id);
CREATE INDEX idx_classifications_theme ON supreme_court_decision_classifications(theme_id);
