import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { BRANDING } from './branding';
import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'branding-html',
        transformIndexHtml(html) {
          return html.replace(/__APP_TITLE__/g, BRANDING.documentTitle);
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    test: {
      environment: 'node',
      globals: true,
      include: ['src/**/*.test.ts'],
    },
  };
});
