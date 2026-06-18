import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import {createSupabaseDevProxy} from './server/supabase-dev-proxy';
import {createVolcengineSpeechProxy} from './server/volcengine-speech-proxy';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const devPlugins = mode === 'development' ? [createSupabaseDevProxy(env)] : [];
  return {
    base: './',
    plugins: [react(), tailwindcss(), ...devPlugins, createVolcengineSpeechProxy(env)],
    build: {
      cssCodeSplit: false,
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
          manualChunks: undefined,
        },
      },
    },
    define: {
      'process.env.KIMI_API_KEY': JSON.stringify(env.KIMI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Some embedded preview panes log CSP eval warnings; a dev-only CSP allows Vite HMR. Set VITE_STRICT_DEV_CSP=true to skip.
      ...(mode === 'development' && process.env.VITE_STRICT_DEV_CSP !== 'true'
        ? {
            headers: {
              'Content-Security-Policy':
                "default-src 'self'; " +
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https: http:; " +
                "style-src 'self' 'unsafe-inline' https: http:; " +
                "img-src 'self' data: blob: https: http:; " +
                "font-src 'self' data: https: http:; " +
                "media-src 'self' blob: data: https: http:; " +
                "connect-src 'self' https: wss: http: ws:;",
            },
          }
        : {}),
    },
  };
});
