import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vite';

export default defineConfig(() => ({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'PT Duta Agri Nusantara',
        short_name: 'Duta Agri',
        description: 'Pencatatan dan monitoring operasional peternakan.',
        theme_color: '#1B5E20',
        background_color: '#F8FAFC',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/petedahnu-logo.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/petedahnu-logo.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
    }),
  ],
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
  server: {
    host: '0.0.0.0', port: 5173,
    proxy: { '/api': { target: process.env.VITE_API_URL || 'http://localhost:3001', changeOrigin: true, rewrite: url => url.replace(/^\/api/, '/api') } },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
}));
