import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/authRoutes.ts';
import matchRoutes from './routes/matchRoutes.ts';
import betRoutes from './routes/betRoutes.ts';
import walletRoutes from './routes/walletRoutes.ts';
import adminRoutes from './routes/adminRoutes.ts';
import supabaseRoutes from './routes/supabaseRoutes.ts';
import { rateLimiter } from './middleware/auth.ts';
import { settingsService } from './services/settingsService.ts';
import { firebaseService } from './db/firebase.ts';
import { db } from './db/store.ts';

export function createExpressApp() {
  const app = express();

  // Helmet security headers (configured for iframe embed & SPA compatibility)
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      frameguard: false,
    })
  );

  // Basic security and parsing
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));
  app.use('/api', rateLimiter(200, 60000));

  // Request logger in dev
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      if (req.path.startsWith('/api')) {
        console.log(`[API] ${req.method} ${req.path} -> ${res.statusCode} (${duration}ms)`);
      }
    });
    next();
  });

  // Health check handler
  const healthHandler = async (_req: Request, res: Response) => {
    const health: any = {
      status: 'ok',
      firebase_enabled: firebaseService.enabled,
      users_in_memory: db.users.size,
      env: {
        has_creds_env: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
        has_creds_b64: !!(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || process.env.FIREBASE_SERVICE_ACCOUNT),
        node_env: process.env.NODE_ENV,
      },
    };

    if (firebaseService.enabled && firebaseService.db) {
      try {
        await firebaseService.db.collection('users').limit(1).get();
        health.firestore = 'reachable';
      } catch (err: any) {
        health.firestore = 'unreachable';
        health.firestore_code = err.code;
        health.firestore_message = err.message;
        health.status = 'degraded';
      }
    } else {
      health.firestore = 'disabled';
      health.status = 'degraded';
    }

    res.status(health.status === 'ok' ? 200 : 503).json(health);
  };

  // Public settings handler
  const settingsHandler = (req: Request, res: Response, next: NextFunction) => {
    settingsService.getPublicSettings().then(settings => res.json({ settings })).catch(next);
  };

  // Register routes on both '/api' and '' (to support serverless proxies where /api might be stripped)
  const registerApiRoutes = (prefix: string) => {
    app.get(`${prefix}/health`, healthHandler);
    app.get(`${prefix}/settings/public`, settingsHandler);
    app.use(`${prefix}/auth`, authRoutes);
    app.use(`${prefix}/matches`, matchRoutes);
    app.use(`${prefix}/bets`, betRoutes);
    app.use(`${prefix}/wallet`, walletRoutes);
    app.use(`${prefix}/admin`, adminRoutes);
    app.use(`${prefix}/supabase`, supabaseRoutes);
  };

  registerApiRoutes('/api');
  registerApiRoutes('');

  // 404 handler for API routes
  app.use(['/api/*', '/api'], (req: Request, res: Response) => {
    res.status(404).json({
      error: `Rota API não encontrada: ${req.method} ${req.originalUrl || req.url}`,
    });
  });

  // Global error handler for API
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      return next(err);
    }
    console.error('API Error:', err);
    res.status(err.status || 500).json({
      error: err.message || 'Ocorreu um erro interno no servidor',
    });
  });

  return app;
}
