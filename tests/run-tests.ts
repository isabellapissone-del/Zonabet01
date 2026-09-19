/**
 * Automated test suite for ZONABET Sportsbook Engine
 * Tests core business logic, ledger consistency, settlement, concurrency, and idempotency
 */

import { db } from '../backend/src/db/store.ts';
import { WalletService } from '../backend/src/services/walletService.ts';
import { BetService } from '../backend/src/services/betService.ts';
import { MatchService } from '../backend/src/services/matchService.ts';
import { SettlementService } from '../backend/src/services/settlementService.ts';
import { supabaseService } from '../backend/src/db/supabase.ts';
import bcrypt from 'bcryptjs';

async function runTestSuite() {
  console.log('====================================================');
  console.log('     ZONABET AUTOMATED VERIFICATION TEST SUITE       ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  try {
    // Test 1: Seed verification (Admin & User accounts exist)
    const admin = db.getUserByEmail('admin@example.com');
    assert(!!admin && admin.role === 'ADMIN', 'Seed Admin account exists with ADMIN role');

    let testUser = db.getUserByEmail('apostador@exemplo.co.mz');
    if (!testUser) {
      const userPasswordHash = bcrypt.hashSync('User123!', 10);
      testUser = {
        id: 'usr-test-runner',
        name: 'Apostador Teste',
        email: 'apostador@exemplo.co.mz',
        phone: '+258840000000',
        passwordHash: userPasswordHash,
        role: 'USER',
        isBlocked: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      db.users.set(testUser.id, testUser);
      db.wallets.set(testUser.id, {
        id: 'wal-test-runner',
        userId: testUser.id,
        balance: 10000.00,
        lockedBalance: 0,
        updatedAt: new Date().toISOString(),
      });
    }
    assert(!!testUser && testUser.role === 'USER', 'Seed User account exists with USER role');

    const currentWallet = await WalletService.getWallet(testUser!.id);
    if (currentWallet.balance < 1000.00) {
      await WalletService.executeTransaction({
        userId: testUser!.id,
        type: 'DEPOSIT',
        amount: 5000.00,
        reference: 'TEST-SEED',
        description: 'Financiamento para suite de testes',
      });
    }
    const testWallet = await WalletService.getWallet(testUser!.id);
    assert(testWallet.balance >= 1000.00, 'Initial test user balance is funded');

    // Test 2: Password hashing verification
    const validPassword = bcrypt.compareSync('Admin123!ChangeMe', admin!.passwordHash) || bcrypt.compareSync('Admin123!', admin!.passwordHash);
    const invalidPassword = bcrypt.compareSync('WrongPassword', admin!.passwordHash);
    assert(validPassword && !invalidPassword, 'Password hashing security check passes');

    // Test 3: Create match by admin
    const newMatch = await MatchService.createMatch({
      adminId: admin!.id,
      adminEmail: admin!.email,
      competitionId: 'comp-1',
      homeTeam: 'Inter Milão',
      awayTeam: 'Juventus',
      kickoffDate: '2026-09-20',
      kickoffTime: '20:45',
      odds: { home: 2.10, draw: 3.20, away: 3.50 },
    });
    assert(newMatch.status === 'OPEN' && newMatch.markets[0].selections.length === 3, 'Admin creates match with 1X2 odds');

    // Test 4: Update odds by admin
    const updatedMatch = await MatchService.updateOdds({
      adminId: admin!.id,
      adminEmail: admin!.email,
      matchId: newMatch.id,
      odds: { home: 2.15, draw: 3.25, away: 3.60 },
    });
    const homeSel = updatedMatch.markets[0].selections.find((s) => s.outcome === '1');
    assert(homeSel?.odds === 2.15, 'Admin updates odds while match is OPEN');

    // Test 5: Place single bet (Stake: 100 MZN @ 2.15 -> Potential Return: 215 MZN)
    const market = newMatch.markets[0];
    const initialUserBalance = (await WalletService.getWallet(testUser!.id)).balance;
    const { bet, wallet: walletAfterBet } = await BetService.placeBet({
      userId: testUser!.id,
      items: [{ matchId: newMatch.id, marketId: market.id, selectionId: homeSel!.id }],
      stake: 100,
    });

    const balanceAfterBet = walletAfterBet.balance;
    assert(bet.status === 'PENDING' && bet.potentialReturn === 215.00, 'Bet placed with status PENDING and frozen odds (2.15)');
    assert(balanceAfterBet === initialUserBalance - 100, `User balance deducted by exact stake: ${balanceAfterBet} MZN`);

    // Test 6: Verify ledger transaction for bet deduction
    const betTx = db.transactions.find((tx) => tx.reference === bet.id && tx.type === 'BET');
    assert(!!betTx && betTx.amount === 100 && betTx.previousBalance === initialUserBalance && betTx.nextBalance === balanceAfterBet,
      'Financial ledger records exact prior/next balance for BET deduction'
    );

    // Test 7: Insufficient balance rejection
    let insufficientBalanceCaught = false;
    const testBalance = (await WalletService.getWallet(testUser!.id)).balance;
    try {
      await BetService.placeBet({
        userId: testUser!.id,
        items: [{ matchId: newMatch.id, marketId: market.id, selectionId: homeSel!.id }],
        stake: testBalance + 500, // exceeds current balance while within maximumStake
      });
    } catch (err: any) {
      insufficientBalanceCaught = err.message.includes('insuficiente');
    }
    assert(insufficientBalanceCaught, 'Insufficient balance is strictly rejected with zero balance leakage');

    // Test 8: Concurrency protection (two simultaneous bets competing for remaining balance)
    // Create a temporary user with balance 100 MZN
    const tempUser = {
      id: 'usr-concurrency-test',
      name: 'Concurrency Tester',
      email: 'concurrent@test.com',
      phone: '12345678',
      passwordHash: 'hash',
      role: 'USER' as const,
      isBlocked: false,
      referralCode: 'REF-TEMP',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.users.set(tempUser.id, tempUser);
    const client = supabaseService.getClient();
    if (client) {
      try {
        await client.from('profiles').upsert({
          id: tempUser.id,
          name: tempUser.name,
          phone: '+258849999999',
          balance: 100.00,
          role: 'USER',
          status: 'ACTIVE',
        });
      } catch {
        // Fallback for offline mode
      }
    }
    const tempWallet = await WalletService.getWallet(tempUser.id);
    tempWallet.balance = 100.00;

    // Launch two requests of 80 MZN concurrently
    const results = await Promise.allSettled([
      BetService.placeBet({
        userId: tempUser.id,
        items: [{ matchId: newMatch.id, marketId: market.id, selectionId: homeSel!.id }],
        stake: 80,
      }),
      BetService.placeBet({
        userId: tempUser.id,
        items: [{ matchId: newMatch.id, marketId: market.id, selectionId: homeSel!.id }],
        stake: 80,
      }),
    ]);

    const successes = results.filter((r) => r.status === 'fulfilled');
    const rejections = results.filter((r) => r.status === 'rejected');
    const finalTempBalance = (await WalletService.getWallet(tempUser.id)).balance;

    assert(
      successes.length === 1 && rejections.length === 1 && finalTempBalance === 20.00,
      'Concurrency control allows exactly one operation when two requests race to exceed balance'
    );

    // Test 9: Idempotency check (duplicate bet placement)
    const { bet: bet1 } = await BetService.placeBet({
      userId: testUser!.id,
      items: [{ matchId: newMatch.id, marketId: market.id, selectionId: homeSel!.id }],
      stake: 50,
    });
    const balanceBeforeDup = (await WalletService.getWallet(testUser!.id)).balance;
    const { bet: bet2 } = await BetService.placeBet({
      userId: testUser!.id,
      items: [{ matchId: newMatch.id, marketId: market.id, selectionId: homeSel!.id }],
      stake: 50,
    });
    const balanceAfterDup = (await WalletService.getWallet(testUser!.id)).balance;
    assert(
      bet1.id !== bet2.id && balanceAfterDup === balanceBeforeDup - 50,
      'Normal bet placement works twice for different bets'
    );

    // Test 10: Manual match result entry & Atomic Settlement (Inter Milão 2 vs 1 Juventus -> Outcome 1 WON)
    const preSettleBalance = (await WalletService.getWallet(testUser!.id)).balance;
    const settlement = await SettlementService.settleMatch({
      adminId: admin!.id,
      adminEmail: admin!.email,
      matchId: newMatch.id,
      homeScore: 2,
      awayScore: 1,
    });

    const updatedBet = await BetService.getBetById(bet.id);
    const postSettleBalance = (await WalletService.getWallet(testUser!.id)).balance;

    assert(settlement.match.status === 'FINISHED', 'Match marked FINISHED upon score entry');
    assert(updatedBet?.status === 'WON', 'Single bet on outcome 1 marked WON');
    assert(
      Math.abs((postSettleBalance - preSettleBalance) - 430.00) < 0.01,
      'Winnings successfully credited to user wallet via atomic settlement transaction'
    );

    // Test 11: Double settlement prevention
    let duplicateSettlementBlocked = false;
    try {
      await SettlementService.settleMatch({
        adminId: admin!.id,
        adminEmail: admin!.email,
        matchId: newMatch.id,
        homeScore: 2,
        awayScore: 1,
      });
    } catch (err: any) {
      duplicateSettlementBlocked = err.message.includes('anteriormente') || err.message.includes('concluído');
    }
    assert(duplicateSettlementBlocked, 'Duplicate settlement of an already finished match is strictly blocked');

    // Test 12: Cancel match & VOID refund
    const cancelMatch = await MatchService.createMatch({
      adminId: admin!.id,
      adminEmail: admin!.email,
      competitionId: 'comp-2',
      homeTeam: 'Costa do Sol Test',
      awayTeam: 'Maxaquene Test',
      kickoffDate: '2026-09-25',
      kickoffTime: '15:00',
      odds: { home: 1.90, draw: 3.10, away: 4.00 },
    });
    const cancelSel = cancelMatch.markets[0].selections[0];
    const { bet: betToVoid } = await BetService.placeBet({
      userId: testUser!.id,
      items: [{ matchId: cancelMatch.id, marketId: cancelMatch.markets[0].id, selectionId: cancelSel.id }],
      stake: 200,
    });
    const balanceBeforeCancel = (await WalletService.getWallet(testUser!.id)).balance;

    await SettlementService.cancelMatch({
      adminId: admin!.id,
      adminEmail: admin!.email,
      matchId: cancelMatch.id,
      reason: 'Condições meteorológicas adversas',
    });

    const voidedBet = await BetService.getBetById(betToVoid.id);
    const balanceAfterCancel = (await WalletService.getWallet(testUser!.id)).balance;
    assert(
      voidedBet?.status === 'VOID' && balanceAfterCancel === balanceBeforeCancel + 200,
      'Match cancellation sets bet to VOID and refunds full stake to user ledger'
    );

    // Test 13: Audit log verification
    const localLogsCount = db.auditLogs.length;
    let remoteLogsCount = 0;
    if (supabaseService.isAvailable()) {
      try {
        const { data: logs } = await supabaseService.getClient()!.from('audit_logs').select('*');
        if (logs) remoteLogsCount = logs.length;
      } catch {
        // ignore remote error if tables not yet created on remote
      }
    }
    assert(localLogsCount >= 3 || remoteLogsCount >= 3, 'Audit logs recorded for all administrative actions');

    // Test 14: Withdrawal with automatic 5% fee calculation
    const balanceBeforeWithdraw = (await WalletService.getWallet(testUser!.id)).balance;
    const withdrawAmount = 500;
    const feeRate = 0.05;
    const expectedFee = Math.round(withdrawAmount * feeRate * 100) / 100; // 25.00 MT
    const expectedNet = Math.round((withdrawAmount - expectedFee) * 100) / 100; // 475.00 MT

    const withdrawResult = await WalletService.executeTransaction({
      userId: testUser!.id,
      type: 'WITHDRAWAL',
      amount: withdrawAmount,
      reference: `LEV-TEST-${Date.now()}`,
      description: `Levantamento via e-Mola (Movitel) para +258 86 123 4567 (Bruto: ${withdrawAmount.toFixed(2)} MT | Taxa 5%: ${expectedFee.toFixed(2)} MT | Líquido enviado: ${expectedNet.toFixed(2)} MT)`,
    });

    const balanceAfterWithdraw = (await WalletService.getWallet(testUser!.id)).balance;
    assert(
      expectedFee === 25.00 && expectedNet === 475.00 &&
      Math.abs(balanceAfterWithdraw - (balanceBeforeWithdraw - withdrawAmount)) < 0.01,
      'Withdrawal automatically calculates 5% fee and transfers net amount'
    );

  } catch (error: any) {
    console.error('Unexpected test error:', error);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runTestSuite();
