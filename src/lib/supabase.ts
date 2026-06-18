import { createClient } from '@supabase/supabase-js';

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

const resolveSupabaseBrowserUrl = () => {
  const configuredUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
  if (!configuredUrl) return undefined;

  if (import.meta.env.DEV && import.meta.env.VITE_SUPABASE_DEV_PROXY === 'true') {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/supabase-proxy`;
    }
    return 'http://localhost:3000/supabase-proxy';
  }

  return configuredUrl;
};

const supabaseUrl = resolveSupabaseBrowserUrl();

const missingConfigError = {
  message: '未配置 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY，无法发送登录邮件。',
  status: 400,
} as const;

/** True when the real Supabase browser client is active (not the dev mock). */
export const isSupabaseBrowserConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const getSupabaseConfiguredUpstreamUrl = () => import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';

export const isSupabaseDevProxyEnabled = () =>
  import.meta.env.DEV && import.meta.env.VITE_SUPABASE_DEV_PROXY === 'true';

// Provide mock or fallback client if environment variables are not present during development
export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : ({
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signInWithOtp: async () => ({ error: { ...missingConfigError } }),
        signOut: async () => ({ error: null }),
      },
      from: () => ({
        select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }),
        upsert: async () => ({ error: null }),
        insert: async () => ({ error: null }),
      }),
      functions: {
        invoke: async () => ({ data: null, error: null }),
      },
    } as any);
