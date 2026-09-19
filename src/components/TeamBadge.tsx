import React from 'react';

// Generates high quality stylized club badge shields matching Mozambican clubs
export const TeamBadge: React.FC<{ teamName: string; className?: string }> = ({
  teamName,
  className = 'w-9 h-9',
}) => {
  const name = teamName.toLowerCase();

  // Custom emblem definitions for iconic clubs
  if (name.includes('black bulls')) {
    // Black Bulls: Black shield with bull horn emblem and star
    return (
      <div className={`${className} shrink-0 rounded-xl bg-slate-950 border border-slate-700 flex items-center justify-center p-1 shadow-sm`}>
        <svg viewBox="0 0 36 36" className="w-full h-full">
          <path d="M18 2 L32 7 V19 C32 27 18 34 18 34 C18 34 4 27 4 19 V7 Z" fill="#090d16" stroke="#f1f5f9" strokeWidth="2" />
          {/* Bull head / horns */}
          <path d="M10 13 C12 8 16 10 18 13 C20 10 24 8 26 13 C26 18 22 21 18 25 C14 21 10 18 10 13 Z" fill="#e2e8f0" />
          <circle cx="15" cy="16" r="1.5" fill="#090d16" />
          <circle cx="21" cy="16" r="1.5" fill="#090d16" />
        </svg>
      </div>
    );
  }

  if (name.includes('ferroviário de maputo') || name.includes('fer. maputo')) {
    // Ferroviário de Maputo: Green and Gold locomotive shield
    return (
      <div className={`${className} shrink-0 rounded-xl bg-slate-900 border border-emerald-500/40 flex items-center justify-center p-1 shadow-sm`}>
        <svg viewBox="0 0 36 36" className="w-full h-full">
          <path d="M18 2 L32 7 V19 C32 27 18 34 18 34 C18 34 4 27 4 19 V7 Z" fill="#047857" stroke="#eab308" strokeWidth="2" />
          {/* Train / CFM emblem */}
          <rect x="12" y="10" width="12" height="12" rx="2" fill="#eab308" />
          <circle cx="15" cy="14" r="1.5" fill="#047857" />
          <circle cx="21" cy="14" r="1.5" fill="#047857" />
          <circle cx="18" cy="26" r="3" fill="#eab308" />
        </svg>
      </div>
    );
  }

  if (name.includes('costa do sol')) {
    // Costa do Sol: Canary Yellow shield with sun & green palm
    return (
      <div className={`${className} shrink-0 rounded-xl bg-slate-900 border border-amber-500/40 flex items-center justify-center p-1 shadow-sm`}>
        <svg viewBox="0 0 36 36" className="w-full h-full">
          <path d="M18 2 L32 7 V19 C32 27 18 34 18 34 C18 34 4 27 4 19 V7 Z" fill="#ca8a04" stroke="#16a34a" strokeWidth="2" />
          {/* Radiant Sun */}
          <circle cx="18" cy="16" r="5" fill="#fef08a" />
          <path d="M18 8 V10 M18 22 V24 M10 16 H12 M24 16 H26 M12 10 L14 12 M22 20 L24 22 M12 22 L14 20 M22 12 L24 10" stroke="#fef08a" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  if (name.includes('desportivo de nacala') || name.includes('desp. nacala')) {
    // Desportivo de Nacala: Cyan / Blue anchor and maritime shield
    return (
      <div className={`${className} shrink-0 rounded-xl bg-slate-900 border border-sky-500/40 flex items-center justify-center p-1 shadow-sm`}>
        <svg viewBox="0 0 36 36" className="w-full h-full">
          <path d="M18 2 L32 7 V19 C32 27 18 34 18 34 C18 34 4 27 4 19 V7 Z" fill="#0284c7" stroke="#38bdf8" strokeWidth="2" />
          {/* Maritime / Star symbol */}
          <circle cx="18" cy="12" r="3" fill="#ffffff" />
          <path d="M18 15 V25 M12 21 C14 25 22 25 24 21" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" fill="none" />
        </svg>
      </div>
    );
  }

  if (name.includes('angoche')) {
    // Angoche FC: Sky blue ocean & dhow emblem
    return (
      <div className={`${className} shrink-0 rounded-xl bg-slate-900 border border-sky-400/40 flex items-center justify-center p-1 shadow-sm`}>
        <svg viewBox="0 0 36 36" className="w-full h-full">
          <path d="M18 2 L32 7 V19 C32 27 18 34 18 34 C18 34 4 27 4 19 V7 Z" fill="#0369a1" stroke="#bae6fd" strokeWidth="2" />
          <path d="M18 8 L25 20 H18 Z" fill="#ffffff" />
          <path d="M11 22 C14 24 22 24 25 22" stroke="#ffffff" strokeWidth="2" fill="none" />
        </svg>
      </div>
    );
  }

  if (name.includes('mecuburi')) {
    // Mecuburi FC: Red and Black warrior shield
    return (
      <div className={`${className} shrink-0 rounded-xl bg-slate-900 border border-rose-500/40 flex items-center justify-center p-1 shadow-sm`}>
        <svg viewBox="0 0 36 36" className="w-full h-full">
          <path d="M18 2 L32 7 V19 C32 27 18 34 18 34 C18 34 4 27 4 19 V7 Z" fill="#991b1b" stroke="#000000" strokeWidth="2" />
          <path d="M18 2 V34" stroke="#000000" strokeWidth="2" />
          <polygon points="18,10 21,17 28,17 22,21 24,28 18,24 12,28 14,21 8,17 15,17" fill="#fbbf24" />
        </svg>
      </div>
    );
  }

  if (name.includes('estrela vermelha')) {
    // Estrela Vermelha: Pure Crimson shield with bright white five-pointed star
    return (
      <div className={`${className} shrink-0 rounded-xl bg-slate-900 border border-rose-500/40 flex items-center justify-center p-1 shadow-sm`}>
        <svg viewBox="0 0 36 36" className="w-full h-full">
          <path d="M18 2 L32 7 V19 C32 27 18 34 18 34 C18 34 4 27 4 19 V7 Z" fill="#b91c1c" stroke="#fecaca" strokeWidth="2" />
          <polygon points="18,8 21,15 28,15 22,19 24,26 18,22 12,26 14,19 8,15 15,15" fill="#ffffff" />
        </svg>
      </div>
    );
  }

  if (name.includes('união de beira') || name.includes('uniao da beira') || name.includes('união da beira')) {
    // União da Beira: Royal blue and white roundel
    return (
      <div className={`${className} shrink-0 rounded-xl bg-slate-900 border border-blue-500/40 flex items-center justify-center p-1 shadow-sm`}>
        <svg viewBox="0 0 36 36" className="w-full h-full">
          <circle cx="18" cy="18" r="15" fill="#1d4ed8" stroke="#ffffff" strokeWidth="2" />
          <circle cx="18" cy="18" r="10" fill="#2563eb" stroke="#93c5fd" strokeWidth="1" />
          <path d="M14 14 L18 22 L22 14" stroke="#ffffff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  if (name.includes('ferroviário da beira') || name.includes('fer. beira')) {
    // Ferroviário da Beira: Iconic Green and White vertical stripes with Locomotive logo
    return (
      <div className={`${className} shrink-0 rounded-xl bg-slate-900 border border-emerald-500/40 flex items-center justify-center p-1 shadow-sm`}>
        <svg viewBox="0 0 36 36" className="w-full h-full">
          <defs>
            <clipPath id="beiraShield">
              <path d="M18 2 L32 7 V19 C32 27 18 34 18 34 C18 34 4 27 4 19 V7 Z" />
            </clipPath>
          </defs>
          <g clipPath="url(#beiraShield)">
            <rect x="0" y="0" width="36" height="36" fill="#047857" />
            <rect x="8" y="0" width="4" height="36" fill="#ffffff" />
            <rect x="16" y="0" width="4" height="36" fill="#ffffff" />
            <rect x="24" y="0" width="4" height="36" fill="#ffffff" />
            <circle cx="18" cy="18" r="6" fill="#064e3b" stroke="#ffffff" strokeWidth="1.5" />
            <circle cx="18" cy="18" r="3" fill="#34d399" />
          </g>
          <path d="M18 2 L32 7 V19 C32 27 18 34 18 34 C18 34 4 27 4 19 V7 Z" fill="none" stroke="#34d399" strokeWidth="2" />
        </svg>
      </div>
    );
  }

  if (name.includes('chibuto')) {
    // Clube de Chibuto: Amber / Golden Lion shield
    return (
      <div className={`${className} shrink-0 rounded-xl bg-slate-900 border border-amber-500/40 flex items-center justify-center p-1 shadow-sm`}>
        <svg viewBox="0 0 36 36" className="w-full h-full">
          <path d="M18 2 L32 7 V19 C32 27 18 34 18 34 C18 34 4 27 4 19 V7 Z" fill="#d97706" stroke="#fef08a" strokeWidth="2" />
          <circle cx="18" cy="16" r="6" fill="#b45309" stroke="#fef08a" strokeWidth="1" />
          <polygon points="18,13 19,16 22,16 20,18 21,21 18,19 15,21 16,18 14,16 17,16" fill="#fef08a" />
        </svg>
      </div>
    );
  }

  if (name.includes('songo') || name.includes('ud songo')) {
    // UD Songo: Hydroelectric blue and gold shield
    return (
      <div className={`${className} shrink-0 rounded-xl bg-slate-900 border border-sky-500/40 flex items-center justify-center p-1 shadow-sm`}>
        <svg viewBox="0 0 36 36" className="w-full h-full">
          <path d="M18 2 L32 7 V19 C32 27 18 34 18 34 C18 34 4 27 4 19 V7 Z" fill="#0369a1" stroke="#f59e0b" strokeWidth="2" />
          <path d="M18 10 L24 22 H12 Z" fill="#f59e0b" />
        </svg>
      </div>
    );
  }

  if (name.includes('muanza')) {
    // Ferroviário / Desportivo de Muanza: Forest Green & Timber shield
    const isFer = name.includes('ferroviário');
    return (
      <div className={`${className} shrink-0 rounded-xl bg-slate-900 border border-emerald-500/40 flex items-center justify-center p-1 shadow-sm`}>
        <svg viewBox="0 0 36 36" className="w-full h-full">
          <path d="M18 2 L32 7 V19 C32 27 18 34 18 34 C18 34 4 27 4 19 V7 Z" fill={isFer ? '#065f46' : '#047857'} stroke="#34d399" strokeWidth="2" />
          <rect x="12" y="12" width="12" height="12" rx="2" fill="#34d399" />
          <text x="18" y="21" textAnchor="middle" fill="#064e3b" fontSize="8" fontWeight="900">MZ</text>
        </svg>
      </div>
    );
  }

  if (name.includes('inhaminga') || name.includes('cheringoma')) {
    // Águias de Inhaminga / UD Cheringoma: Golden eagle shield
    return (
      <div className={`${className} shrink-0 rounded-xl bg-slate-900 border border-amber-500/40 flex items-center justify-center p-1 shadow-sm`}>
        <svg viewBox="0 0 36 36" className="w-full h-full">
          <path d="M18 2 L32 7 V19 C32 27 18 34 18 34 C18 34 4 27 4 19 V7 Z" fill="#78350f" stroke="#fbbf24" strokeWidth="2" />
          <polygon points="18,10 22,18 28,14 24,24 18,21 12,24 8,14 14,18" fill="#fbbf24" />
        </svg>
      </div>
    );
  }

  // Dynamic fallback shield with team initials and harmonic colors based on name hash
  const colors = [
    { bg: '#047857', border: '#34d399', text: '#ffffff' },
    { bg: '#0284c7', border: '#38bdf8', text: '#ffffff' },
    { bg: '#b91c1c', border: '#f87171', text: '#ffffff' },
    { bg: '#d97706', border: '#fbbf24', text: '#ffffff' },
    { bg: '#4f46e5', border: '#818cf8', text: '#ffffff' },
    { bg: '#0f172a', border: '#475569', text: '#ffffff' },
  ];
  let hash = 0;
  for (let i = 0; i < teamName.length; i++) {
    hash = teamName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = colors[Math.abs(hash) % colors.length];

  const words = teamName.split(' ').filter(Boolean);
  const initials = words.length > 1 ? (words[0][0] + words[1][0]).toUpperCase() : teamName.slice(0, 2).toUpperCase();

  return (
    <div className={`${className} shrink-0 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-center p-1 shadow-sm`}>
      <svg viewBox="0 0 36 36" className="w-full h-full">
        <path d="M18 2 L32 7 V19 C32 27 18 34 18 34 C18 34 4 27 4 19 V7 Z" fill={color.bg} stroke={color.border} strokeWidth="2" />
        <text x="18" y="21" textAnchor="middle" fill={color.text} fontSize="11" fontWeight="900" fontFamily="sans-serif">
          {initials}
        </text>
      </svg>
    </div>
  );
};
