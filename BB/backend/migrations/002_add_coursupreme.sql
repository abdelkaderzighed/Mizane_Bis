-- Migration V2 : Ajout tables Cour Suprême
-- Date: 2025-10-25
-- Safe: N'affecte pas les tables V1 (JORADP)

-- Table des chambres de la Cour Suprême
CREATE TABLE IF NOT EXISTS supreme_court_chambers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name_ar TEXT NOT NULL,
    name_fr TEXT NOT NULL,
    url TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des thèmes par chambre
CREATE TABLE IF NOT EXISTS supreme_court_themes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chamber_id INTEGER NOT NULL,
    name_ar TEXT NOT NULL,
    name_fr TEXT,
    url TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chamber_id) REFERENCES supreme_court_chambers(id)
);

-- Table des décisions
CREATE TABLE IF NOT EXISTS supreme_court_decisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER,
    chamber_id INTEGER NOT NULL,
    theme_id INTEGER,
    decision_number TEXT NOT NULL,
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id),
    FOREIGN KEY (chamber_id) REFERENCES supreme_court_chambers(id),
    FOREIGN KEY (theme_id) REFERENCES supreme_court_themes(id)
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_sc_decisions_chamber ON supreme_court_decisions(chamber_id);
CREATE INDEX IF NOT EXISTS idx_sc_decisions_theme ON supreme_court_decisions(theme_id);
CREATE INDEX IF NOT EXISTS idx_sc_decisions_date ON supreme_court_decisions(decision_date);
CREATE INDEX IF NOT EXISTS idx_sc_decisions_status ON supreme_court_decisions(download_status);

-- Insérer les 6 chambres principales
INSERT OR IGNORE INTO supreme_court_chambers (id, name_ar, name_fr, url) VALUES
(1, 'الغرف المدنية', 'Chambres civiles', 'https://coursupreme.dz/الغرف-المدنية/'),
(2, 'الغرف الجزائية', 'Chambres pénales', 'https://coursupreme.dz/الغرف-الجزائية/'),
(3, 'الغرف التجارية', 'Chambres commerciales', 'https://coursupreme.dz/الغرف-التجارية/'),
(4, 'لجنة التعويض', 'Comité de rémunération', 'https://coursupreme.dz/لجنة-التعويض/'),
(5, 'الغرف المجتمعة', 'Salles communautaires', 'https://coursupreme.dz/الغرف-المجتمعة/'),
(6, 'استثناء عدم الدستورية', 'Exception d inconstitutionnalité', 'https://coursupreme.dz/استثناء-عدم-الدستورية/');
