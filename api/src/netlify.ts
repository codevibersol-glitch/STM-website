import { handle } from 'hono/netlify';
import { app } from './app.ts';

/** Netlify Functions entry — requests arrive under `/api/*` via netlify.toml rewrite. */
export default handle(app);
