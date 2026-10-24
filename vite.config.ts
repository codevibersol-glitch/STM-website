import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { headTags, resolveSiteUrl } from './src/seo/head.ts';

const siteUrl = resolveSiteUrl(process.env.SITE_URL);
if (siteUrl.warning) console.warn(`\n  ${siteUrl.warning}\n`);

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      // The <head> (title, description, social cards, JSON-LD) comes from the data files, in dev and build alike.
      name: 'stm-head',
      transformIndexHtml(html) {
        return html.replace('<!--app-head-->', headTags(siteUrl.url));
      },
    },
  ],
  define: {
    __BUILD_YEAR__: JSON.stringify(new Date().getFullYear()),
  },
  build: {
    target: 'es2022',
    // Fonts and images stay files: the Content-Security-Policy allows only the site's own files.
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 800,
  },
  server: { port: 5173 },
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
});
