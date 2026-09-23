import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  Image as ImageIcon, 
  Clipboard, 
  X, 
  Search, 
  CheckCircle, 
  AlertTriangle, 
  Edit2, 
  RefreshCw,
  Trophy,
  Calendar,
  Clock,
  MapPin,
  Check,
  ChevronRight,
  PlusCircle,
  AlertCircle,
  Sparkles,
  ArrowLeft,
  Loader2,
  Trash2,
  ExternalLink
} from 'lucide-react';
import { Match, Competition, Team } from '../../types.ts';
import { TeamBadge } from '../TeamBadge.tsx';
import { api } from '../../api.ts';

interface AdminImportImageViewProps {
  matches: Match[];
  competitions: Competition[];
  onMatchesImported?: () => void;
  onClose?: () => void;
}

interface ExtractedMatch {
  tempId: string;
  competitionName: string;
  homeTeam: string;
  awayTeam: string;
  kickoffDate: string;
  kickoffTime: string;
  stadium?: string;
  round?: string;
  
  // Validation/Matching states
  matchedCompetitionId?: string;
  matchedHomeTeam?: Team;
  matchedAwayTeam?: Team;
  
  status: 'pending' | 'validated' | 'duplicate' | 'error';
  isSelected: boolean;
  errorMessage?: string;
}

type ImportStep = 'upload' | 'review' | 'final_review' | 'processing' | 'result';

export const AdminImportImageView: React.FC<AdminImportImageViewProps> = ({ 
  matches: existingMatches, 
  competitions, 
  onMatchesImported,
  onClose
}) => {
  const [step, setStep] = useState<ImportStep>('upload');
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [extractedMatches, setExtractedMatches] = useState<ExtractedMatch[]>([]);
  const [editingMatch, setEditingMatch] = useState<ExtractedMatch | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isCreatingTeam, setIsCreatingTeam] = useState<{ side: 'home' | 'away', matchId: string } | null>(null);
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: number;
    duplicates: number;
    errors: string[];
  } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch teams on mount
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const response = await api.getTeams();
        setTeams(response.teams);
      } catch (err) {
        console.error('Error fetching teams:', err);
      }
    };
    fetchTeams();
  }, []);

  // Handle paste events
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (step !== 'upload') return;
      const items = e.clipboardData?.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            if (blob) {
              const reader = new FileReader();
              reader.onload = (event) => {
                setImage(event.target?.result as string);
                setExtractedMatches([]);
                setError(null);
              };
              reader.readAsDataURL(blob);
            }
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [step]);

  const findBestTeamMatch = (name: string, teamsList: Team[]) => {
    if (!name) return undefined;
    const cleanName = name.toLowerCase().trim();
    
    // 1. Exact match
    let match = teamsList.find(t => t.name.toLowerCase() === cleanName);
    if (match) return match;
    
    // 2. Short name match
    match = teamsList.find(t => t.shortName?.toLowerCase() === cleanName);
    if (match) return match;
    
    // 3. Contains match
    match = teamsList.find(t => 
      t.name.toLowerCase().includes(cleanName) || 
      cleanName.includes(t.name.toLowerCase())
    );
    return match;
  };

  const checkDuplicate = (m: ExtractedMatch) => {
    return existingMatches.some(existing => 
      existing.homeTeam.toLowerCase() === m.homeTeam.toLowerCase() &&
      existing.awayTeam.toLowerCase() === m.awayTeam.toLowerCase() &&
      existing.kickoffDate === m.kickoffDate &&
      existing.competitionId === m.matchedCompetitionId
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target?.result as string);
        setExtractedMatches([]);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target?.result as string);
        setExtractedMatches([]);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async () => {
    if (!image) return;
    
    setAnalyzing(true);
    setError(null);
    try {
      const response = await api.analyzeMatchImage(image);
      
      if (response.matches && response.matches.length > 0) {
        const matches: ExtractedMatch[] = response.matches.map((m: any, index: number) => {
          // Attempt to match competition
          const matchedComp = competitions.find(c => 
            c.name.toLowerCase().includes(m.competition?.toLowerCase() || '') ||
            (m.competition || '').toLowerCase().includes(c.name.toLowerCase())
          );
          
          const matchedHome = findBestTeamMatch(m.homeTeam, teams);
          const matchedAway = findBestTeamMatch(m.awayTeam, teams);
          
          const tempMatch: ExtractedMatch = {
            tempId: `temp-${Date.now()}-${index}`,
            competitionName: matchedComp?.name || m.competition || 'Não identificado',
            homeTeam: matchedHome?.name || m.homeTeam || 'Não identificado',
            awayTeam: matchedAway?.name || m.awayTeam || 'Não identificado',
            kickoffDate: m.date || new Date().toISOString().split('T')[0],
            kickoffTime: m.time || '15:00',
            stadium: m.stadium,
            round: m.round,
            matchedCompetitionId: matchedComp?.id,
            matchedHomeTeam: matchedHome,
            matchedAwayTeam: matchedAway,
            status: 'pending',
            isSelected: true
          };

          if (checkDuplicate(tempMatch)) {
            tempMatch.status = 'duplicate';
          }

          return tempMatch;
        });
        setExtractedMatches(matches);
        setStep('review');
      } else {
        setError('Nenhuma partida foi identificada nesta imagem. Tente uma imagem mais nítida.');
      }
    } catch (err: any) {
      console.error('Error analyzing image:', err);
      setError('Não foi possível analisar esta imagem. Verifique a sua ligação e tente novamente.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleToggleSelectAll = () => {
    const allSelected = extractedMatches.every(m => m.isSelected);
    setExtractedMatches(extractedMatches.map(m => ({ ...m, isSelected: !allSelected })));
  };

  const handleToggleSelect = (tempId: string) => {
    setExtractedMatches(extractedMatches.map(m => 
      m.tempId === tempId ? { ...m, isSelected: !m.isSelected } : m
    ));
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMatch) return;
    
    // Refresh matching logic when saving edits
    const matchedComp = competitions.find(c => c.id === editingMatch.matchedCompetitionId);
    const matchedHome = findBestTeamMatch(editingMatch.homeTeam, teams);
    const matchedAway = findBestTeamMatch(editingMatch.awayTeam, teams);

    const updatedMatch: ExtractedMatch = {
      ...editingMatch,
      competitionName: matchedComp?.name || editingMatch.competitionName,
      homeTeam: matchedHome?.name || editingMatch.homeTeam,
      awayTeam: matchedAway?.name || editingMatch.awayTeam,
      matchedHomeTeam: matchedHome,
      matchedAwayTeam: matchedAway,
    };

    if (checkDuplicate(updatedMatch)) {
      updatedMatch.status = 'duplicate';
    } else {
      updatedMatch.status = 'pending';
    }
    
    setExtractedMatches(extractedMatches.map(m => 
      m.tempId === updatedMatch.tempId ? updatedMatch : m
    ));
    setEditingMatch(null);
  };

  const handleConfirmImport = async () => {
    const selectedMatches = extractedMatches.filter(m => m.isSelected);
    if (selectedMatches.length === 0) return;

    setStep('processing');
    
    const results = {
      success: 0,
      failed: 0,
      duplicates: 0,
      errors: [] as string[]
    };

    for (const m of selectedMatches) {
      // Final validations
      if (!m.matchedCompetitionId || !m.homeTeam || !m.awayTeam || !m.kickoffDate || !m.kickoffTime) {
        results.failed++;
        results.errors.push(`${m.homeTeam} vs ${m.awayTeam}: Dados incompletos.`);
        continue;
      }

      if (m.homeTeam === m.awayTeam) {
        results.failed++;
        results.errors.push(`${m.homeTeam} vs ${m.awayTeam}: Equipa casa e visitante são iguais.`);
        continue;
      }

      if (checkDuplicate(m)) {
        results.duplicates++;
        continue;
      }

      try {
        await api.createMatch({
          competitionId: m.matchedCompetitionId,
          homeTeam: m.homeTeam,
          awayTeam: m.awayTeam,
          kickoffDate: m.kickoffDate,
          kickoffTime: m.kickoffTime,
          description: m.competitionName,
          odds: { home: 1.01, draw: 1.01, away: 1.01 } // Default odds as per requirement (odds are manual)
        });
        results.success++;
      } catch (err: any) {
        results.failed++;
        results.errors.push(`${m.homeTeam} vs ${m.awayTeam}: ${err.message}`);
      }
    }

    setImportResults(results);
    setStep('result');
    if (onMatchesImported) onMatchesImported();
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCreatingTeam) return;

    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const name = formData.get('name') as string;
    const shortName = formData.get('shortName') as string;

    try {
      const response = await api.createTeam({ name, shortName });
      const newTeam = response.team;
      const updatedTeams = [...teams, newTeam];
      setTeams(updatedTeams);
      
      // Update the match that triggered this
      setExtractedMatches(prev => prev.map(m => {
        if (m.tempId === isCreatingTeam.matchId) {
          const matchedHome = isCreatingTeam.side === 'home' ? newTeam : m.matchedHomeTeam;
          const matchedAway = isCreatingTeam.side === 'away' ? newTeam : m.matchedAwayTeam;
          return {
            ...m,
            homeTeam: matchedHome?.name || m.homeTeam,
            awayTeam: matchedAway?.name || m.awayTeam,
            matchedHomeTeam: matchedHome,
            matchedAwayTeam: matchedAway
          };
        }
        return m;
      }));
      
      setIsCreatingTeam(null);
    } catch (err: any) {
      alert(`Erro ao criar equipa: ${err.message}`);
    }
  };

  if (step === 'processing') {
    return (
      <div className="bg-slate-900/50 border border-slate-700/50 rounded-3xl p-12 flex flex-col items-center justify-center gap-6 animate-pulse">
        <Loader2 className="w-16 h-16 text-cyan-500 animate-spin" />
        <div className="text-center">
          <h3 className="text-xl font-black text-white">Cadastrando partidas...</h3>
          <p className="text-slate-400 mt-2">Por favor aguarde, estamos processando os dados.</p>
        </div>
      </div>
    );
  }

  if (step === 'result' && importResults) {
    return (
      <div className="bg-slate-900/50 border border-slate-700/50 rounded-3xl p-8 animate-in zoom-in-95 duration-300">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-white">Importação Concluída</h3>
            <p className="text-slate-400">Resumo da operação realizada pelo sistema.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Cadastradas</p>
            <p className="text-2xl font-black text-emerald-400">{importResults.success}</p>
          </div>
          <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Falhas</p>
            <p className="text-2xl font-black text-rose-400">{importResults.failed}</p>
          </div>
          <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Duplicadas</p>
            <p className="text-2xl font-black text-amber-400">{importResults.duplicates}</p>
          </div>
          <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Ignoradas</p>
            <p className="text-2xl font-black text-slate-400">
              {extractedMatches.length - (importResults.success + importResults.failed + importResults.duplicates)}
            </p>
          </div>
        </div>

        {importResults.errors.length > 0 && (
          <div className="mb-8 space-y-3">
            <h4 className="text-sm font-black text-rose-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Erros Encontrados
            </h4>
            <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-4 max-h-40 overflow-y-auto">
              {importResults.errors.map((err, i) => (
                <p key={i} className="text-xs text-rose-300 py-1 border-b border-rose-500/10 last:border-0">{err}</p>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => {
              setStep('upload');
              setImage(null);
              setExtractedMatches([]);
              setImportResults(null);
            }}
            className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white font-black rounded-2xl border border-slate-700 transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-5 h-5" />
            Nova Importação
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-2xl shadow-xl shadow-cyan-500/20 transition-all flex items-center justify-center gap-2"
          >
            <Trophy className="w-5 h-5" />
            Ver Jogos
          </button>
        </div>
      </div>
    );
  }

  if (isCreatingTeam) {
    const match = extractedMatches.find(m => m.tempId === isCreatingTeam.matchId);
    return (
      <div className="bg-slate-900/50 border border-slate-700/50 rounded-3xl p-8 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black text-white flex items-center gap-3">
            <PlusCircle className="w-6 h-6 text-cyan-400" />
            Cadastrar Nova Equipa
          </h3>
          <button 
            onClick={() => setIsCreatingTeam(null)}
            className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleCreateTeam} className="space-y-6">
          <div className="p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-2xl text-xs text-cyan-300">
            Você está criando uma equipa para a partida: 
            <span className="font-bold block mt-1 text-white">
              {match?.homeTeam} vs {match?.awayTeam}
            </span>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Nome da Equipa</label>
              <input
                name="name"
                type="text"
                required
                defaultValue={isCreatingTeam.side === 'home' ? match?.homeTeam : match?.awayTeam}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 transition-all"
                placeholder="Ex: Ferroviário de Quelimane"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Nome Curto / Abreviação</label>
              <input
                name="shortName"
                type="text"
                maxLength={3}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 transition-all uppercase"
                placeholder="Ex: FQ"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsCreatingTeam(null)}
              className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-8 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl shadow-lg shadow-cyan-500/20 transition-all"
            >
              Cadastrar e Associar
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (editingMatch) {
    return (
      <div className="bg-slate-900/50 border border-slate-700/50 rounded-3xl p-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <Edit2 className="w-5 h-5 text-amber-400" />
            Editar Partida Extraída
          </h3>
          <button 
            onClick={() => setEditingMatch(null)}
            className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSaveEdit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Competição</label>
              <select
                value={editingMatch.matchedCompetitionId || ''}
                onChange={(e) => {
                  setEditingMatch({
                    ...editingMatch,
                    matchedCompetitionId: e.target.value
                  });
                }}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 transition-all"
              >
                <option value="">Selecione uma competição</option>
                {competitions.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Estádio / Local</label>
              <input
                type="text"
                value={editingMatch.stadium || ''}
                onChange={(e) => setEditingMatch({ ...editingMatch, stadium: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 transition-all"
                placeholder="Ex: Estádio do Chiveve"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Equipa da Casa</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editingMatch.homeTeam}
                  onChange={(e) => setEditingMatch({ ...editingMatch, homeTeam: e.target.value })}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setIsCreatingTeam({ side: 'home', matchId: editingMatch.tempId })}
                  className="px-3 bg-slate-800 border border-slate-700 rounded-xl text-cyan-400 hover:bg-slate-700 transition-colors"
                  title="Cadastrar nova equipa"
                >
                  <PlusCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Equipa Visitante</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editingMatch.awayTeam}
                  onChange={(e) => setEditingMatch({ ...editingMatch, awayTeam: e.target.value })}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setIsCreatingTeam({ side: 'away', matchId: editingMatch.tempId })}
                  className="px-3 bg-slate-800 border border-slate-700 rounded-xl text-cyan-400 hover:bg-slate-700 transition-colors"
                  title="Cadastrar nova equipa"
                >
                  <PlusCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Data</label>
              <input
                type="date"
                value={editingMatch.kickoffDate}
                onChange={(e) => setEditingMatch({ ...editingMatch, kickoffDate: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Hora</label>
              <input
                type="time"
                value={editingMatch.kickoffTime}
                onChange={(e) => setEditingMatch({ ...editingMatch, kickoffTime: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 transition-all"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-8">
            <button
              type="button"
              onClick={() => setEditingMatch(null)}
              className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-8 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl shadow-lg shadow-cyan-500/20 transition-all"
            >
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (step === 'final_review') {
    const selectedMatches = extractedMatches.filter(m => m.isSelected);
    const duplicates = selectedMatches.filter(m => checkDuplicate(m));
    const valid = selectedMatches.filter(m => !checkDuplicate(m) && m.matchedCompetitionId && m.homeTeam && m.awayTeam);
    const invalid = selectedMatches.filter(m => !m.matchedCompetitionId || !m.homeTeam || !m.awayTeam || m.homeTeam === m.awayTeam);

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="bg-slate-800/40 border border-slate-700 rounded-3xl p-6">
          <div className="flex items-center gap-4 mb-6">
            <button 
              onClick={() => setStep('review')}
              className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h2 className="text-xl font-black text-white">Revisão Final</h2>
              <p className="text-sm text-slate-400">Verifique os dados antes de confirmar o cadastro em massa.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-700">
              <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Pronto para Cadastro</p>
              <p className="text-2xl font-black text-emerald-400">{valid.length}</p>
            </div>
            <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-700">
              <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Já Cadastrados</p>
              <p className="text-2xl font-black text-amber-400">{duplicates.length}</p>
            </div>
            <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-700">
              <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Com Erros / Incompletos</p>
              <p className="text-2xl font-black text-rose-400">{invalid.length}</p>
            </div>
          </div>

          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {selectedMatches.map((m) => {
              const isDuplicate = checkDuplicate(m);
              const isInvalid = !m.matchedCompetitionId || !m.homeTeam || !m.awayTeam || m.homeTeam === m.awayTeam;
              
              return (
                <div key={m.tempId} className={`p-4 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-4 ${
                  isDuplicate ? 'bg-amber-500/5 border-amber-500/20' : 
                  isInvalid ? 'bg-rose-500/5 border-rose-500/20' : 
                  'bg-slate-900/50 border-slate-700'
                }`}>
                  <div className="flex-1 flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase">
                      <Trophy className="w-3 h-3" />
                      {m.competitionName}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <TeamBadge teamName={m.homeTeam} className="w-6 h-6" />
                        <span className="font-bold text-white text-sm">{m.homeTeam}</span>
                      </div>
                      <span className="text-slate-600 font-black">×</span>
                      <div className="flex items-center gap-2">
                        <TeamBadge teamName={m.awayTeam} className="w-6 h-6" />
                        <span className="font-bold text-white text-sm">{m.awayTeam}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 justify-end">
                        <Calendar className="w-3 h-3" />
                        {m.kickoffDate}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 justify-end">
                        <Clock className="w-3 h-3" />
                        {m.kickoffTime}
                      </div>
                    </div>

                    <div className="w-32 text-right">
                      {isDuplicate ? (
                        <span className="text-[10px] font-black text-amber-500 uppercase bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
                          Já Cadastrado
                        </span>
                      ) : isInvalid ? (
                        <span className="text-[10px] font-black text-rose-500 uppercase bg-rose-500/10 px-2 py-1 rounded-lg border border-rose-500/20">
                          Incompleto
                        </span>
                      ) : (
                        <span className="text-[10px] font-black text-emerald-500 uppercase bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                          Novo Jogo
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-4 mt-8">
            <button
              onClick={() => setStep('review')}
              className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all"
            >
              Voltar e Editar
            </button>
            <button
              disabled={valid.length === 0}
              onClick={handleConfirmImport}
              className={`px-10 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2 ${
                valid.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <CheckCircle className="w-5 h-5" />
              Confirmar Cadastro ({valid.length})
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-slate-800/40 border border-slate-700 rounded-3xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-black text-white">Importar partidas por imagem</h2>
            <p className="text-sm text-slate-400 mt-1">
              Envie ou cole uma imagem com partidas de futebol para extrair os dados e revisar antes de cadastrar.
            </p>
          </div>
          {onClose && (
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>

        {step === 'upload' && (
          <>
            {!image ? (
              <div 
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`mt-6 border-2 border-dashed rounded-3xl p-12 transition-all flex flex-col items-center justify-center gap-4 ${
                  dragActive 
                    ? 'border-cyan-500 bg-cyan-500/5 scale-[1.01]' 
                    : 'border-slate-700 bg-slate-900/30 hover:border-slate-600'
                }`}
              >
                <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center mb-2">
                  <Upload className={`w-10 h-10 ${dragActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-white mb-1">Arraste a imagem aqui</p>
                  <p className="text-sm text-slate-400">ou utilize os botões abaixo</p>
                </div>
                
                <div className="flex items-center gap-3 mt-4">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-2xl flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all active:scale-95"
                  >
                    <Upload className="w-5 h-5" />
                    <span>Escolher imagem</span>
                  </button>
                  <button 
                    onClick={() => {
                      alert('Pressione Ctrl+V para colar uma imagem da área de transferência.');
                    }}
                    className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-black rounded-2xl flex items-center gap-2 border border-slate-700 transition-all active:scale-95"
                  >
                    <Clipboard className="w-5 h-5" />
                    <span>Colar imagem</span>
                  </button>
                </div>
                
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                />
                
                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-4">
                  Formatos aceites: JPG, PNG, WEBP
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-6">
                <div className="relative rounded-3xl overflow-hidden border border-slate-700 bg-slate-900/50 max-h-[400px] flex items-center justify-center group">
                  <img src={image} alt="Upload" className="max-w-full h-auto object-contain" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-sm">
                    <button 
                      onClick={() => setImage(null)}
                      className="px-4 py-2 bg-rose-500 text-white font-bold rounded-xl flex items-center gap-2 transition-all hover:scale-105"
                    >
                      <X className="w-4 h-4" />
                      Remover
                    </button>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-slate-800 text-white font-bold rounded-xl flex items-center gap-2 transition-all hover:scale-105"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Trocar
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <button
                    onClick={() => setImage(null)}
                    className="text-sm font-bold text-slate-400 hover:text-white transition-colors"
                  >
                    ← Escolher outra imagem
                  </button>
                  <button
                    onClick={analyzeImage}
                    disabled={analyzing}
                    className={`px-10 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl flex items-center gap-3 shadow-xl shadow-emerald-500/20 transition-all active:scale-95 ${
                      analyzing ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                  >
                    {analyzing ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>Analisando...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        <span>Analisar imagem</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
        
        {error && (
          <div className="mt-4 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-400 animate-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm font-bold">{error}</span>
          </div>
        )}
      </div>

      {step === 'review' && extractedMatches.length > 0 && (
        <div className="bg-slate-800/40 border border-slate-700 rounded-3xl p-6 space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-emerald-400" />
              Partidas identificadas ({extractedMatches.length})
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleSelectAll}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 transition-all"
              >
                {extractedMatches.every(m => m.isSelected) ? 'Desmarcar todas' : 'Selecionar todas'}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-700">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/90 text-slate-400 uppercase font-bold text-[10px] border-b border-slate-700">
                <tr>
                  <th className="py-4 px-4 w-10"></th>
                  <th className="py-4 px-3">Competição</th>
                  <th className="py-4 px-3">Data / Hora</th>
                  <th className="py-4 px-3">Equipa da Casa</th>
                  <th className="py-4 px-3 w-10 text-center">vs</th>
                  <th className="py-4 px-3">Equipa Visitante</th>
                  <th className="py-4 px-3">Estado</th>
                  <th className="py-4 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {extractedMatches.map((m) => {
                  const isDuplicate = checkDuplicate(m);
                  return (
                    <tr 
                      key={m.tempId} 
                      className={`transition-colors ${m.isSelected ? 'bg-cyan-500/5' : 'hover:bg-slate-800/30'}`}
                    >
                      <td className="py-4 px-4">
                        <button
                          onClick={() => handleToggleSelect(m.tempId)}
                          className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                            m.isSelected 
                              ? 'bg-cyan-500 border-cyan-500 text-slate-950' 
                              : 'border-slate-600 hover:border-slate-500'
                          }`}
                        >
                          {m.isSelected && <Check className="w-3.5 h-3.5" strokeWidth={4} />}
                        </button>
                      </td>
                      <td className="py-4 px-3">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <Trophy className="w-3 h-3 text-amber-400" />
                          {m.competitionName}
                        </div>
                        {m.matchedCompetitionId ? (
                          <span className="text-[10px] text-emerald-400 font-bold">✓ Correspondência</span>
                        ) : (
                          <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            Competição não identificada
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-3">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          {m.kickoffDate || '??/??/??'}
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {m.kickoffTime || '??:??'}
                        </div>
                      </td>
                      <td className="py-4 px-3">
                        <div className="flex items-center gap-2">
                          <TeamBadge teamName={m.homeTeam} className="w-6 h-6" />
                          <span className="font-bold text-white">{m.homeTeam}</span>
                        </div>
                        {m.matchedHomeTeam ? (
                          <span className="text-[9px] text-emerald-400 font-bold block">✓ Biblioteca</span>
                        ) : (
                          <span className="text-[9px] text-slate-500 font-bold block italic">Novo registo</span>
                        )}
                      </td>
                      <td className="py-4 px-3 text-center font-black text-slate-600">×</td>
                      <td className="py-4 px-3">
                        <div className="flex items-center gap-2">
                          <TeamBadge teamName={m.awayTeam} className="w-6 h-6" />
                          <span className="font-bold text-white">{m.awayTeam}</span>
                        </div>
                        {m.matchedAwayTeam ? (
                          <span className="text-[9px] text-emerald-400 font-bold block">✓ Biblioteca</span>
                        ) : (
                          <span className="text-[9px] text-slate-500 font-bold block italic">Novo registo</span>
                        )}
                      </td>
                      <td className="py-4 px-3">
                        {isDuplicate ? (
                          <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold">
                            JÁ CADASTRADO
                          </span>
                        ) : (!m.homeTeam || !m.awayTeam || !m.kickoffDate || !m.kickoffTime || !m.matchedCompetitionId) ? (
                          <span className="px-2 py-0.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold">
                            REVISÃO NECESSÁRIA
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                            PRONTO
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-3 text-right">
                        <button
                          onClick={() => setEditingMatch(m)}
                          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
                          title="Editar dados da partida"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-2xl border border-slate-700/50">
            <p className="text-xs text-slate-400">
              {extractedMatches.filter(m => m.isSelected).length} partidas selecionadas para revisão final.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setImage(null);
                  setExtractedMatches([]);
                  setStep('upload');
                }}
                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                disabled={extractedMatches.filter(m => m.isSelected).length === 0}
                className={`px-8 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl shadow-lg shadow-cyan-500/20 transition-all active:scale-95 flex items-center gap-2 ${
                  extractedMatches.filter(m => m.isSelected).length === 0 ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                onClick={() => setStep('final_review')}
              >
                <span>Seguir para Revisão Final</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
