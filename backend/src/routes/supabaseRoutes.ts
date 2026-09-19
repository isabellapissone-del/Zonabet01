import { Router, type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import { supabaseService } from '../db/supabase.ts';

const router = Router();

// Obter estado da ligação ao Supabase
router.get('/status', async (req: Request, res: Response) => {
  try {
    const status = await supabaseService.getStatus();
    res.json(status);
  } catch (error: any) {
    res.status(500).json({
      isConfigured: false,
      connected: false,
      error: error.message || 'Erro ao verificar estado do Supabase',
    });
  }
});

// Sincronizar dados em memória/locais com o Supabase (Push)
router.post('/sync', async (req: Request, res: Response) => {
  try {
    const result = await supabaseService.syncLocalDataToSupabase();
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Falha ao sincronizar com o Supabase',
    });
  }
});

// Importar e hidratar dados do Supabase para a aplicação (Pull)
router.post('/pull', async (req: Request, res: Response) => {
  try {
    const result = await supabaseService.pullDataFromSupabase();
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Falha ao importar dados do Supabase',
    });
  }
});

// Obter o script SQL do esquema para o utilizador colar no painel do Supabase
router.get('/schema', (req: Request, res: Response) => {
  try {
    const schemaPath = path.join(process.cwd(), 'supabase', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, 'utf8');
      return res.json({ sql });
    }
    res.status(404).json({ error: 'Ficheiro schema.sql não encontrado' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro ao carregar schema' });
  }
});

export default router;
