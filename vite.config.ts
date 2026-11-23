import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json';

const isCapacitorBuild = process.env.CAPACITOR_BUILD === '1';

// https://vitejs.dev/config/
export default defineConfig({
  base: isCapacitorBuild ? './' : '/bingo/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    ...(isCapacitorBuild
      ? []
      : [
          VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'masked-icon.svg'],
            manifest: {
              name: 'Grid Genius',
              short_name: 'GridGenius',
              description:
                'A fun educational game for learning math through interactive puzzle solving',
              theme_color: '#4F46E5',
              background_color: '#FFFFFF',
              display: 'standalone',
              orientation: 'any',
              start_url: '/bingo/',
              scope: '/bingo/',
              icons: [
                {
                  src: 'favicon.svg',
                  sizes: 'any',
                  type: 'image/svg+xml',
                  purpose: 'any maskable',
                },
                {
                  src: 'pwa-192x192.png',
                  sizes: '192x192',
                  type: 'image/png',
                },
                {
                  src: 'pwa-512x512.png',
                  sizes: '512x512',
                  type: 'image/png',
                },
              ],
              categories: ['games', 'education'],
              lang: 'en',
              dir: 'ltr',
            },
            workbox: {
              globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
              runtimeCaching: [
                {
                  urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                  handler: 'CacheFirst',
                  options: {
                    cacheName: 'google-fonts-cache',
                    expiration: {
                      maxEntries: 10,
                      maxAgeSeconds: 60 * 60 * 24 * 365,
                    },
                  },
                },
              ],
            },
          }),
        ]),
  ],
  resolve: {
    alias: isCapacitorBuild
      ? {
          'virtual:pwa-register': fileURLToPath(
            new URL('./src/shims/pwa-register-noop.ts', import.meta.url)
          ),
        }
      : {},
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    open: true,
  },
});
