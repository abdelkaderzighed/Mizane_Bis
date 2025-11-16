export interface LibraryDocument {
  id: number;
  publication_date?: string | null;
  url?: string | null;
  file_path?: string | null;
  metadata_collected_at?: string | null;
  extra_metadata?: string | null;
  text_path?: string | null;
  embedding_vector?: number[];
}

export interface LibraryStats {
  total: number;
  last_updated: string | null;
}

export interface LibraryFilters {
  year?: string;
  search?: string;
  from?: string;
  to?: string;
  keywordsAnd?: string;
  keywordsOr?: string;
  keywordsNot?: string;
  documentNumber?: string;
}
