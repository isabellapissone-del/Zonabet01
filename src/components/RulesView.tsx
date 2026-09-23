import React from 'react';
import { Shield, Book, ChevronRight, Scale, Info, AlertTriangle, HelpCircle } from 'lucide-react';

export const RulesView: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 text-center space-y-4">
        <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto border border-emerald-500/20">
          <Book className="w-8 h-8 text-emerald-400" />
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">Regulamento Oficial de Apostas</h1>
        <p className="text-slate-400 max-w-2xl mx-auto text-sm leading-relaxed">
          Bem-vindo ao regulamento oficial da <span className="text-emerald-400 font-bold">ZONABET</span>. 
          Estas regras estabelecem os termos claros para participação, liquidação de apostas e conduta na nossa plataforma.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <span className="px-3 py-1 bg-slate-800 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest border border-slate-700">
            Versão 1.0
          </span>
          <span className="px-3 py-1 bg-emerald-500/10 rounded-full text-[10px] font-black text-emerald-400 uppercase tracking-widest border border-emerald-500/20">
            Atualizado em Setembro 2026
          </span>
        </div>
      </div>

      {/* Main Content Sections */}
      <div className="space-y-6">
        
        {/* Chapter I */}
        <section className="bg-slate-900/40 border border-slate-800/60 rounded-2xl overflow-hidden">
          <div className="bg-slate-800/50 px-6 py-4 border-b border-slate-700/50 flex items-center gap-3">
            <Scale className="w-5 h-5 text-emerald-400" />
            <h2 className="font-black text-white uppercase tracking-wider text-sm">Capítulo I — Disposições Gerais</h2>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-emerald-400 font-black text-xs uppercase mb-3 flex items-center gap-2">
                <ChevronRight className="w-3 h-3" /> Artigo 1.º — Objeto
              </h3>
              <div className="text-slate-300 text-sm leading-relaxed space-y-2">
                <p>1. O presente Regulamento estabelece as regras aplicáveis às apostas realizadas na ZONABET.</p>
                <p>2. O Regulamento define mercados, funcionamento de odds, aceitação, liquidação, procedimentos administrativos e auditoria.</p>
              </div>
            </div>

            <div>
              <h3 className="text-emerald-400 font-black text-xs uppercase mb-3 flex items-center gap-2">
                <ChevronRight className="w-3 h-3" /> Artigo 2.º — Aceitação
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Ao utilizar a plataforma e realizar uma aposta, o utilizador aceita integralmente estas regras. É dever do utilizador consultar as regras do mercado antes de confirmar a aposta.
              </p>
            </div>

            <div>
              <h3 className="text-emerald-400 font-black text-xs uppercase mb-3 flex items-center gap-2">
                <ChevronRight className="w-3 h-3" /> Artigo 3.º — Elegibilidade
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                A ZONABET é estritamente para maiores de <span className="text-white font-bold">18 anos</span>. Reservamo-nos o direito de solicitar documentos para verificação de identidade e idade.
              </p>
            </div>
          </div>
        </section>

        {/* Chapter II & III */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Info className="w-5 h-5 text-cyan-400" />
              <h2 className="font-black text-white uppercase tracking-wider text-sm">Capítulo II — Jogos</h2>
            </div>
            <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
              <p>Os jogos e resultados são administrados <span className="text-white font-bold">manualmente</span> por nossa equipe oficial. Não utilizamos APIs externas para garantir a integridade dos dados locais.</p>
              <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Estados do Jogo:</span>
                <div className="flex flex-wrap gap-2">
                  {['AGENDADO', 'SUSPENSO', 'CANCELADO', 'FINALIZADO'].map(s => (
                    <span key={s} className="px-2 py-0.5 bg-slate-800 rounded text-[9px] font-bold text-slate-400">{s}</span>
                  ))}
                </div>
              </div>
              <p className="text-xs text-amber-400 flex items-start gap-2 bg-amber-500/5 p-3 rounded-xl border border-amber-500/10">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>A ZONABET não opera apostas "Ao Vivo" (Live). Um jogo agendado não se transforma em live após o início.</span>
              </p>
            </div>
          </section>

          <section className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-5 h-5 text-emerald-400" />
              <h2 className="font-black text-white uppercase tracking-wider text-sm">Capítulo III — Odds</h2>
            </div>
            <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
              <p>As odds são inseridas manualmente. O sistema registra a odd exata no momento da confirmação da aposta. Alterações posteriores não afetam bilhetes já emitidos.</p>
              <ul className="space-y-2 list-disc list-inside text-xs">
                <li>Registro permanente da odd no bilhete.</li>
                <li>Suspensão temporária permitida.</li>
                <li>Ações de suspensão registradas em auditoria.</li>
              </ul>
            </div>
          </section>
        </div>

        {/* Chapter V — Mercados */}
        <section className="bg-slate-900/40 border border-slate-800/60 rounded-2xl overflow-hidden">
          <div className="bg-slate-800/50 px-6 py-4 border-b border-slate-700/50 flex items-center gap-3">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="font-black text-white uppercase tracking-wider text-sm">Capítulo V — Mercados</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="space-y-3">
                <h3 className="text-white font-bold text-sm">Resultado Final (1X2)</h3>
                <p className="text-slate-400 text-xs leading-relaxed">Considera-se o resultado após os 90 minutos regulamentares mais tempo de compensação. Prolongamento e penáltis não contam.</p>
              </div>
              <div className="space-y-3">
                <h3 className="text-white font-bold text-sm">Mais/Menos (Over/Under)</h3>
                <p className="text-slate-400 text-xs leading-relaxed">Aposta no total de golos superior ou inferior ao limite. Ex: Menos de 2.5 ganha se houver 0, 1 ou 2 golos.</p>
              </div>
              <div className="space-y-3">
                <h3 className="text-white font-bold text-sm">Ambas Marcam</h3>
                <p className="text-slate-400 text-xs leading-relaxed">SIM: Ambas as equipas marcam. NÃO: Pelo menos uma equipa termina a zero.</p>
              </div>
              <div className="space-y-3">
                <h3 className="text-white font-bold text-sm">Resultado Correto (Correct Score)</h3>
                <p className="text-slate-400 text-xs leading-relaxed">Aposta no placar exato do jogo. As opções são geradas automaticamente, mas as odds são geridas administrativamente.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Chapter VII & VIII — Adiados/Cancelados */}
        <section className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <HelpCircle className="w-5 h-5 text-rose-400" />
            <h2 className="font-black text-white uppercase tracking-wider text-sm">Interrupções e Cancelamentos</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs leading-relaxed text-slate-400">
            <div className="space-y-2">
              <span className="text-white font-bold uppercase block text-[10px]">Jogo Adiado</span>
              <p>As apostas permanecem pendentes enquanto o jogo for considerado válido. Se realizado em nova data definida, as apostas seguem vigentes.</p>
            </div>
            <div className="space-y-2">
              <span className="text-white font-bold uppercase block text-[10px]">Jogo Cancelado</span>
              <p>Se o jogo for definitivamente cancelado, as apostas são <span className="text-rose-400 font-bold underline">ANULADAS</span> e o valor é devolvido ao saldo do utilizador.</p>
            </div>
            <div className="space-y-2">
              <span className="text-white font-bold uppercase block text-[10px]">Falta de Comparência (W.O.)</span>
              <p>Decisões administrativas de W.O. resultam em apostas anuladas. Não liquidamos resultados de secretaria como vitórias desportivas.</p>
            </div>
          </div>
        </section>

        {/* Financial Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <WalletIcon className="w-5 h-5 text-emerald-400" />
              <h2 className="font-black text-white uppercase tracking-wider text-sm">Depósitos (e-Mola)</h2>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed mb-4">
              O método oficial é o e-Mola. O utilizador deve enviar o comprovativo que será validado manualmente pela nossa equipe financeira. O saldo é creditado apenas após aprovação.
            </p>
          </section>

          <section className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <LogOut className="w-5 h-5 text-cyan-400 rotate-180" />
              <h2 className="font-black text-white uppercase tracking-wider text-sm">Levantamentos</h2>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed mb-4">
              Solicitações de levantamento passam por análise administrativa. Reservamo-nos o direito de rejeitar pedidos em caso de inconsistência ou suspeita de fraude.
            </p>
          </section>
        </div>

        {/* Responsible Gaming & Fraud */}
        <section className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-rose-500" />
            <h2 className="font-black text-rose-500 uppercase tracking-wider text-sm">Jogo Responsável e Fraude</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs leading-relaxed text-slate-400">
            <div className="space-y-2">
              <p>A ZONABET proíbe terminantemente o uso de contas de terceiros, identidades falsas ou manipulação de comprovativos.</p>
              <p>Qualquer tentativa de fraude resultará no bloqueio imediato da conta e suspensão de pagamentos.</p>
            </div>
            <div className="space-y-2">
              <p>Aposte com moderação. O jogo deve ser uma forma de entretenimento, não uma fonte de rendimento.</p>
              <p>Proibido para menores de 18 anos. Todas as ações administrativas são <span className="text-white font-bold italic underline">AUDITADAS</span>.</p>
            </div>
          </div>
        </section>

      </div>

      {/* Footer Notice */}
      <div className="text-center pb-12">
        <p className="text-slate-500 text-[10px] font-medium uppercase tracking-widest">
          © 2026 ZONABET Moçambique • Regulamento Geral v1.0
        </p>
      </div>
    </div>
  );
};
