import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../api.ts';
import {
  Gift,
  Copy,
  Check,
  Share2,
  Users,
  Coins,
  TrendingUp,
  ExternalLink,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  MessageCircle,
} from 'lucide-react';

export const ReferralPanel: React.FC = () => {
  const { user } = useAuth();
  const [referralData, setReferralData] = useState<{
    referralCode: string;
    bonusPercentage: number;
    totalInvited: number;
    totalBonusEarned: number;
    invitedUsers: any[];
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const fetchReferrals = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await api.getReferrals();
      setReferralData(data);
    } catch (err) {
      console.error('Erro ao carregar dados de convites:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferrals();
  }, [user]);

  if (!user) return null;

  const rawPhoneDigits = user.phone.replace(/\D/g, '').slice(-9);
  const userReferralCode = referralData?.referralCode || user.referralCode || `ZONA${rawPhoneDigits}`;
  
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://zonabet.mz';
  const referralLink = `${origin}/?ref=${userReferralCode}`;

  const copyToClipboard = async (text: string, isLink: boolean) => {
    try {
      await navigator.clipboard.writeText(text);
      if (isLink) {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      } else {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2500);
      }
    } catch (e) {
      console.error('Falha ao copiar:', e);
    }
  };

  const shareOnWhatsApp = () => {
    const text = encodeURIComponent(
      `🔥 Junta-te a mim na ZONABET! A melhor plataforma de apostas de Moçambique com Moçambola, Provinciais e Distritais.\n\nCria a tua conta usando o meu código ${userReferralCode} ou pelo link:\n${referralLink}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const totalInvited = referralData?.totalInvited ?? 0;
  const totalBonusEarned = referralData?.totalBonusEarned ?? 0;

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950 via-slate-900 to-amber-950/50 border border-emerald-500/30 p-5 sm:p-7 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold">
              <Gift className="w-3.5 h-3.5" />
              <span>Programa Oficial ZONABET • Bónus de 5%</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Convide Amigos e Ganhe <span className="text-emerald-400">5% de Bónus</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Receba <strong className="text-amber-300 font-bold">5% de bónus real</strong> sobre cada depósito efetuado pelos amigos que você convidar para a ZONABET. O bónus cai diretamente no seu saldo disponível!
            </p>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-3 w-full md:w-auto shrink-0">
            <button
              onClick={shareOnWhatsApp}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-98"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Partilhar no WhatsApp</span>
            </button>
            <button
              onClick={fetchReferrals}
              disabled={loading}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
              <span>Atualizar Dados</span>
            </button>
          </div>
        </div>
      </div>

      {/* Referral Code & Link Box */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Código de Convite */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">O Seu Código de Convite</span>
            <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Ativo
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 font-mono font-black text-lg tracking-wider text-emerald-300 select-all overflow-hidden text-ellipsis">
              {userReferralCode}
            </div>
            <button
              onClick={() => copyToClipboard(userReferralCode, false)}
              className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 transition-all flex items-center gap-1.5 shrink-0 active:scale-95"
            >
              {copiedCode ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copiar</span>
                </>
              )}
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            Os seus amigos podem inserir este código diretamente no formulário de registo.
          </p>
        </div>

        {/* Link de Convite Direto */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Link de Convite Direto</span>
            <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>Preenche Automático</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 font-mono text-xs text-slate-300 truncate select-all">
              {referralLink}
            </div>
            <button
              onClick={() => copyToClipboard(referralLink, true)}
              className="px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition-all flex items-center gap-1.5 shrink-0 shadow-md shadow-emerald-500/20 active:scale-95"
            >
              {copiedLink ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copiar Link</span>
                </>
              )}
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            Qualquer pessoa que abrir o seu link terá o seu código ativado automaticamente.
          </p>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Bónus por Depósito</span>
            <Coins className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">5%</div>
          <span className="text-[10px] text-slate-500">Creditado a cada depósito do amigo</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Amigos Convidados</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">{totalInvited}</div>
          <span className="text-[10px] text-slate-500">Utilizadores registados com o seu código</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Total Bónus Ganho (5%)</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {totalBonusEarned.toFixed(2)} <span className="text-xs font-bold text-slate-400">MZN</span>
          </div>
          <span className="text-[10px] text-slate-500">Disponível na sua carteira</span>
        </div>
      </div>

      {/* Step by Step Guide */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Como Funciona o Bónus de Convite de 5%?</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-1.5">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center">
              1
            </div>
            <h4 className="text-xs font-bold text-white">Partilhe o seu Link</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Envie o seu link ou código de convite via WhatsApp, redes sociais ou boca-a-boca para os seus amigos.
            </p>
          </div>

          <div className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-1.5">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center">
              2
            </div>
            <h4 className="text-xs font-bold text-white">O Amigo Regista-se</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              O seu amigo abre a conta gratuita na ZONABET e o seu código fica associado à conta dele para sempre.
            </p>
          </div>

          <div className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-1.5">
            <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold text-xs flex items-center justify-center">
              3
            </div>
            <h4 className="text-xs font-bold text-amber-300">Receba 5% a Cada Depósito</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Sempre que o seu amigo carregar a conta (via e-Mola ou outro método), você recebe 5% do valor na hora!
            </p>
          </div>
        </div>
      </div>

      {/* Lista de Amigos Convidados */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              <span>Histórico de Amigos Convidados ({totalInvited})</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Acompanhe os amigos que se registaram com o seu código e o bónus acumulado gerado por cada um.
            </p>
          </div>
        </div>

        {(!referralData?.invitedUsers || referralData.invitedUsers.length === 0) ? (
          <div className="text-center py-10 px-4 bg-slate-950/50 rounded-xl border border-slate-800/80">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-3">
              <Gift className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-white mb-1">Ainda não tem convidados registados</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
              Comece agora a partilhar o seu código <strong className="text-emerald-400">{userReferralCode}</strong> e ganhe 5% de bónus no primeiro depósito de cada amigo!
            </p>
            <button
              onClick={shareOnWhatsApp}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Convidar Primeiro Amigo</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Amigo / Utilizador</th>
                  <th className="py-3 px-4">Celular</th>
                  <th className="py-3 px-4">Data de Registo</th>
                  <th className="py-3 px-4 text-center">Depósitos Feitos</th>
                  <th className="py-3 px-4 text-right">Bónus 5% Gerado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {referralData.invitedUsers.map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-white">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs">
                          {(inv.invitedUserName || 'A').charAt(0).toUpperCase()}
                        </div>
                        <span>{inv.invitedUserName || 'Apostador Convidado'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {inv.invitedUserPhone || '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {new Date(inv.createdAt).toLocaleDateString('pt-MZ', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-slate-300">
                      {inv.depositsCount || 0}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-bold text-emerald-400 font-mono">
                        +{Number(inv.totalBonusEarned || 0).toFixed(2)} MZN
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
