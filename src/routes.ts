/** Routes the site actually ships. The client and the prerender must agree on these. */
export const ROUTES = ['/', '/play', '/talents', '/new', '/builder', '/characters', '/results', '/pricing', '/account', '/faq', '/guide', '/install'] as const;

export type RoutePath = (typeof ROUTES)[number];

/**
 * The address the browser is on, reduced to a route.
 * Netlify serves `/builder` and `/builder.html` as the same file, so both have to hydrate as the builder.
 */
export function normalizePath(path: string): string {
  const bare = path.split('?')[0]?.split('#')[0] ?? '/';
  let p = bare.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  return p || '/';
}

export function isRoute(path: string): path is RoutePath {
  return (ROUTES as readonly string[]).includes(normalizePath(path));
}
