import { createExpressApp } from '../backend/src/app.ts';

const app = createExpressApp();

export default async function handler(req: any, res: any) {

  // 1. Detect path from Vercel proxy headers if available
  const rawForwarded =
    (req.headers && (req.headers['x-forwarded-uri'] || req.headers['x-matched-path'] || req.headers['x-vercel-matched-path'])) as string | undefined;

  if (rawForwarded && typeof rawForwarded === 'string' && rawForwarded.startsWith('/')) {
    if (rawForwarded.includes('?')) {
      req.url = rawForwarded;
    } else {
      const queryIdx = (req.url || '').indexOf('?');
      const queryStr = queryIdx >= 0 ? req.url.slice(queryIdx) : '';
      req.url = rawForwarded + queryStr;
    }
  }

  // 2. Detect path from Vercel [...all].ts catch-all query parameter
  if (req.query && req.query.all) {
    const subpath = Array.isArray(req.query.all) ? req.query.all.join('/') : req.query.all;
    if (subpath) {
      const queryIdx = (req.url || '').indexOf('?');
      const queryStr = queryIdx >= 0 ? req.url.slice(queryIdx) : '';
      req.url = '/api/' + subpath + queryStr;
    }
  }

  // 3. Fallback: normalize req.url
  if (!req.url || req.url === '/') {
    req.url = '/api/health';
  } else if (!req.url.startsWith('/')) {
    req.url = '/' + req.url;
  }

  return app(req, res);
}


