import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Smartphone, Download, X, Share } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // If already running as an installed PWA or manually dismissed, hide the UI
  if (isInstalled || dismissed) {
    return null;
  }

  return (
    <AnimatePresence>
      {(isInstallable || isIOS) && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-20 left-4 right-4 z-50 md:bottom-6 md:right-6 md:left-auto md:w-80"
        >
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 shadow-2xl flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Instalar ZONABET</h3>
                  <p className="text-[10px] text-slate-400">Acesse mais rápido e jogue sem interrupções.</p>
                </div>
              </div>
              <button 
                onClick={() => setDismissed(true)}
                className="p-1 text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isInstallable ? (
              <button
                onClick={install}
                className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/20"
              >
                <Download className="w-4 h-4" />
                <span>INSTALAR AGORA</span>
              </button>
            ) : isIOS ? (
              <button
                onClick={() => setShowIOSGuide(true)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-black rounded-xl flex items-center justify-center gap-2 border border-slate-700 transition-all"
              >
                <Download className="w-4 h-4 text-cyan-400" />
                <span>INSTALAR NO IPHONE</span>
              </button>
            ) : null}
          </div>
        </motion.div>
      )}

      {showIOSGuide && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
        >
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-white">Instalar no iOS</h3>
              <button onClick={() => setShowIOSGuide(false)} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0">1</div>
                <p className="text-sm text-slate-300">
                  Toque no botão de <strong>Compartilhar</strong> <Share className="w-4 h-4 inline text-cyan-400" /> na barra do Safari.
                </p>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0">2</div>
                <p className="text-sm text-slate-300">
                  Role para baixo e selecione <strong>Adicionar ao Ecrã Principal</strong>.
                </p>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl transition-all mt-4 shadow-lg shadow-cyan-500/20"
              >
                ENTENDI
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
