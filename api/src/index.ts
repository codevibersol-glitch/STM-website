import { serve } from '@hono/node-server';
import { app } from './app.ts';
import { env } from './lib/env.ts';

serve({ fetch: app.fetch, port: env.port }, (info) => {
  console.log(`stm-api listening on http://localhost:${info.port}`);
});

export default app;
