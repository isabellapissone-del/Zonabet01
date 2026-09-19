import { WalletService } from '../backend/src/services/walletService.ts';
import { db } from '../backend/src/db/store.ts';

async function runCleanup() {
  console.log('--- Iniciando Limpeza de Dinheiro Virtual ---');
  try {
    // Note: We're calling the service directly. adminId/adminEmail are just for auditing.
    const { affectedRows } = await WalletService.resetAllBalances('SYSTEM', 'ai-agent@zonabet.mz');
    console.log(`Sucesso! ${affectedRows} saldos foram resetados para 0.00 MT.`);
  } catch (err: any) {
    console.error('Erro durante a limpeza:', err.message);
  }
  console.log('--- Limpeza concluída ---');
  process.exit(0);
}

runCleanup();
