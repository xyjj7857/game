import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  const serverPort = process.env.SERVER_PORT ? parseInt(process.env.SERVER_PORT, 10) : 3335;

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: serverPort,
      host: '0.0.0.0',
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify - file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api/binance-futures': {
          target: 'https://fapi.binance.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/binance-futures/, ''),
          secure: true,
        },
        '/api/binance-spot': {
          target: 'https://api.binance.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/binance-spot/, ''),
          secure: true,
        },
      },
    },
    preview: {
      port: serverPort,
      host: '0.0.0.0',
      proxy: {
        '/api/binance-futures': {
          target: 'https://fapi.binance.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/binance-futures/, ''),
          secure: true,
        },
        '/api/binance-spot': {
          target: 'https://api.binance.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/binance-spot/, ''),
          secure: true,
        },
      },
    },
  };
});
