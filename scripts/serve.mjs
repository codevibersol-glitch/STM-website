// Serves dist/ the way Cloudflare Pages will: the _headers rules (CSP, caching), gzip, and
// 404.html for unknown paths.  npm run preview [-- --port 4173] [-- --open]

import { spawn } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};
const COMPRESS = new Set(['.html', '.js', '.css', '.svg', '.json', '.webmanifest', '.xml', '.txt', '.ico']);

/** Cloudflare's _headers format: a path pattern line, then indented "Name: value" lines. */
function parseHeaders(text) {
  const rules = [];
  let current = null;
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)) {
      current = { pattern: line.trim(), headers: [] };
      rules.push(current);
    } else if (current) {
      const i = line.indexOf(':');
      if (i > 0) current.headers.push([line.slice(0, i).trim(), line.slice(i + 1).trim()]);
    }
  }
  return rules;
}
const matches = (pattern, path) =>
  pattern.endsWith('*') ? path.startsWith(pattern.slice(0, -1)) : pattern === path;

async function fileAt(path) {
  try {
    const s = await stat(path);
    return s.isFile() ? path : null;
  } catch {
    return null;
  }
}

export async function startServer(port = 4173) {
  let rules = [];
  try {
    rules = parseHeaders(await readFile(join(dist, '_headers'), 'utf8'));
  } catch {
    console.warn('  dist/_headers not found - serving without the security headers.');
  }
  const cache = new Map();

  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const path = decodeURIComponent(url.pathname);
      const target = normalize(join(dist, path.endsWith('/') ? `${path}index.html` : path));
      const inside = target === dist || target.startsWith(dist + sep);
      let file = inside ? await fileAt(target) : null;
      if (!file && inside && !extname(target)) file = await fileAt(`${target}.html`);
      let status = 200;
      if (!file) {
        status = 404;
        file = join(dist, '404.html');
      }
      const ext = extname(file);
      for (const rule of rules) {
        if (matches(rule.pattern, path)) for (const [k, v] of rule.headers) res.setHeader(k, v);
      }
      res.setHeader('Content-Type', TYPES[ext] ?? 'application/octet-stream');
      let body = await readFile(file);
      if (COMPRESS.has(ext) && /\bgzip\b/.test(req.headers['accept-encoding'] ?? '')) {
        const key = `${file}:${body.length}`;
        if (!cache.has(key)) cache.set(key, gzipSync(body, { level: 9 }));
        body = cache.get(key);
        res.setHeader('Content-Encoding', 'gzip');
        res.setHeader('Vary', 'Accept-Encoding');
      }
      res.statusCode = status;
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch (err) {
      res.statusCode = 500;
      res.end(String(err));
    }
  });

  await new Promise((ok, fail) => {
    server.once('error', fail);
    server.listen(port, '127.0.0.1', ok);
  });
  return server;
}

function openBrowser(url) {
  const cmd = process.platform === 'win32' ? 'cmd' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '""', url] : [url];
  spawn(cmd, args, { stdio: 'ignore', detached: true, windowsVerbatimArguments: true }).unref();
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const i = args.indexOf('--port');
  const port = Number(i >= 0 ? args[i + 1] : process.env.PORT ?? 4173);
  try {
    await startServer(port);
  } catch (err) {
    if (err?.code === 'EADDRINUSE') {
      console.error(`  Port ${port} is busy - is the preview already open? Close it, or use --port.`);
      process.exit(1);
    }
    throw err;
  }
  const url = `http://localhost:${port}/`;
  console.log(`\n  STM website (dist/, as it will be online): ${url}\n  Press Ctrl+C or close this window to stop.\n`);
  if (args.includes('--open')) openBrowser(url);
}
