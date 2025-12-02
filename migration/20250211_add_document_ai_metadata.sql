-- Migration : création de la table document_ai_metadata
-- Ce script s’exécute sur MizaneDb (Supabase).

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.document_ai_metadata (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id integer NOT NULL,
    corpus text NOT NULL CHECK (corpus IN ('joradp', 'cour_supreme')),
    language text NOT NULL CHECK (language IN ('fr', 'ar')),
    title text,
    publication_date date,
    summary text,
    keywords text[],
    entities jsonb,
    dates_extracted jsonb,
    extra_metadata jsonb,
    created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
    updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX IF NOT EXISTS document_ai_metadata_unique_doc_lang
    ON public.document_ai_metadata (document_id, corpus, language);

CREATE INDEX IF NOT EXISTS document_ai_metadata_document_id_idx
    ON public.document_ai_metadata (document_id);
