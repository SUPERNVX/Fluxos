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
        // Simplified configuration for GitHub Pages
        skipWaiting: true,
        clientsClaim: true,
      },
      // Only include essential manifest properties
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
});