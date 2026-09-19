import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { safeStorage } from '../utils/storage.ts';
import { X, Lock, Mail, User, Phone, ShieldCheck, Eye, EyeOff, Sparkles, Gift } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode }) => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [referralCode, setReferralCode] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('ref') || params.get('codigo') || params.get('código') || safeStorage.getItem('zonabet_ref') || '';
    }
    return '';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref') || params.get('codigo') || params.get('código') || safeStorage.getItem('zonabet_ref');
      if (ref) {
        setReferralCode(ref);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const identifier = loginIdentifier.trim();
        if (!identifier) {
          throw new Error('Introduza o seu número de celular ou email');
        }
        await login({ identifier, password });
      } else {
        const cleanName = name.trim();
        const cleanPhone = phone.trim();

        if (cleanName.length < 2) {
          throw new Error('O nome completo deve ter pelo menos 2 caracteres');
        }

        const digits = cleanPhone.replace(/\D/g, '');
        if (digits.length < 8) {
          throw new Error('Introduza um número de celular válido (ex: 84 123 4567)');
        }

        if (password.length < 6) {
          throw new Error('A palavra-passe deve ter pelo menos 6 caracteres');
        }

        if (password !== confirmPassword) {
          throw new Error('As palavras-passe não coincidem');
        }

        await register({
          name: cleanName,
          phone: cleanPhone.startsWith('+') ? cleanPhone : `+258 ${cleanPhone}`,
          password,
          confirmPassword,
          referralCode: referralCode.trim() || undefined,
        });
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro de autenticação');
    } finally {
      setLoading(false);
    }
  };

  const quickFillUser = () => {
    setMode('login');
    setLoginIdentifier('+258 84 123 4567');
    setPassword('Apostador123!');
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-full sm:max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 sm:p-6 text-white max-h-[94vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Tab switch */}
        <div className="flex border-b border-slate-800 mb-5 pb-2">
          <button
            id="modal-tab-login"
            onClick={() => { setMode('login'); setError(null); }}
            className={`flex-1 text-center py-2 text-sm font-bold transition-all border-b-2 ${
              mode === 'login'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Iniciar Sessão
          </button>
          <button
            id="modal-tab-register"
            onClick={() => { setMode('register'); setError(null); }}
            className={`flex-1 text-center py-2 text-sm font-bold transition-all border-b-2 ${
              mode === 'register'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Criar Conta Grátis
          </button>
        </div>

        {/* Welcome message */}
        {mode === 'register' ? (
          <div className="mb-4 bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-3 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-emerald-300">Registo Rápido ZONABET</p>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Registe-se com o seu número de celular e comece a apostar nas suas equipas favoritas!
              </p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400 mb-4">
            Aceda à sua carteira, consulte o histórico de bilhetes e faça apostas nas ligas nacionais e provinciais.
          </p>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'register' ? (
            <>
              {/* Nome Completo */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nome Completo <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    id="register-name-input"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Carlos Alberto Cossa"
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Número de Celular */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-300">
                    Número de Celular <span className="text-rose-400">*</span>
                  </label>
                  <span className="text-[10px] text-emerald-400 font-medium">M-Pesa • e-Mola • mKesh</span>
                </div>
                <div className="relative flex items-center">
                  <div className="absolute left-3 flex items-center gap-1.5 text-slate-400 font-bold text-xs pointer-events-none">
                    <span>🇲🇿</span>
                    <span>+258</span>
                  </div>
                  <input
                    id="register-phone-input"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="84 123 4567"
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-20 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Insira o seu contacto de operadora (Vodacom, Movitel ou Tmcel).
                </p>
              </div>

              {/* Palavra-passe */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Palavra-passe <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    id="register-password-input"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-9 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirmar Palavra-passe */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Confirmar Palavra-passe <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    id="register-confirm-password-input"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a palavra-passe"
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-9 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 p-1"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Código de Convite / Padrinho (Opcional - Bónus 5%) */}
              <div className="pt-1">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-300">
                    Código de Convite <span className="text-slate-500 font-normal">(Opcional)</span>
                  </label>
                  <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                    <Gift className="w-3 h-3" />
                    <span>Bónus de 5%</span>
                  </span>
                </div>
                <div className="relative">
                  <Gift className="w-4 h-4 text-amber-400 absolute left-3 top-3" />
                  <input
                    id="register-referral-code-input"
                    type="text"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    placeholder="Ex: ZONA841234567 ou celular do amigo"
                    className="w-full bg-slate-800/80 border border-slate-700 focus:border-amber-500/80 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                  <span>💡 O seu amigo que o convidou recebe 5% de bónus a cada depósito seu.</span>
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Login Identifier */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Número de Celular ou Email
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    id="auth-identifier-input"
                    type="text"
                    required
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="Ex: 84 123 4567 ou email@exemplo.co.mz"
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-300">Palavra-passe</label>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    id="auth-password-input"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-9 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </>
          )}

          <button
            id="auth-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full mt-3 py-3 px-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black rounded-xl shadow-lg shadow-emerald-500/20 transition-all text-sm flex items-center justify-center gap-2 active:scale-98"
          >
            {loading ? 'A processar...' : mode === 'login' ? 'Entrar na Conta' : 'Criar Conta'}
          </button>
        </form>

        {/* Quick Access Bar */}
        <div className="mt-6 pt-4 border-t border-slate-800 space-y-2">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 text-center">
            Acesso Rápido de Testes
          </p>
          <button
            type="button"
            onClick={quickFillUser}
            className="w-full p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-left transition-colors flex items-center justify-between"
          >
            <div>
              <span className="block text-xs font-bold text-emerald-400">Apostador: Nelson Tembe</span>
              <span className="block text-[10px] text-slate-400">+258 84 123 4567 • apostador@exemplo.co.mz</span>
            </div>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold">1-Clique</span>
          </button>
        </div>

      </div>
    </div>
  );
};
