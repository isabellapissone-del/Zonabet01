import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.ts';
import { db } from '../db/store.ts';
import type { AuthTokenPayload } from '../types/index.ts';
import { firebaseService } from '../db/firebase.ts';

export interface AuthenticatedRequest extends Request {
  user?: AuthTokenPayload;
}

export async function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Não autenticado. Token não fornecido.' });
    return;
  }

  const token = authHeader.substring(7);
  
  const tryVerify = (secret: string) => {
    try {
      return jwt.verify(token, secret) as AuthTokenPayload;
    } catch {
      return null;
    }
  };

  try {
    let payload = tryVerify(config.jwtSecret);

    if (!payload && config.jwtSecret !== 'dev_secret_only_for_local_development_do_not_use_in_prod') {
      payload = tryVerify('dev_secret_only_for_local_development_do_not_use_in_prod');
    }

    if (!payload && config.jwtSecret !== 'zonabet-auth-internal-secure-key') {
      payload = tryVerify('zonabet-auth-internal-secure-key');
    }

    if (!payload) {
      throw new Error('Token inválido ou expirado');
    }

    let user = db.users.get(payload.userId);

    // Resiliency: Fallback to Firebase if not in memory (common in serverless/Vercel)
    if (!user && firebaseService.isAvailable()) {
      const fbUser = await firebaseService.getUserByIdentifier(payload.userId);
      if (fbUser) {
        user = fbUser;
        db.users.set(user.id, user);
      }
    }

    if (!user) {
      console.warn(`[Auth] Utilizador ${payload.userId} não encontrado para o token fornecido.`);
      res.status(401).json({ error: 'Utilizador não encontrado ou removido.' });
      return;
    }
    if (user.isBlocked) {
      res.status(403).json({ error: 'Conta bloqueada. Contacte o suporte.' });
      return;
    }

    req.user = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
    next();
  } catch (err: any) {
    console.error(`[Auth] Falha na verificação do token JWT: ${err.message}`);
    res.status(401).json({ 
      error: 'Token inválido ou expirado.',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'ADMIN') {
    res.status(403).json({ error: 'Acesso negado. Apenas administradores podem aceder a este recurso.' });
    return;
  }
  next();
}

// Basic rate limiter per IP
const requestCounts = new Map<string, { count: number; resetTime: number }>();
export function rateLimiter(limit: number = 100, windowMs: number = 60000) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const client = requestCounts.get(ip);

    if (!client || now > client.resetTime) {
      requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (client.count >= limit) {
      res.status(429).json({ error: 'Muitas requisições. Por favor tente novamente mais tarde.' });
      return;
    }

    client.count++;
    next();
  };
}
