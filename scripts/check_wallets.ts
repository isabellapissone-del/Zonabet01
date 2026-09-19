import { db } from '../backend/src/db/store.ts';

console.log('--- Wallet Status Check ---');
const wallets = Array.from(db.wallets.values());
console.log(`Total Wallets: ${wallets.length}`);
const withBalance = wallets.filter(w => w.balance > 0);
console.log(`Wallets with balance > 0: ${withBalance.length}`);
if (withBalance.length > 0) {
  console.log('Sample balances:', withBalance.slice(0, 5).map(w => ({ userId: w.userId, balance: w.balance })));
}
console.log('--- End Check ---');
process.exit(0);
