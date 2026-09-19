import { createExpressApp } from '../backend/src/app.ts';
import { supabaseService } from '../backend/src/db/supabase.ts';

const app = createExpressApp();

let hydrated = false;
let hydrationPromise: Promise<void> | null = null;

async function ensureHydrated() {
  if (hydrated) return;
  if (hydrationPromise) return hydrationPromise;

  hydrationPromise = (async () => {
    try {
      // Limit hydration to max 2.5s to prevent Vercel Serverless Function timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Supabase hydration timeout')), 2500)
      );

      await Promise.race([
        (async () => {
          if (supabaseService.isAvailable()) {
            const status = await supabaseService.getStatus();
            if (status.connected) {
              const result = await supabaseService.pullDataFromSupabase();
              if (result.success) {
                console.log(`[ZONABET Serverless] Dados hidratados: ${result.results?.users || 0} utilizadores.`);
              }
            }
          }
        })(),
        timeoutPromise,
      ]);
    } catch (err: any) {
      console.warn('[ZONABET Serverless] Hidratação inicial continuará em background:', err?.message || err);
    } finally {
      hydrated = true;
    }
  })();

  return hydrationPromise;
}

export default async function handler(req: any, res: any) {
  // Await hydration gracefully
  await ensureHydrated();

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


