import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.ts';
import { db } from '../db/store.ts';
import type { AuthTokenPayload } from '../types/index.ts';
import { supabaseService } from '../db/supabase.ts';

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
  try {
    const payload = jwt.verify(token, config.jwtSecret) as AuthTokenPayload;
    let user = db.users.get(payload.userId);

    // Resiliency: Fallback to Supabase if not in memory (common in serverless/Vercel)
    if (!user && supabaseService.isAvailable()) {
      const supabaseUser = await supabaseService.findUserById(payload.userId);
      if (supabaseUser) {
        db.users.set(supabaseUser.id, supabaseUser);
        user = supabaseUser;
      }
    }

    if (!user) {
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
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado.' });
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
