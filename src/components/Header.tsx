import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useBetSlip } from '../context/BetSlipContext.tsx';
import {
  Shield,
  Wallet as WalletIcon,
  User,
  LogOut,
  Ticket,
  ArrowDownLeft,
  ArrowUpRight,
  Menu,
  X,
  Trophy,
  History,
  Database,
  Phone,
  Radio,
  Gift,
  Download,
} from 'lucide-react';

interface HeaderProps {
  currentView: 'sportsbook' | 'account' | 'admin';
  setCurrentView: (view: 'sportsbook' | 'account' | 'admin') => void;
  openAuthModal: (mode: 'login' | 'register') => void;
  onOpenDeposit?: () => void;
  onOpenWithdraw?: () => void;
  onOpenBets?: () => void;
  onOpenReferrals?: () => void;
  onTriggerSecretAdmin?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  setCurrentView,
  openAuthModal,
  onOpenDeposit,
  onOpenWithdraw,
  onOpenBets,
  onOpenReferrals,
  onTriggerSecretAdmin,
}) => {
  const { user, logout } = useAuth();
  const { items, setIsOpenMobile } = useBetSlip();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const logoClicksRef = React.useRef(0);
  const lastLogoClickTimeRef = React.useRef(0);

  const handleLogoClick = () => {
    const now = Date.now();
    if (now - lastLogoClickTimeRef.current > 2200) {
      logoClicksRef.current = 1;
    } else {
      logoClicksRef.current += 1;
    }
    lastLogoClickTimeRef.current = now;

    // Secret trick: 5 rapid clicks triggers Super Admin
    if (logoClicksRef.current >= 5) {
      logoClicksRef.current = 0;
      if (onTriggerSecretAdmin) {
        onTriggerSecretAdmin();
      }
      return;
    }

    handleNav('sportsbook');
  };

  const handleNav = (view: 'sportsbook' | 'account' | 'admin') => {
    setCurrentView(view);
    setMobileMenuOpen(false);
  };

  return (
    <>
            <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-15 sm:h-16 flex items-center justify-between gap-2">
          
          {/* Mobile Menu Toggle */}
          <div className="flex items-center gap-1 md:hidden shrink-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-1 sm:p-2 -ml-1 sm:-ml-2 text-slate-300 hover:text-white rounded-xl active:bg-slate-800"
            >
              <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
          
          {/* Brand Logo - Secret 5-Click Trigger */}
          <div
            className="flex items-center gap-2 sm:gap-3 cursor-pointer select-none active:opacity-90"
            onClick={handleLogoClick}
            title="ZONABET Moçambique"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center font-black text-base sm:text-xl text-slate-950 shadow-md shadow-emerald-500/20 shrink-0">
              Z
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1 sm:gap-1.5">
                <span className="font-extrabold text-base sm:text-xl tracking-tight text-white">
                  ZONA<span className="text-emerald-400">BET</span>
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 uppercase tracking-wider">
                  MZN
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block truncate">
                Apostas em Futebol Moçambicano
              </p>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2 px-2 lg:px-6 flex-1 justify-center">
            <button
              onClick={() => handleNav('sportsbook')}
              className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                currentView === 'sportsbook' ? 'bg-slate-800/80 text-emerald-400 shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Moçambola & Nacional</span>
            </button>
            <button
              onClick={() => {
                if (user) {
                  onOpenBets && onOpenBets();
                } else {
                  openAuthModal('login');
                }
              }}
              className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-300 hover:text-white hover:bg-slate-800/50 transition-all flex items-center gap-2"
            >
              <History className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Minhas Apostas</span>
            </button>
            <button
              id="header-referral-btn"
              onClick={() => {
                if (user) {
                  onOpenReferrals ? onOpenReferrals() : handleNav('account');
                } else {
                  openAuthModal('register');
                }
              }}
              className="px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 transition-all flex items-center gap-1.5"
            >
              <Gift className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
              <span>Bónus 5%</span>
            </button>
            {user?.role === 'ADMIN' && (
              <button
                onClick={() => handleNav('admin')}
                className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                  currentView === 'admin' ? 'bg-slate-800/80 text-amber-400 shadow-sm' : 'text-slate-400 hover:text-amber-300 hover:bg-slate-800/50'
                }`}
              >
                <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Admin</span>
              </button>
            )}

            <a
              id="header-download-project-btn"
              href="/zonabet-projeto-completo.tar.gz"
              download="zonabet-projeto-completo.tar.gz"
              className="px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-xs sm:text-sm font-bold text-emerald-300 hover:text-emerald-200 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 transition-all flex items-center gap-1.5"
              title="Baixar Pacote Completo do Projeto (.tar.gz)"
            >
              <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
              <span className="hidden xl:inline">Baixar Código</span>
              <span className="xl:hidden">Baixar</span>
            </a>
          </nav>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                {/* Desktop view: Live Balance & Quick Deposit */}
                <div className="hidden sm:flex items-center gap-1.5 sm:gap-2">
                  <div className="flex flex-col items-end pr-2 border-r border-slate-700/60">
                    <span className="text-[10px] text-slate-400 font-medium leading-none">Saldo Disponível</span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="font-black text-sm text-emerald-400">
                        {user.balance.toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] text-emerald-400/80">MZN</span>
                    </div>
                  </div>
                  {onOpenDeposit && (
                    <button
                      id="header-deposit-btn"
                      onClick={onOpenDeposit}
                      title="Painel de Depósito"
                      className="p-2 sm:px-3 sm:py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-bold transition-colors shadow-sm flex items-center gap-1"
                    >
                      <ArrowDownLeft className="w-4 h-4" />
                      <span className="hidden lg:inline text-sm">Depositar</span>
                    </button>
                  )}
                </div>

                {/* Mobile view: Minimalist balance badge */}
                <button
                  id="user-balance-badge"
                  onClick={() => handleNav('account')}
                  title="Aceder à Carteira"
                  className="sm:hidden flex items-center gap-1.5 bg-slate-800/80 border border-emerald-500/20 rounded-lg px-2.5 py-1.5"
                >
                  <WalletIcon className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-bold text-xs text-emerald-400 whitespace-nowrap">
                    {user.balance.toFixed(0)} <span className="text-[9px] text-emerald-400/80 font-normal">MT</span>
                  </span>
                </button>

                {/* Profile quick button */}
                <button
                  id="user-profile-btn"
                  onClick={() => handleNav('account')}
                  title="Minha Conta"
                  className="flex items-center gap-2 pl-1 pr-3 py-1 sm:pl-1.5 sm:pr-4 sm:py-1.5 rounded-full border border-slate-700/80 bg-slate-800/40 hover:bg-slate-800 transition-colors"
                >
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
                    <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
                  </div>
                  <span className="font-bold text-xs sm:text-sm text-slate-200 hidden md:inline truncate max-w-[100px]">
                    {user.name.split(' ')[0]}
                  </span>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  id="header-login-btn"
                  onClick={() => openAuthModal('login')}
                  className="px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold text-slate-200 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Entrar
                </button>
                <button
                  id="header-register-btn"
                  onClick={() => openAuthModal('register')}
                  className="px-3 sm:px-4 py-1.5 rounded-xl text-xs sm:text-sm bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-md shadow-emerald-500/20 transition-all"
                >
                  Registo
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Slide-Over Drawer Navigation */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm md:hidden animate-in fade-in"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="fixed top-0 right-0 bottom-0 w-4/5 max-w-sm bg-slate-900 border-l border-slate-800 shadow-2xl p-5 flex flex-col justify-between overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-5">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-black text-slate-950 text-base">
                    Z
                  </div>
                  <div>
                    <span className="font-black text-white text-base tracking-tight">ZONA<span className="text-emerald-400">BET</span></span>
                    <span className="text-[10px] text-slate-400 block">Moçambique Oficial</span>
                  </div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* User Profile Card if logged in */}
              {user ? (
                <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-emerald-400 text-xs">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-sm text-white block truncate">{user.name}</span>
                        <span className="text-[11px] text-slate-400 font-mono block">{user.phone}</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {user.role}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between">
                    <span className="text-xs text-slate-400">Saldo Disponível:</span>
                    <span className="text-base font-black text-emerald-400">
                      {user.balance.toFixed(2)} <span className="text-[10px] font-normal text-slate-400">MZN</span>
                    </span>
                  </div>

                  {/* Drawer Quick Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onOpenDeposit && onOpenDeposit();
                      }}
                      className="py-2 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1 shadow-sm"
                    >
                      <ArrowDownLeft className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Depositar</span>
                    </button>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onOpenWithdraw && onOpenWithdraw();
                      }}
                      className="py-2 px-3 bg-slate-800 hover:bg-slate-750 text-amber-300 border border-amber-500/30 font-bold rounded-xl text-xs flex items-center justify-center gap-1"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5 text-amber-400" />
                      <span>Levantar</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/40 to-slate-800/80 border border-emerald-500/20 space-y-3">
                  <p className="text-xs text-slate-300">
                    Junte-se à ZONABET para apostar nos jogos do Moçambola e Provinciais.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        openAuthModal('login');
                      }}
                      className="flex-1 py-2 rounded-xl text-xs font-bold text-slate-200 bg-slate-800 border border-slate-700 text-center"
                    >
                      Entrar
                    </button>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        openAuthModal('register');
                      }}
                      className="flex-1 py-2 rounded-xl text-xs font-black text-slate-950 bg-emerald-500 text-center shadow-md shadow-emerald-500/20"
                    >
                      Criar Conta
                    </button>
                  </div>
                </div>
              )}

              {/* Navigation Links */}
              <div className="space-y-1">
                <button
                  onClick={() => handleNav('sportsbook')}
                  className={`w-full p-3 rounded-xl text-left text-xs font-bold flex items-center gap-3 transition-colors ${
                    currentView === 'sportsbook'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Trophy className="w-4 h-4 text-emerald-400" />
                  <span>Jogos & Mercados 1X2</span>
                </button>

                {user && (
                  <>
                    <button
                      id="mobile-drawer-bets-btn"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        if (onOpenBets) {
                          onOpenBets();
                        } else {
                          handleNav('account');
                        }
                      }}
                      className="w-full p-3 rounded-xl text-left text-xs font-bold flex items-center gap-3 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                    >
                      <History className="w-4 h-4 text-emerald-400" />
                      <span>Histórico de Minhas Apostas</span>
                    </button>

                    <button
                      onClick={() => handleNav('account')}
                      className={`w-full p-3 rounded-xl text-left text-xs font-bold flex items-center gap-3 transition-colors ${
                        currentView === 'account'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <User className="w-4 h-4 text-emerald-400" />
                      <span>Minha Carteira & Conta</span>
                    </button>

                    <button
                      id="mobile-drawer-referrals-btn"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        if (onOpenReferrals) {
                          onOpenReferrals();
                        } else {
                          handleNav('account');
                        }
                      }}
                      className="w-full p-3 rounded-xl text-left text-xs font-bold flex items-center gap-3 text-amber-300 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
                    >
                      <Gift className="w-4 h-4 text-amber-400" />
                      <span>Convide Amigos (Bónus 5%)</span>
                    </button>
                  </>
                )}

                {/* Admin Navigation in mobile drawer */}
                {user?.role === 'ADMIN' && (
                  <button
                    onClick={() => handleNav(currentView === 'admin' ? 'sportsbook' : 'admin')}
                    className={`w-full p-3 rounded-xl text-left text-xs font-bold flex items-center gap-3 transition-colors ${
                      currentView === 'admin'
                        ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                        : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    <Shield className={`w-4 h-4 ${currentView === 'admin' ? 'text-slate-950' : 'text-amber-400'}`} />
                    <span>{currentView === 'admin' ? 'Voltar às Apostas Desportivas' : 'Painel de Administração'}</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setIsOpenMobile(true);
                  }}
                  className="w-full p-3 rounded-xl text-left text-xs font-bold flex items-center justify-between text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Ticket className="w-4 h-4 text-emerald-400" />
                    <span>Boletim de Apostas</span>
                  </div>
                  {items.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px]">
                      {items.length}
                    </span>
                  )}
                </button>

                <a
                  id="mobile-drawer-download-btn"
                  href="/zonabet-projeto-completo.tar.gz"
                  download="zonabet-projeto-completo.tar.gz"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full p-3 rounded-xl text-left text-xs font-bold flex items-center gap-3 text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 hover:bg-emerald-500/20 transition-colors"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>Baixar Código do Projeto (.tar.gz)</span>
                </a>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              {user && (
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-bold flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Terminar Sessão</span>
                </button>
              )}
              <div className="text-[10px] text-slate-500 text-center">
                ZONABET • Moçambique • e-Mola Exclusivo
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
