import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.ts';
import matchRoutes from './routes/matchRoutes.ts';
import betRoutes from './routes/betRoutes.ts';
import walletRoutes from './routes/walletRoutes.ts';
import adminRoutes from './routes/adminRoutes.ts';
import supabaseRoutes from './routes/supabaseRoutes.ts';
import { rateLimiter } from './middleware/auth.ts';
import { settingsService } from './services/settingsService.ts';

export function createExpressApp() {
  const app = express();

  // Basic security and parsing
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));
  app.use(rateLimiter(200, 60000));

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
  const healthHandler = (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'ZONABET API',
      currency: 'MZN',
      timestamp: new Date().toISOString(),
    });
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
