import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/Fluxos/', // GitHub Pages base path
  plugins: [
    react(),
    VitePWA({
      strategies: 'generateSW',
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 5000000, // 5MB
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          }
        ]
      },
      includeAssets: ['logo.png'],
      manifest: {
        name: 'Fluxos',
        short_name: 'Fluxos',
        description: 'Your Personal Music Laboratory',
        theme_color: '#1a1a1a',
        start_url: './', // Relative to base path
        scope: './',     // Relative to base path
        display: 'standalone',
        icons: [
          {
            src: 'logo.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Chunk para vendor libraries
          vendor: ['react', 'react-dom'],
          
          // Chunk para efeitos de distorção
          distortion: [
            './src/utils/effects/overdrive.ts',
            './src/utils/effects/distortion.ts',
            './src/utils/effects/fuzz.ts',
            './src/utils/effects/bitcrusher.ts'
          ],
          
          // Chunk para efeitos de modulação
          modulation: [
            './src/utils/effects/flanger.ts',
            './src/utils/effects/phaser.ts',
            './src/utils/effects/tremolo.ts',
            './src/utils/effects/lfo.ts'
          ],
          
          // Chunk para efeitos espaciais
          spatial: [
            './src/utils/effects/delay.ts',
            './src/utils/effects/muffle.ts',
            './src/utils/effects/waveshaper.ts'
          ],
          
          // Chunk para workers
          workers: [
            './src/workers/audioRenderWorker.ts',
            './src/workers/waveformWorker.ts',
            './src/workers/bitCrusherWorklet.ts'
          ]
        },
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId.split('/').pop()?.replace(/\.\w+$/, '')
            : 'chunk';
          return `js/${facadeModuleId}-[hash].js`;
        }
      }
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
    exclude: ['@vite/client', '@vite/env']
  }
});