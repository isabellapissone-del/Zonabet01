import dotenv from 'dotenv';
dotenv.config();

import path from 'path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createExpressApp } from './backend/src/app.ts';

const PORT = 3000;

async function startServer() {
  const app = createExpressApp();

  // Hydrate data from Supabase if available
  try {
    const { supabaseService } = await import('./backend/src/db/supabase.ts');
    const status = await supabaseService.getStatus();
    if (status.connected) {
      console.log('[ZONABET] Supabase detectado. Iniciando sincronização de dados...');
      const result = await supabaseService.pullDataFromSupabase();
      if (result.success) {
        console.log(`[ZONABET] Hidratação concluída: ${result.results?.users || 0} utilizadores, ${result.results?.settings || 0} configurações.`);
      }
    } else {
      console.log('[ZONABET] Supabase não ligado ou tabelas em falta. A usar base de dados local temporária.');
    }
  } catch (err) {
    console.warn('[ZONABET] Falha ao tentar sincronizar com Supabase no arranque:', err);
  }

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ZONABET] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[ZONABET] Failed to start server:', err);
  process.exit(1);
});
