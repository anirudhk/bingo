/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_PLAUSIBLE_DOMAIN?: string;
  /** Optional JSON POST endpoint for client error reports (see utils/errorReporter). */
  readonly VITE_ERROR_REPORT_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** App version from package.json, injected by Vite `define`. */
declare const __APP_VERSION__: string;
