/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OFFICIAL_EUR_RATE?: string;
  readonly VITE_OFFICIAL_USD_RATE?: string;
  readonly VITE_LIBRARY_URL?: string;
  readonly VITE_LIBRARY_UNAVAILABLE_MESSAGE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
