import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { adminUiHtml } from './admin/uiHtml.ts';
import { migrate } from './db/migrate.ts';
import { env } from './lib/env.ts';
import { adminRoutes } from './routes/admin.ts';
import { authRoutes } from './routes/auth.ts';
import { checkoutRoutes } from './routes/checkout.ts';
import { licenseRoutes } from './routes/license.ts';
import { webhookRoutes } from './routes/webhooks.ts';

let migratePromise: Promise<void> | null = null;

export function ensureMigrated(): Promise<void> {
  if (!migratePromise) migratePromise = migrate();
  return migratePromise;
}

export const app = new Hono();

app.use('*', async (c, next) => {
  await ensureMigrated();
  await next();
});

app.use('*', logger());
app.use(
  '*',
  cors({
    origin: (origin) => {
      const allowed = new Set([
        env.corsOrigin,
        'http://localhost:4321',
        'http://127.0.0.1:4321',
        'https://stm-addon.netlify.app',
      ]);
      if (!origin || allowed.has(origin)) return origin || env.corsOrigin;
      return env.corsOrigin;
    },
    credentials: true,
  }),
);

app.get('/health', (c) => c.json({ ok: true, service: 'stm-api' }));
app.get('/admin/ui', (c) => c.html(adminUiHtml));

app.route('/auth', authRoutes);
app.route('/checkout', checkoutRoutes);
app.route('/v1/license', licenseRoutes);
app.route('/webhooks', webhookRoutes);
app.route('/admin', adminRoutes);

export default app;
