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
    {
      // The Klaviyo onsite script stays in the source on purpose (the guardrails read it from there), but the
      // build takes it out of the document: the app injects it as a lazy, client-side loader once the page is
      // up, so the whole third-party runtime never sits on the critical path (bootup, TBT, LCP, CLS).
      name: 'stm-klaviyo-lazy',
      apply: 'build',
      transformIndexHtml: {
        order: 'post',
        handler(html: string) {
          return html.replace(/<script[^>]*klaviyo[^>]*>[\s\S]*?<\/script>/, '');
        },
      },
    },
  ],
  define: {
    __BUILD_YEAR__: JSON.stringify(new Date().getFullYear()),
  },
  build: {
    target: 'es2022',
    // Fonts and images stay files. The page's own font files are served from this site.
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 800,
  },
  server: { port: 5173 },
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
});
