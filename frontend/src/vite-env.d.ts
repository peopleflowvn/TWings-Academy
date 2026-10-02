/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public base URL of the Django API, e.g. https://api.twings.edu.vn. Empty = offline demo mode. */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
