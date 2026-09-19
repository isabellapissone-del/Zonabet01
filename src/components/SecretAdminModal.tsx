import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Shield, Lock, KeyRound, Eye, EyeOff, AlertTriangle, CheckCircle2, X } from 'lucide-react';

interface SecretAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const SecretAdminModal: React.FC<SecretAdminModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAdminAuth = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    const userIdent = identifier.trim();
    const userPass = password.trim();

    if (!userIdent || !userPass) {
      setError('Por favor preencha o identificador e a palavra-passe.');
      return;
    }

    setLoading(true);

    try {
      await login({ identifier: userIdent, password: userPass });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Credenciais de Administrador inválidas. Acesso restrito.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in">
      <div
        className="w-full max-w-full sm:max-w-md bg-slate-900 border border-amber-500/40 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden p-4 sm:p-7 relative text-slate-100 max-h-[94vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle glowing halo */}
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700/60 transition-colors"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-3.5 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-lg shadow-amber-500/10">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                Terminal Secreto • Super Admin
              </h2>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                RESTRICTED
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Área oculta da ZONABET Moçambique. Introduza as credenciais mestres para desbloquear.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleAdminAuth} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Identificador / Celular do Administrador
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Ex: 872344381"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500 transition-colors"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Palavra-passe Secreta
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Palavra-passe de gestão"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-sm pr-10 focus:outline-none focus:border-amber-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-sm transition-all shadow-lg shadow-amber-500/20 active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Shield className="w-4 h-4" />
            <span>{loading ? 'A validar autorização...' : 'Aceder ao Painel Administrativo'}</span>
          </button>
        </form>

        <div className="mt-5 pt-3 border-t border-slate-800/80 text-center">
          <p className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
            <Lock className="w-3 h-3 text-amber-500/70" />
            <span>Sessão protegida por encriptação. Acessos não autorizados são monitorizados.</span>
          </p>
        </div>

      </div>
    </div>
  );
};
