#!/bin/bash
echo "🚀 Migration automatique Harvester v2..."
BACKUP="harvester.db.backup_$(date +%Y%m%d_%H%M%S)"
[ -f harvester.db ] && cp harvester.db "$BACKUP" && echo "✅ Sauvegarde: $BACKUP"
cat > migration_v2.sql << 'EOF'
DROP TABLE IF EXISTS document_embeddings;
DROP TABLE IF EXISTS document_ai_analysis;
DROP TABLE IF EXISTS document_metadata;
DROP TABLE IF EXISTS documents;
DROP TABLE IF EXISTS session_statistics;
DROP TABLE IF EXISTS harvesting_sessions;
DROP TABLE IF EXISTS sites;
DROP TABLE IF EXISTS settings;
CREATE TABLE sites (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, url TEXT NOT NULL UNIQUE, site_type TEXT NOT NULL CHECK(site_type IN ('Generic', 'Pattern-based', 'Javascript')), workers_parallel INTEGER NOT NULL DEFAULT 4, timeout_seconds INTEGER NOT NULL DEFAULT 30, delay_between_requests REAL NOT NULL DEFAULT 1.0, delay_before_retry REAL NOT NULL DEFAULT 5.0, type_specific_params TEXT, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX idx_sites_type ON sites(site_type);
CREATE INDEX idx_sites_name ON sites(name);
CREATE TABLE harvesting_sessions (id INTEGER PRIMARY KEY AUTOINCREMENT, site_id INTEGER NOT NULL, subdirectory_name TEXT NOT NULL, is_test BOOLEAN NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'running', 'paused', 'completed', 'cancelled')), current_phase TEXT CHECK(current_phase IN ('metadata_collection', 'file_download', 'ai_analysis', NULL)), max_documents INTEGER, start_number INTEGER, end_number INTEGER, schedule_config TEXT, filter_date_start DATE, filter_date_end DATE, filter_keywords TEXT, filter_languages TEXT, filter_file_types TEXT, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, started_at DATETIME, paused_at DATETIME, completed_at DATETIME, FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE);
CREATE INDEX idx_sessions_site ON harvesting_sessions(site_id);
CREATE INDEX idx_sessions_status ON harvesting_sessions(status);
CREATE INDEX idx_sessions_is_test ON harvesting_sessions(is_test);
CREATE UNIQUE INDEX idx_sessions_site_subdir ON harvesting_sessions(site_id, subdirectory_name);
CREATE TABLE documents (id INTEGER PRIMARY KEY AUTOINCREMENT, session_id INTEGER NOT NULL, url TEXT NOT NULL, file_extension TEXT, file_path TEXT, text_path TEXT, metadata_collection_status TEXT DEFAULT 'pending' CHECK(metadata_collection_status IN ('pending', 'in_progress', 'success', 'failed', 'skipped')), download_status TEXT DEFAULT 'pending' CHECK(download_status IN ('pending', 'in_progress', 'success', 'failed', 'skipped')), text_extraction_status TEXT DEFAULT 'pending' CHECK(text_extraction_status IN ('pending', 'in_progress', 'success', 'failed', 'skipped')), ai_analysis_status TEXT DEFAULT 'pending' CHECK(ai_analysis_status IN ('pending', 'in_progress', 'success', 'failed', 'skipped')), embedding_status TEXT DEFAULT 'pending' CHECK(embedding_status IN ('pending', 'in_progress', 'success', 'failed', 'skipped')), error_log TEXT, metadata_collected_at DATETIME, downloaded_at DATETIME, text_extracted_at DATETIME, analyzed_at DATETIME, embedded_at DATETIME, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, publication_date DATE, file_size_bytes INTEGER, extra_metadata TEXT, FOREIGN KEY (session_id) REFERENCES harvesting_sessions(id) ON DELETE CASCADE);
CREATE INDEX idx_documents_session ON documents(session_id);
CREATE INDEX idx_documents_url ON documents(url);
CREATE INDEX idx_documents_statuses ON documents(metadata_collection_status, download_status, text_extraction_status, ai_analysis_status, embedding_status);
CREATE UNIQUE INDEX idx_documents_session_url ON documents(session_id, url);
CREATE TABLE document_metadata (id INTEGER PRIMARY KEY AUTOINCREMENT, document_id INTEGER NOT NULL UNIQUE, title TEXT, author TEXT, publication_date DATE, language TEXT, file_size INTEGER, description TEXT, source_metadata TEXT, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE);
CREATE INDEX idx_metadata_document ON document_metadata(document_id);
CREATE INDEX idx_metadata_date ON document_metadata(publication_date);
CREATE INDEX idx_metadata_language ON document_metadata(language);
CREATE TABLE document_ai_analysis (id INTEGER PRIMARY KEY AUTOINCREMENT, document_id INTEGER NOT NULL UNIQUE, extracted_text_length INTEGER, summary TEXT, keywords TEXT, named_entities TEXT, additional_metadata TEXT, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE);
CREATE INDEX idx_ai_analysis_document ON document_ai_analysis(document_id);
CREATE TABLE document_embeddings (id INTEGER PRIMARY KEY AUTOINCREMENT, document_id INTEGER NOT NULL UNIQUE, embedding BLOB NOT NULL, model_name TEXT NOT NULL, dimension INTEGER NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE);
CREATE INDEX idx_embeddings_document ON document_embeddings(document_id);
CREATE INDEX idx_embeddings_model ON document_embeddings(model_name);
CREATE TABLE session_statistics (id INTEGER PRIMARY KEY AUTOINCREMENT, session_id INTEGER NOT NULL UNIQUE, total_documents_found INTEGER DEFAULT 0, metadata_collected_count INTEGER DEFAULT 0, metadata_failed_count INTEGER DEFAULT 0, files_downloaded_count INTEGER DEFAULT 0, files_failed_count INTEGER DEFAULT 0, ai_analyzed_count INTEGER DEFAULT 0, ai_failed_count INTEGER DEFAULT 0, current_document_index INTEGER DEFAULT 0, last_error_message TEXT, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (session_id) REFERENCES harvesting_sessions(id) ON DELETE CASCADE);
CREATE INDEX idx_statistics_session ON session_statistics(session_id);
CREATE TRIGGER update_sites_timestamp AFTER UPDATE ON sites BEGIN UPDATE sites SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; END;
CREATE TRIGGER update_sessions_timestamp AFTER UPDATE ON harvesting_sessions BEGIN UPDATE harvesting_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; END;
CREATE TRIGGER update_documents_timestamp AFTER UPDATE ON documents BEGIN UPDATE documents SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; END;
CREATE TRIGGER update_metadata_timestamp AFTER UPDATE ON document_metadata BEGIN UPDATE document_metadata SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; END;
CREATE TRIGGER update_ai_analysis_timestamp AFTER UPDATE ON document_ai_analysis BEGIN UPDATE document_ai_analysis SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; END;
INSERT INTO sites (name, url, site_type, type_specific_params) VALUES ('JORADP', 'https://www.joradp.dz/HFR/Index.htm', 'Pattern-based', json_object('base_url_fixed_part', 'https://www.joradp.dz/FTP', 'language_path', '/JO-FRANCAIS', 'url_pattern', '/{year}/F{year}{number_padded_3}.pdf', 'description', 'Pattern: /FTP/JO-FRANCAIS/YYYY/FYYYYNNN.pdf', 'year_param_type', 'user_defined', 'number_range_type', 'sequential_until_404', 'notes', 'Numéros vont de 001 à ~86 selon l''année. Arrêt automatique sur 404.'));
EOF
sqlite3 harvester.db < migration_v2.sql && echo "✅ Migration réussie !" && sqlite3 harvester.db "SELECT name FROM sqlite_master WHERE type='table';" || echo "❌ Erreur"
