export interface LibraryDocument {
  id: number;
  publication_date?: string | null;
  decision_number?: string | null;
  url?: string | null;
  file_path?: string | null;
  file_path_signed?: string | null;
  file_path_fr?: string | null;
  file_path_fr_signed?: string | null;
  file_path_ar?: string | null;
  file_path_ar_signed?: string | null;
  metadata_collected_at?: string | null;
  extra_metadata?: string | null;
  text_path?: string | null;
  text_path_signed?: string | null;
  text_path_fr?: string | null;
  text_path_fr_signed?: string | null;
  text_path_ar?: string | null;
  text_path_ar_signed?: string | null;
  embedding_vector?: number[];
  score?: number | null;
  chamber_name?: string | null;
  theme_name?: string | null;
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
  status?: string;
  languageScope?: 'ar' | 'fr' | 'both';
}
