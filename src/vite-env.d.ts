/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  /** Optional. Magic-link redirect; must be listed in Supabase Auth → URL Configuration. Defaults to window.location.origin. */
  readonly VITE_AUTH_REDIRECT_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.mp3' {
  const src: string;
  export default src;
}

declare module '*.MP3' {
  const src: string;
  export default src;
}

