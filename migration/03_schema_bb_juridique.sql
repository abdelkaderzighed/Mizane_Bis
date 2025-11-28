-- =====================================================
-- SCHÉMA BB - BIBLIOTHÈQUE JURIDIQUE (MizaneDb)
-- Architecture hybride : PostgreSQL (métadonnées) + R2 (données volumineuses)
-- =====================================================

-- =====================================================
-- TABLES GÉNÉRIQUES (multi-corpus)
-- =====================================================

CREATE TABLE IF NOT EXISTS sites (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    url TEXT NOT NULL UNIQUE,
    site_type TEXT NOT NULL CHECK(site_type IN ('Generic', 'Pattern-based', 'Javascript')),
    workers_parallel INTEGER NOT NULL DEFAULT 4,
    timeout_seconds INTEGER NOT NULL DEFAULT 30,
    delay_between_requests REAL NOT NULL DEFAULT 1.0,
    delay_before_retry REAL NOT NULL DEFAULT 5.0,
    type_specific_params JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sites_type ON sites(site_type);
CREATE INDEX IF NOT EXISTS idx_sites_name ON sites(name);

-- =====================================================

CREATE TABLE IF NOT EXISTS harvesting_sessions (
    id SERIAL PRIMARY KEY,
    site_id INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    session_name TEXT NOT NULL,
    is_test BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'running', 'paused', 'completed', 'cancelled')),
    current_phase TEXT CHECK(current_phase IN ('metadata_collection', 'file_download', 'ai_analysis', NULL)),
    max_documents INTEGER,
    start_number INTEGER,
    end_number INTEGER,
    schedule_config JSONB,
    filter_date_start DATE,
    filter_date_end DATE,
    filter_keywords TEXT,
    filter_languages TEXT,
    filter_file_types TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    paused_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    UNIQUE(site_id, session_name)
);

CREATE INDEX IF NOT EXISTS idx_sessions_site ON harvesting_sessions(site_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON harvesting_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_is_test ON harvesting_sessions(is_test);

-- =====================================================

CREATE TABLE IF NOT EXISTS session_statistics (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL UNIQUE REFERENCES harvesting_sessions(id) ON DELETE CASCADE,
    total_documents_found INTEGER DEFAULT 0,
    metadata_collected_count INTEGER DEFAULT 0,
    metadata_failed_count INTEGER DEFAULT 0,
    files_downloaded_count INTEGER DEFAULT 0,
    files_failed_count INTEGER DEFAULT 0,
    ai_analyzed_count INTEGER DEFAULT 0,
    ai_failed_count INTEGER DEFAULT 0,
    current_document_index INTEGER DEFAULT 0,
    last_error_message TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_statistics_session ON session_statistics(session_id);

-- =====================================================

CREATE TABLE IF NOT EXISTS site_archive (
    id SERIAL PRIMARY KEY,
    site_id INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    corpus_type TEXT NOT NULL DEFAULT 'joradp' CHECK(corpus_type IN ('joradp', 'supreme_court')),
    identifier TEXT NOT NULL,
    year INTEGER,
    number INTEGER,
    language TEXT,
    url TEXT NOT NULL,
    filename TEXT,
    status TEXT NOT NULL DEFAULT 'checking',
    local_path TEXT,
    file_path_r2 TEXT,
    file_size INTEGER,
    scan_attempts INTEGER NOT NULL DEFAULT 0,
    download_attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    metadata JSONB,
    first_checked TIMESTAMPTZ,
    last_checked TIMESTAMPTZ,
    downloaded_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(site_id, identifier)
);

CREATE INDEX IF NOT EXISTS idx_archive_site ON site_archive(site_id);
CREATE INDEX IF NOT EXISTS idx_archive_corpus ON site_archive(corpus_type);
CREATE INDEX IF NOT EXISTS idx_archive_status ON site_archive(status);
CREATE INDEX IF NOT EXISTS idx_archive_year ON site_archive(year);

-- =====================================================

CREATE TABLE IF NOT EXISTS site_archive_scans (
    id SERIAL PRIMARY KEY,
    site_id INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    scan_type TEXT NOT NULL,
    parameters JSONB,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'running',
    total_checked INTEGER NOT NULL DEFAULT 0,
    found_available INTEGER NOT NULL DEFAULT 0,
    found_errors INTEGER NOT NULL DEFAULT 0,
    log_details TEXT
);

CREATE INDEX IF NOT EXISTS idx_scans_site ON site_archive_scans(site_id);
CREATE INDEX IF NOT EXISTS idx_scans_status ON site_archive_scans(status);

-- =====================================================
-- TABLES JORADP (métadonnées légères + URLs R2)
-- =====================================================

CREATE TABLE IF NOT EXISTS joradp_documents (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES harvesting_sessions(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    file_extension TEXT,
    
    -- URLs R2 pour fichiers
    file_path_r2 TEXT,
    text_path_r2 TEXT,
    ai_analysis_r2 TEXT,
    embeddings_r2 TEXT,
    
    -- Statuts de traitement
    metadata_collection_status TEXT DEFAULT 'pending' CHECK(metadata_collection_status IN ('pending', 'in_progress', 'success', 'failed', 'skipped')),
    download_status TEXT DEFAULT 'pending' CHECK(download_status IN ('pending', 'in_progress', 'success', 'failed', 'skipped')),
    text_extraction_status TEXT DEFAULT 'pending' CHECK(text_extraction_status IN ('pending', 'in_progress', 'success', 'failed', 'skipped')),
    ai_analysis_status TEXT DEFAULT 'pending' CHECK(ai_analysis_status IN ('pending', 'in_progress', 'success', 'failed', 'skipped')),
    embedding_status TEXT DEFAULT 'pending' CHECK(embedding_status IN ('pending', 'in_progress', 'success', 'failed', 'skipped')),
    
    error_log TEXT,
    
    -- Timestamps
    metadata_collected_at TIMESTAMPTZ,
    downloaded_at TIMESTAMPTZ,
    text_extracted_at TIMESTAMPTZ,
    analyzed_at TIMESTAMPTZ,
    embedded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Métadonnées de base
    publication_date DATE,
    file_size_bytes BIGINT,
    
    UNIQUE(session_id, url)
);

CREATE INDEX IF NOT EXISTS idx_joradp_docs_session ON joradp_documents(session_id);
CREATE INDEX IF NOT EXISTS idx_joradp_docs_url ON joradp_documents(url);
CREATE INDEX IF NOT EXISTS idx_joradp_docs_date ON joradp_documents(publication_date);
CREATE INDEX IF NOT EXISTS idx_joradp_docs_statuses ON joradp_documents(
    metadata_collection_status, 
    download_status, 
    text_extraction_status, 
    ai_analysis_status, 
    embedding_status
);

-- =====================================================

CREATE TABLE IF NOT EXISTS joradp_metadata (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL UNIQUE REFERENCES joradp_documents(id) ON DELETE CASCADE,
    title TEXT,
    author TEXT,
    publication_date DATE,
    language TEXT,
    file_size BIGINT,
    page_count INTEGER DEFAULT 0,
    description TEXT,
    source_metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_joradp_metadata_doc ON joradp_metadata(document_id);
CREATE INDEX IF NOT EXISTS idx_joradp_metadata_date ON joradp_metadata(publication_date);
CREATE INDEX IF NOT EXISTS idx_joradp_metadata_lang ON joradp_metadata(language);

-- =====================================================

CREATE TABLE IF NOT EXISTS joradp_keyword_index (
    id SERIAL PRIMARY KEY,
    token TEXT NOT NULL,
    document_id INTEGER NOT NULL REFERENCES joradp_documents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_joradp_keyword_token ON joradp_keyword_index(token);
CREATE INDEX IF NOT EXISTS idx_joradp_keyword_doc ON joradp_keyword_index(document_id);

-- =====================================================
-- TABLES COUR SUPRÊME (métadonnées légères + URLs R2)
-- =====================================================

CREATE TABLE IF NOT EXISTS supreme_court_chambers (
    id SERIAL PRIMARY KEY,
    name_ar TEXT NOT NULL,
    name_fr TEXT NOT NULL,
    url TEXT UNIQUE NOT NULL,
    active BOOLEAN DEFAULT true,
    last_harvested_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================

CREATE TABLE IF NOT EXISTS supreme_court_themes (
    id SERIAL PRIMARY KEY,
    chamber_id INTEGER NOT NULL REFERENCES supreme_court_chambers(id) ON DELETE CASCADE,
    name_ar TEXT NOT NULL,
    name_fr TEXT,
    url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(chamber_id, name_ar)
);

CREATE INDEX IF NOT EXISTS idx_sc_themes_chamber ON supreme_court_themes(chamber_id);

-- =====================================================

CREATE TABLE IF NOT EXISTS supreme_court_decisions (
    id SERIAL PRIMARY KEY,
    decision_number TEXT UNIQUE NOT NULL,
    decision_date DATE,
    
    -- Métadonnées légères (titres courts)
    title_ar TEXT,
    title_fr TEXT,
    object_ar TEXT,
    object_fr TEXT,
    parties_ar TEXT,
    parties_fr TEXT,
    legal_reference_ar TEXT,
    legal_reference_fr TEXT,
    president TEXT,
    rapporteur TEXT,
    
    -- URLs R2 pour données volumineuses
    html_content_ar_r2 TEXT,
    html_content_fr_r2 TEXT,
    arguments_r2 TEXT,
    analysis_ar_r2 TEXT,
    analysis_fr_r2 TEXT,
    embeddings_ar_r2 TEXT,
    embeddings_fr_r2 TEXT,
    file_path_ar_r2 TEXT,
    file_path_fr_r2 TEXT,
    
    url TEXT UNIQUE NOT NULL,
    download_status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sc_decisions_number ON supreme_court_decisions(decision_number);
CREATE INDEX IF NOT EXISTS idx_sc_decisions_date ON supreme_court_decisions(decision_date);
CREATE INDEX IF NOT EXISTS idx_sc_decisions_status ON supreme_court_decisions(download_status);

-- =====================================================

CREATE TABLE IF NOT EXISTS supreme_court_decision_classifications (
    id SERIAL PRIMARY KEY,
    decision_id INTEGER NOT NULL REFERENCES supreme_court_decisions(id) ON DELETE CASCADE,
    chamber_id INTEGER NOT NULL REFERENCES supreme_court_chambers(id) ON DELETE CASCADE,
    theme_id INTEGER NOT NULL REFERENCES supreme_court_themes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(decision_id, chamber_id, theme_id)
);

CREATE INDEX IF NOT EXISTS idx_sc_classif_decision ON supreme_court_decision_classifications(decision_id);
CREATE INDEX IF NOT EXISTS idx_sc_classif_chamber ON supreme_court_decision_classifications(chamber_id);
CREATE INDEX IF NOT EXISTS idx_sc_classif_theme ON supreme_court_decision_classifications(theme_id);

-- =====================================================

CREATE TABLE IF NOT EXISTS french_keyword_index (
    id SERIAL PRIMARY KEY,
    token TEXT NOT NULL,
    decision_id INTEGER NOT NULL REFERENCES supreme_court_decisions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_french_keyword_token ON french_keyword_index(token);
CREATE INDEX IF NOT EXISTS idx_french_keyword_decision ON french_keyword_index(decision_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- BB : read/write sur toutes les tables
-- AA : read-only sur toutes les tables
-- =====================================================

-- Activer RLS sur toutes les tables
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE harvesting_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_archive_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE joradp_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE joradp_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE joradp_keyword_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE supreme_court_chambers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supreme_court_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE supreme_court_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE supreme_court_decision_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE french_keyword_index ENABLE ROW LEVEL SECURITY;

-- Policy : Service role a tous les droits (utilisé par BB)
CREATE POLICY "Service role full access" ON sites FOR ALL USING (true);
CREATE POLICY "Service role full access" ON harvesting_sessions FOR ALL USING (true);
CREATE POLICY "Service role full access" ON session_statistics FOR ALL USING (true);
CREATE POLICY "Service role full access" ON site_archive FOR ALL USING (true);
CREATE POLICY "Service role full access" ON site_archive_scans FOR ALL USING (true);
CREATE POLICY "Service role full access" ON joradp_documents FOR ALL USING (true);
CREATE POLICY "Service role full access" ON joradp_metadata FOR ALL USING (true);
CREATE POLICY "Service role full access" ON joradp_keyword_index FOR ALL USING (true);
CREATE POLICY "Service role full access" ON supreme_court_chambers FOR ALL USING (true);
CREATE POLICY "Service role full access" ON supreme_court_themes FOR ALL USING (true);
CREATE POLICY "Service role full access" ON supreme_court_decisions FOR ALL USING (true);
CREATE POLICY "Service role full access" ON supreme_court_decision_classifications FOR ALL USING (true);
CREATE POLICY "Service role full access" ON french_keyword_index FOR ALL USING (true);

-- Policy : Utilisateurs authentifiés ont lecture seule (utilisé par AA)
CREATE POLICY "Authenticated read only" ON sites FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read only" ON harvesting_sessions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read only" ON session_statistics FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read only" ON site_archive FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read only" ON site_archive_scans FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read only" ON joradp_documents FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read only" ON joradp_metadata FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read only" ON joradp_keyword_index FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read only" ON supreme_court_chambers FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read only" ON supreme_court_themes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read only" ON supreme_court_decisions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read only" ON supreme_court_decision_classifications FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read only" ON french_keyword_index FOR SELECT USING (auth.role() = 'authenticated');

-- Policy : Lecture publique pour certaines tables (si nécessaire pour AA non-authentifié)
CREATE POLICY "Public read access" ON sites FOR SELECT USING (true);
CREATE POLICY "Public read access" ON supreme_court_chambers FOR SELECT USING (true);
CREATE POLICY "Public read access" ON supreme_court_themes FOR SELECT USING (true);
CREATE POLICY "Public read access" ON supreme_court_decisions FOR SELECT USING (true);
CREATE POLICY "Public read access" ON supreme_court_decision_classifications FOR SELECT USING (true);
CREATE POLICY "Public read access" ON joradp_documents FOR SELECT USING (true);
CREATE POLICY "Public read access" ON joradp_metadata FOR SELECT USING (true);

