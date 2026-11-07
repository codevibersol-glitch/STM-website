import { Hono } from 'hono';
import { handle } from 'hono/netlify';
import { app as api } from '../../api/src/app.ts';

/**
 * Co-deployed stm-api. Website rewrites `/api/*` → this function.
 * Mount under `/api` (original path) and `/` (splat-stripped path).
 */
const app = new Hono();
app.route('/api', api);
app.route('/', api);

export default handle(app);
