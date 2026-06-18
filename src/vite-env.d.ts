/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  /** Optional. Magic-link redirect; must be listed in Supabase Auth → URL Configuration. Defaults to window.location.origin. */
  readonly VITE_AUTH_REDIRECT_URL?: string;
  /** Set to true to use Volcengine streaming ASR for dream journal speech-to-text. */
  readonly VITE_VOLCENGINE_SPEECH?: string;
  readonly VITE_SUPABASE_DEV_PROXY?: string;
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

