import React, { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { BetSlipProvider, useBetSlip } from './context/BetSlipContext.tsx';
import { RealtimeProvider } from './context/RealtimeContext.tsx';
import { Header } from './components/Header.tsx';
import { MatchList } from './components/MatchList.tsx';
import { BetSlip } from './components/BetSlip.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { UserAccountModal } from './components/UserAccountModal.tsx';
import { WalletActionModal } from './components/WalletActionModal.tsx';
import { AdminPanel } from './components/AdminPanel.tsx';
import { SecretAdminModal } from './components/SecretAdminModal.tsx';
import { WhatsAppButton } from './components/WhatsAppButton.tsx';
import { PWAInstallButton } from './components/PWAInstallButton.tsx';
import { SystemSettings } from './types.ts';
import { Shield, Flame, Wallet as WalletIcon, Trophy, Ticket, User as UserIcon, ArrowDownLeft, ArrowUpRight, CheckCircle2, History, AlertCircle, Bell } from 'lucide-react';
import { subscribeToSettlement } from './utils/settlementEvents.ts';
import { api } from './api.ts';
import { safeStorage } from './utils/storage.ts';

function MainLayout() {
  const { user, refreshUserData } = useAuth();
  const { items, setIsOpenMobile } = useBetSlip();
  const [currentView, setCurrentView] = useState<'sportsbook' | 'account' | 'admin'>('sportsbook');
  const [accountTab, setAccountTab] = useState<'wallet' | 'deposit' | 'withdraw' | 'bets' | 'transactions' | 'referrals'>('bets');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [walletModalTab, setWalletModalTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [secretAdminModalOpen, setSecretAdminModalOpen] = useState(false);
  const [adminToast, setAdminToast] = useState<string | null>(null);
  const [appSettings, setAppSettings] = useState<SystemSettings | null>(null);
  const [settlementToast, setSettlementToast] = useState<{
    title: string;
    message: string;
    type: 'win' | 'settled';
  } | null>(null);

  useEffect(() => {
    api.getPublicSettings()
      .then((res) => {
        if (res?.settings) setAppSettings(res.settings as any);
      })
      .catch(() => {});
  }, []);

  // Escuta liquidações de partidas feitas pelo administrador para atualizar todos os usuários apostadores
  useEffect(() => {
    const unsubscribe = subscribeToSettlement(async (payload) => {
      console.log('[App] Notificação de liquidação recebida pelo utilizador:', payload);
      if (user) {
        // Atualiza saldo e carteira imediatamente
        await refreshUserData();

        // Verifica se o usuário tem apostas nesta partida
        try {
          const userBetsRes = await api.getUserBets();
          const affectedBets = userBetsRes.bets.filter((b) =>
            b.items.some((item) => item.matchId === payload.matchId)
          );

          if (affectedBets.length > 0) {
            const wonBets = affectedBets.filter((b) => b.status === 'WON');
            if (wonBets.length > 0) {
              const totalWon = wonBets.reduce((sum, b) => sum + b.potentialReturn, 0);
              setSettlementToast({
                title: '🎉 Parabéns! Bilhete Premiado!',
                message: `Resultado: ${payload.homeScore} - ${payload.awayScore}. Ganhou ${totalWon.toFixed(2)} MT! Saldo creditado.`,
                type: 'win',
              });
            } else {
              setSettlementToast({
                title: 'Resultado Publicado pelo Admin',
                message: `Resultado: ${payload.homeScore} - ${payload.awayScore}. O seu bilhete de apostas foi processado.`,
                type: 'settled',
              });
            }
            setTimeout(() => setSettlementToast(null), 8000);
          }
        } catch (e) {
          console.error('Erro ao verificar apostas do utilizador pós liquidação', e);
        }
      }
    });

    return () => unsubscribe();
  }, [user, refreshUserData]);

  // If user is not admin, admin view is strictly hidden
  useEffect(() => {
    if (currentView === 'admin' && user?.role !== 'ADMIN') {
      setCurrentView('sportsbook');
    }
  }, [currentView, user]);

  const triggerSecretAdmin = () => {
    if (user?.role === 'ADMIN') {
      setCurrentView('admin');
      setAdminToast('Modo Super Administrador ativado.');
      setTimeout(() => setAdminToast(null), 3500);
    } else {
      setSecretAdminModalOpen(true);
    }
  };

  // Secret URL Hash trigger (#admin or ?admin=true) known only to the administrator
  useEffect(() => {
    const checkUrlTriggers = () => {
      const hash = window.location.hash.toLowerCase();
      const params = new URLSearchParams(window.location.search);
      if (
        hash === '#admin' ||
        hash === '#superadmin' ||
        params.get('admin') === 'true' ||
        params.get('mode') === 'admin'
      ) {
        triggerSecretAdmin();
      }

      // Check referral code parameter in URL (?ref=... or ?codigo=...)
      const refParam = params.get('ref') || params.get('codigo') || params.get('código');
      if (refParam) {
        safeStorage.setItem('zonabet_ref', refParam);
        if (!user) {
          setAuthModalMode('register');
          setAuthModalOpen(true);
        }
      }
    };

    checkUrlTriggers();
    window.addEventListener('hashchange', checkUrlTriggers);
    return () => window.removeEventListener('hashchange', checkUrlTriggers);
  }, [user]);

  const openAuth = (mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  const openWalletAction = (tab: 'deposit' | 'withdraw') => {
    if (!user) {
      openAuth('login');
      return;
    }
    setWalletModalTab(tab);
    setWalletModalOpen(true);
  };

  const openUserBets = () => {
    if (!user) {
      openAuth('login');
      return;
    }
    setAccountTab('bets');
    setCurrentView('account');
  };

  const openReferrals = () => {
    if (!user) {
      openAuth('register');
      return;
    }
    setAccountTab('referrals');
    setCurrentView('account');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-emerald-500 selection:text-slate-950 overflow-x-hidden">
      
      {/* Toast Notification when Super Admin is triggered */}
      {adminToast && (
        <div className="fixed top-20 right-4 z-50 px-4 py-2.5 rounded-2xl bg-amber-500 text-slate-950 font-black text-xs shadow-2xl shadow-amber-500/30 flex items-center gap-2 animate-in slide-in-from-top-2">
          <Shield className="w-4 h-4" />
          <span>{adminToast}</span>
        </div>
      )}

      {/* Global Settlement Toast when Admin enters match result */}
      {settlementToast && (
        <div
          onClick={() => {
            setSettlementToast(null);
            openUserBets();
          }}
          className={`fixed top-20 right-4 left-4 sm:left-auto sm:max-w-md z-50 p-4 rounded-2xl shadow-2xl cursor-pointer transition-all border animate-in slide-in-from-top-3 ${
            settlementToast.type === 'win'
              ? 'bg-emerald-950/95 border-emerald-400 text-white shadow-emerald-500/30 ring-1 ring-emerald-400/50'
              : 'bg-slate-900/95 border-cyan-500/50 text-white shadow-cyan-500/20'
          }`}
        >
          <div className="flex items-start gap-3">
            {settlementToast.type === 'win' ? (
              <div className="p-2 rounded-xl bg-emerald-500 text-slate-950 font-bold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            ) : (
              <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
                <Bell className="w-5 h-5" />
              </div>
            )}
            <div className="flex-1">
              <h4 className="text-sm font-black flex items-center gap-1.5">
                <span>{settlementToast.title}</span>
              </h4>
              <p className="text-xs text-slate-300 mt-1">{settlementToast.message}</p>
              <span className="text-[11px] text-emerald-400 font-bold underline mt-1 block">
                Clique para ver o seu histórico de apostas →
              </span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSettlementToast(null);
              }}
              className="text-slate-400 hover:text-white text-xs p-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Top Navigation */}
      <Header
        currentView={currentView}
        setCurrentView={setCurrentView}
        openAuthModal={openAuth}
        onOpenDeposit={() => openWalletAction('deposit')}
        onOpenWithdraw={() => openWalletAction('withdraw')}
        onOpenBets={openUserBets}
        onOpenReferrals={openReferrals}
        onTriggerSecretAdmin={triggerSecretAdmin}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-2 sm:px-6 lg:px-8 py-3 sm:py-4 pb-28 md:pb-8">
        
        {/* View Routing */}
        {currentView === 'sportsbook' && (
          <div className="flex flex-col lg:flex-row gap-5 items-start w-full">
            {/* Left/Center Column: Match List */}
            <div className="flex-1 w-full min-w-0">
              <MatchList />
            </div>

            {/* Right Column: Bet Slip (Desktop & Mobile) */}
            <BetSlip
              onOpenAuth={() => openAuth('login')}
              onViewHistory={openUserBets}
            />
          </div>
        )}

        {currentView === 'account' && (
          <UserAccountModal
            initialTab={accountTab}
            onNavigateToAdmin={() => setCurrentView('admin')}
          />
        )}

        {currentView === 'admin' && user?.role === 'ADMIN' && (
          <AdminPanel onBackToSportsbook={() => setCurrentView('sportsbook')} />
        )}

      </main>

      {/* Mobile Bottom App Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 px-3 py-2 flex items-center justify-around shadow-2xl">
        <button
          id="mobile-nav-sportsbook"
          onClick={() => setCurrentView('sportsbook')}
          className={`flex flex-col items-center gap-1 p-1 rounded-xl transition-all ${
            currentView === 'sportsbook' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Trophy className="w-5 h-5" />
          <span className="text-[10px] tracking-tight">Jogos</span>
        </button>

        <button
          id="mobile-nav-my-bets"
          onClick={openUserBets}
          className={`flex flex-col items-center gap-1 p-1 rounded-xl transition-all ${
            currentView === 'account' && accountTab === 'bets'
              ? 'text-emerald-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-5 h-5" />
          <span className="text-[10px] tracking-tight">Apostas</span>
        </button>

        <button
          id="mobile-nav-betslip"
          onClick={() => setIsOpenMobile(true)}
          className="relative flex flex-col items-center gap-1 p-1 rounded-xl text-slate-400 hover:text-emerald-400 transition-all"
        >
          <div className="relative">
            <Ticket className="w-5 h-5" />
            {items.length > 0 && (
              <span className="absolute -top-1 -right-2.5 w-4 h-4 bg-emerald-500 text-slate-950 font-black text-[9px] rounded-full flex items-center justify-center animate-pulse">
                {items.length}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-tight font-medium">Boletim</span>
        </button>

        <button
          id="mobile-nav-deposit"
          onClick={() => openWalletAction('deposit')}
          className="flex flex-col items-center gap-1 p-1 rounded-xl text-emerald-400 hover:text-emerald-350 transition-all font-bold"
        >
          <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center">
            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />
          </div>
          <span className="text-[10px] tracking-tight">Depositar</span>
        </button>

        <button
          id="mobile-nav-account"
          onClick={() => {
            if (user) {
              setAccountTab('wallet');
              setCurrentView('account');
            } else {
              openAuth('login');
            }
          }}
          className={`flex flex-col items-center gap-1 p-1 rounded-xl transition-all ${
            currentView === 'account' && accountTab === 'wallet' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <UserIcon className="w-5 h-5" />
          <span className="text-[10px] tracking-tight">Carteira</span>
        </button>

        {/* Mobile bottom nav: Admin mode button */}
        {user?.role === 'ADMIN' && (
          <button
            id="mobile-nav-admin"
            onClick={() => setCurrentView(currentView === 'admin' ? 'sportsbook' : 'admin')}
            className={`flex flex-col items-center gap-1 p-1 rounded-xl transition-all ${
              currentView === 'admin' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-amber-300'
            }`}
          >
            <Shield className={`w-5 h-5 ${currentView === 'admin' ? 'text-amber-400' : 'text-slate-400'}`} />
            <span className="text-[10px] tracking-tight font-bold">{currentView === 'admin' ? 'Sair Admin' : 'Admin'}</span>
          </button>
        )}
      </nav>

      {/* Footer with optimized bottom spacing for mobile nav bar */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950 text-slate-500 pt-6 sm:pt-8 pb-24 md:pb-8 px-4 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-center md:text-left">
            <span className="font-extrabold text-white">ZONABET</span>
            <span>•</span>
            <span className="text-slate-400">
              Moçambique • Operações em Meticais (MZN / MT)
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-[11px]">
            <span className="text-slate-400 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              Ambiente Seguro
            </span>
            <span>•</span>
            <span>Apenas Futebol Oficial</span>
            <span>•</span>
            <span>Aposta Mínima 20 MT</span>
            <span>•</span>
            <span>Jogo Responsável (+18)</span>
          </div>
        </div>
      </footer>

      {/* Global Modals */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authModalMode}
      />

      <WalletActionModal
        isOpen={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
        initialTab={walletModalTab}
      />

      {/* Secret Super Admin Gate */}
      <SecretAdminModal
        isOpen={secretAdminModalOpen}
        onClose={() => setSecretAdminModalOpen(false)}
        onSuccess={() => {
          setCurrentView('admin');
          setAdminToast('Modo Super Administrador ativado.');
          setTimeout(() => setAdminToast(null), 3500);
        }}
      />

      {/* Floating WhatsApp Support Button */}
      <WhatsAppButton settings={appSettings?.whatsapp} />

      {/* PWA Install Button for Mobile/Desktop Installation */}
      <PWAInstallButton />

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RealtimeProvider>
        <BetSlipProvider>
          <MainLayout />
        </BetSlipProvider>
      </RealtimeProvider>
    </AuthProvider>
  );
}
