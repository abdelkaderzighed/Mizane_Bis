BEGIN TRANSACTION;

CREATE TABLE documents_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    url TEXT NOT NULL,
    file_extension TEXT,
    file_path TEXT,
    text_path TEXT,
    metadata_collection_status TEXT DEFAULT 'pending' CHECK(metadata_collection_status IN ('pending', 'in_progress', 'success', 'failed', 'skipped')),
    download_status TEXT DEFAULT 'pending' CHECK(download_status IN ('pending', 'in_progress', 'success', 'failed', 'skipped')),
    text_extraction_status TEXT DEFAULT 'pending' CHECK(text_extraction_status IN ('pending', 'in_progress', 'success', 'failed', 'skipped')),
    ai_analysis_status TEXT DEFAULT 'pending' CHECK(ai_analysis_status IN ('pending', 'in_progress', 'success', 'failed', 'skipped')),
    embedding_status TEXT DEFAULT 'pending' CHECK(embedding_status IN ('pending', 'in_progress', 'success', 'failed', 'skipped')),
    error_log TEXT,
    metadata_collected_at DATETIME,
    downloaded_at DATETIME,
    text_extracted_at DATETIME,
    analyzed_at DATETIME,
    embedded_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    publication_date DATE,
    file_size_bytes INTEGER,
    extra_metadata TEXT,
    FOREIGN KEY (session_id) REFERENCES harvesting_sessions(id) ON DELETE CASCADE
);

INSERT INTO documents_new (
    id, session_id, url, file_extension, file_path, text_path,
    metadata_collection_status, download_status, text_extraction_status,
    ai_analysis_status, embedding_status, error_log,
    metadata_collected_at, downloaded_at, text_extracted_at,
    analyzed_at, embedded_at, created_at, updated_at,
    publication_date, file_size_bytes, extra_metadata
)
SELECT
    id, session_id, url, file_extension, file_path, text_path,
    COALESCE(metadata_collection_status, 'pending'),
    COALESCE(download_status, 'pending'),
    CASE
        WHEN text_path IS NOT NULL AND TRIM(text_path) != '' THEN 'success'
        ELSE 'pending'
    END,
    COALESCE(ai_analysis_status, 'pending'),
    'pending',
    error_log,
    metadata_collected_at, downloaded_at, NULL,
    analyzed_at, NULL, created_at, updated_at,
    publication_date, file_size_bytes, extra_metadata
FROM documents;

DROP TRIGGER IF EXISTS update_documents_timestamp;
DROP TABLE documents;
ALTER TABLE documents_new RENAME TO documents;

CREATE INDEX idx_documents_session ON documents(session_id);
CREATE INDEX idx_documents_url ON documents(url);
CREATE INDEX idx_documents_statuses ON documents(metadata_collection_status, download_status, text_extraction_status, ai_analysis_status, embedding_status);
CREATE UNIQUE INDEX idx_documents_session_url ON documents(session_id, url);

CREATE TRIGGER update_documents_timestamp
AFTER UPDATE ON documents
BEGIN
    UPDATE documents SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

COMMIT;
