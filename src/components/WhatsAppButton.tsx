import React, { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { SystemSettings } from '../types.ts';

interface WhatsAppButtonProps {
  settings?: SystemSettings['whatsapp'];
}

export const WhatsAppButton: React.FC<WhatsAppButtonProps> = ({ settings }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (settings && !settings.enabled) {
    return null;
  }

  const phone = settings?.phone || '+258872344381';
  const cleanPhone = phone.replace(/\D/g, '');
  const defaultMessage =
    settings?.message || 'Olá ZONABET! Preciso de apoio com a minha conta ou aposta.';
  const buttonText = settings?.buttonText || 'Apoio WhatsApp';
  const position = settings?.position || 'bottom-right';

  const positionClasses =
    position === 'bottom-left'
      ? 'left-4 bottom-20 sm:bottom-6'
      : 'right-4 bottom-20 sm:bottom-6';

  const handleOpenWhatsApp = (customMsg?: string) => {
    const text = encodeURIComponent(customMsg || defaultMessage);
    const url = `https://wa.me/${cleanPhone}?text=${text}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className={`fixed ${positionClasses} z-50 flex flex-col items-end gap-2`}>
      {/* Popover Card */}
      {isOpen && (
        <div className="w-72 p-4 bg-slate-900 border border-emerald-500/50 rounded-2xl shadow-2xl space-y-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <MessageCircle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-white">Suporte ZONABET</h4>
                <p className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Online no WhatsApp
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-slate-300">
            Dúvidas sobre depósitos e-Mola, levantamentos ou regras das apostas? Fale diretamente com nossa equipa!
          </p>

          <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700 text-[11px] font-mono text-emerald-300">
            {phone}
          </div>

          <button
            onClick={() => handleOpenWhatsApp()}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Iniciar Conversa</span>
          </button>
        </div>
      )}

      {/* Main Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center gap-2 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 border border-emerald-400/40"
        title="Falar no WhatsApp"
      >
        <div className="relative">
          <MessageCircle className="w-5 h-5" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-300 rounded-full animate-ping" />
        </div>
        <span className="text-xs font-black tracking-wide hidden sm:inline">{buttonText}</span>
      </button>
    </div>
  );
};
