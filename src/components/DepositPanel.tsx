import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../api.ts';
import {
  Smartphone,
  CheckCircle2,
  AlertCircle,
  ArrowDownLeft,
  ShieldCheck,
  Zap,
  RefreshCw,
  Clock,
  ChevronRight,
  Info,
  Upload,
  FileCheck,
  X,
  FileText,
  Trash2,
  Eye,
  Paperclip,
  Copy,
  Check,
} from 'lucide-react';

export const OFFICIAL_EMOLA_NUMBER = '867090687';
export const OFFICIAL_EMOLA_NAME = 'Aninha Basto';

interface DepositPanelProps {
  onSuccess?: (newBalance: number) => void;
  onClose?: () => void;
  isModal?: boolean;
}

type DepositMethod = 'EMOLA';

const PRESET_AMOUNTS = [50, 100, 250, 500, 1000, 2500, 5000];

export const DepositPanel: React.FC<DepositPanelProps> = ({
  onSuccess,
  onClose,
  isModal = false,
}) => {
  const { user, updateBalance, refreshUserData } = useAuth();

  const method: DepositMethod = 'EMOLA';
  const [amount, setAmount] = useState<string>('500');
  const [phone, setPhone] = useState<string>(() => {
    if (user?.phone) {
      // Remove country code if present for cleaner input
      return user.phone.replace(/^\+258\s*/, '').replace(/\s+/g, '');
    }
    return '';
  });

  // Proof / Receipt state for administration
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [receiptReference, setReceiptReference] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [copiedNumber, setCopiedNumber] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    reference: string;
    amount: number;
    methodLabel: string;
    phone: string;
    newBalance: number;
    hasReceipt?: boolean;
    receiptFileName?: string;
    receiptPreview?: string | null;
    receiptReference?: string;
  } | null>(null);

  const numericAmount = parseFloat(amount) || 0;

  const handleFile = (file: File) => {
    setError(null);
    if (!file) return;

    // Check size limit: 10MB
    if (file.size > 10 * 1024 * 1024) {
      setError('O comprovativo selecionado ultrapassa o limite de 10 MB.');
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'application/pdf'];
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (!isImage && !isPdf) {
      setError('Formato inválido. Por favor envie uma imagem (PNG, JPG, WEBP) ou documento PDF.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setReceiptPreview(reader.result as string);
      setReceiptFile(file);
    };
    reader.onerror = () => {
      setError('Não foi possível ler o arquivo do comprovativo.');
    };
    reader.readAsDataURL(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const removeReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (numericAmount < 10) {
      setError('O montante mínimo de depósito é de 10,00 MZN.');
      return;
    }

    if (numericAmount > 100000) {
      setError('O montante máximo permitido por operação é de 100.000,00 MZN.');
      return;
    }

      const cleanPhone = phone.replace(/\D/g, '');
      if (cleanPhone.length < 8) {
        setError('Por favor, introduza o seu número de celular Movitel (86/87) para conferência da transferência.');
        return;
      }

    setLoading(true);

    try {
      const formattedPhone = phone.startsWith('+258') ? phone : `+258 ${phone.trim()}`;
      const res = await api.deposit({
        amount: numericAmount,
        method: 'EMOLA',
        phoneNumber: formattedPhone,
        receiptImage: receiptPreview || undefined,
        receiptFileName: receiptFile?.name || undefined,
        receiptFileSize: receiptFile?.size || undefined,
        receiptReference: receiptReference.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      const updatedBalance = res.wallet?.balance ?? (user ? user.balance + numericAmount : numericAmount);
      updateBalance(updatedBalance);
      await refreshUserData();

      const methodLabel = 'e-Mola (Movitel)';

      setSuccessData({
        reference: res.transaction?.reference || `DEP-EMOLA-${Date.now().toString().slice(-6)}`,
        amount: numericAmount,
        methodLabel,
        phone: formattedPhone,
        newBalance: updatedBalance,
        hasReceipt: Boolean(receiptFile || receiptReference.trim()),
        receiptFileName: receiptFile?.name,
        receiptPreview: receiptPreview || undefined,
        receiptReference: receiptReference.trim() || undefined,
      });

      if (onSuccess) {
        onSuccess(updatedBalance);
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao processar o depósito.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSuccessData(null);
    setError(null);
    setAmount('500');
    removeReceipt();
    setReceiptReference('');
    setNotes('');
  };

  return (
    <div className={`w-full ${isModal ? 'max-w-xl mx-auto' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <span>Painel de Depósito</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30 uppercase">
                e-Mola Oficial
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Carregue a sua carteira em Meticais (MT) exclusivamente através da conta oficial e-Mola (Movitel).
            </p>
          </div>
        </div>

        {user && (
          <div className="text-right hidden sm:block">
            <span className="text-[11px] text-slate-400 block">Saldo Atual</span>
            <span className="font-extrabold text-sm text-emerald-400">
              {user.balance.toFixed(2)} MT
            </span>
          </div>
        )}
      </div>

      {/* Success Receipt State */}
      {successData ? (
        <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-5 sm:p-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
              Pedido de Depósito Submetido!
            </span>
            <div className="text-3xl font-black text-white mt-1">
              {successData.amount.toFixed(2)} <span className="text-base text-slate-400">MT</span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              O seu comprovativo foi enviado. O saldo será creditado assim que a administração confirmar o recebimento.
            </p>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 text-xs text-left space-y-2 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400 font-sans">Referência:</span>
              <span className="text-white font-bold">{successData.reference}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-sans">Estado:</span>
              <span className="text-amber-400 font-sans font-bold">Aguardando Validação</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-sans">Método:</span>
              <span className="text-orange-400 font-sans font-bold">{successData.methodLabel}</span>
            </div>
          </div>

          {/* Receipt Submission Badge & Confirmation */}
          {successData.hasReceipt && (
            <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-4 text-left space-y-2.5">
              <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
                <FileCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Comprovativo Enviado para a Administração</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                O seu comprovativo {successData.receiptFileName ? `(${successData.receiptFileName})` : ''} foi arquivado no sistema com sucesso. A equipa de tesouraria da ZONABET tem acesso imediato para conferência e auditoria.
              </p>
              {successData.receiptReference && (
                <div className="text-[11px] font-mono text-emerald-300 bg-emerald-950/60 p-2 rounded-lg border border-emerald-500/20">
                  <span className="text-slate-400 font-sans block text-[10px]">Cód. Referência da Operadora:</span>
                  <strong>{successData.receiptReference}</strong>
                </div>
              )}
              {successData.receiptPreview && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowPreviewModal(true)}
                    className="inline-flex items-center gap-1.5 text-xs text-emerald-300 hover:text-emerald-200 font-bold underline underline-offset-2"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Visualizar comprovativo enviado</span>
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            {onClose && (
              <button
                id="deposit-success-close-btn"
                onClick={onClose}
                className="flex-1 py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <span>Apostar Agora</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
            <button
              id="deposit-success-repeat-btn"
              onClick={resetForm}
              className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs sm:text-sm border border-slate-700 transition-all flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Efetuar Outro Depósito</span>
            </button>
          </div>
        </div>
      ) : (
        /* Form State */
        <form onSubmit={handleDeposit} className="space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs font-medium flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Dedicated Official e-Mola Deposit Channel */}
          <div className="bg-gradient-to-br from-amber-950/40 via-orange-950/30 to-slate-900 border border-orange-500/40 rounded-2xl p-4 sm:p-5 text-xs space-y-4 shadow-lg shadow-orange-950/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center text-sm font-black shadow-md shadow-orange-500/30">
                  e
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm sm:text-base font-black text-white">e-Mola (Movitel)</span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/40">
                      Método Exclusivo
                    </span>
                  </div>
                  <span className="text-[11px] text-orange-300/90 font-medium block">
                    Canal oficial e direto para carregamento de saldo ZONABET
                  </span>
                </div>
              </div>
            </div>

            {/* Official Account details card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-3.5 rounded-xl bg-slate-950/90 border border-orange-500/30 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Número Oficial e-Mola:</span>
                  <span className="text-xl font-black text-orange-400 font-mono tracking-wide">{OFFICIAL_EMOLA_NUMBER}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(OFFICIAL_EMOLA_NUMBER);
                    setCopiedNumber(true);
                    setTimeout(() => setCopiedNumber(false), 2000);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 text-xs font-bold border border-orange-500/30 flex items-center gap-1.5 transition-all active:scale-95"
                  title="Copiar número e-Mola"
                >
                  {copiedNumber ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedNumber ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/90 border border-orange-500/30 flex flex-col justify-center">
                <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Nome do Titular:</span>
                <span className="text-base font-black text-white">{OFFICIAL_EMOLA_NAME}</span>
              </div>
            </div>

            {/* Step-by-step instructions */}
            <div className="bg-slate-950/60 rounded-xl p-3 sm:p-3.5 border border-slate-800 text-[11px] text-slate-300 space-y-1.5">
              <div className="font-bold text-white flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-orange-400" />
                <span>Instruções Rápidas no Telemóvel:</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-slate-300 pl-0.5 leading-relaxed">
                <li>No seu telemóvel Movitel, marque <strong className="text-orange-400 font-mono">*898#</strong> ou utilize a aplicação e-Mola.</li>
                <li>Selecione <strong className="text-white">Transferir / Enviar Dinheiro</strong> para o número <strong className="text-orange-400 font-mono">{OFFICIAL_EMOLA_NUMBER}</strong>.</li>
                <li>Confirme com atenção que o titular apresentado é <strong className="text-white">{OFFICIAL_EMOLA_NAME}</strong>.</li>
                <li>Insira o valor pretendido {numericAmount > 0 ? <strong className="text-emerald-400 font-mono">({numericAmount.toFixed(2)} MT)</strong> : ''} e confirme com o seu PIN e-Mola.</li>
                <li>Introduza abaixo o seu número Movitel remetente e anexe o comprovativo da SMS para validação imediata.</li>
              </ol>
            </div>
          </div>

          {/* 2. Amount Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-300">
                2. Montante a Depositar (MT)
              </label>
              <span className="text-[11px] text-slate-400">Mín: 10 MT • Máx: 100.000 MT</span>
            </div>

            {/* Quick buttons */}
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 mb-2.5">
              {PRESET_AMOUNTS.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmount(val.toString())}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-colors border ${
                    numericAmount === val
                      ? 'bg-orange-500 text-slate-950 border-orange-400 font-black shadow-sm'
                      : 'bg-slate-800 hover:bg-slate-750 text-slate-300 border-slate-700'
                  }`}
                >
                  {val} MT
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="relative">
              <input
                id="deposit-amount-input"
                type="number"
                min="10"
                max="100000"
                step="1"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ex: 500"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-lg font-black text-orange-400 placeholder-slate-600 focus:outline-none focus:border-orange-500 tracking-tight"
              />
              <span className="absolute right-4 top-3.5 text-xs font-bold text-slate-400">
                MT (Meticais)
              </span>
            </div>
          </div>

          {/* 3. User's Movitel Phone Number */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-300">
                3. O Seu Número de Celular Movitel (com o qual efetuou o envio)
              </label>
              <span className="text-[10px] text-orange-400 font-bold">
                Prefixo 86 ou 87 (e-Mola)
              </span>
            </div>
            <div className="relative flex items-center">
              <div className="absolute left-3 flex items-center gap-1.5 text-slate-400 font-bold text-xs pointer-events-none">
                <span>🇲🇿</span>
                <span>+258</span>
              </div>
              <input
                id="deposit-phone-input"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="86 700 0000"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-20 pr-4 py-2.5 text-sm font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>
                Utilizado pela tesouraria para validar o recebimento da transferência na conta oficial de Aninha Basto (867090687).
              </span>
            </p>
          </div>

          {/* 4. Proof of Payment Upload for Administration */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-orange-400" />
                <span>4. Comprovativo para a Administração (SMS / Talão e-Mola)</span>
              </label>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                Recomendado para Validação Rápida
              </span>
            </div>

            <p className="text-[11px] text-slate-400">
              Anexe a captura de ecrã (screenshot) da mensagem SMS recebida da e-Mola (*898#) ou foto do talão para conferência imediata da tesouraria.
            </p>

            {/* Hidden native input */}
            <input
              ref={fileInputRef}
              id="deposit-receipt-file-input"
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFile(e.target.files[0]);
                }
              }}
            />

            {/* Drag & Drop Area */}
            {!receiptFile ? (
              <div
                id="deposit-receipt-dropzone"
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-orange-400 bg-orange-950/30 scale-[1.01]'
                    : 'border-slate-700 hover:border-orange-500/60 bg-slate-950/50 hover:bg-slate-950/80'
                }`}
              >
                <div className="w-11 h-11 rounded-full bg-slate-850 border border-slate-700 text-orange-400 mx-auto flex items-center justify-center mb-2 shadow-inner">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="text-xs font-bold text-slate-200 mb-1">
                  Arraste a SMS / Comprovativo e-Mola para aqui ou <span className="text-orange-400 underline underline-offset-2">clique para selecionar</span>
                </div>
                <p className="text-[10px] text-slate-500">
                  Formatos aceites: PNG, JPG, WEBP, PDF (Máx. 10 MB)
                </p>
              </div>
            ) : (
              /* Uploaded Receipt Preview Card */
              <div className="p-3.5 rounded-xl bg-slate-950 border border-orange-500/40 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 overflow-hidden">
                    {receiptPreview && receiptFile.type.startsWith('image/') ? (
                      <div
                        onClick={() => setShowPreviewModal(true)}
                        className="w-14 h-14 rounded-lg overflow-hidden border border-slate-700 shrink-0 cursor-pointer relative group bg-black"
                        title="Clique para ampliar"
                      >
                        <img
                          src={receiptPreview}
                          alt="Miniatura do comprovativo"
                          className="w-full h-full object-cover group-hover:opacity-75 transition-opacity"
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                          <Eye className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-orange-400 shrink-0">
                        <FileText className="w-7 h-7" />
                      </div>
                    )}

                    <div className="min-w-0">
                      <span className="text-xs font-bold text-white block truncate">
                        {receiptFile.name}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        {formatFileSize(receiptFile.size)}
                      </span>
                      <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold mt-0.5">
                        <FileCheck className="w-3 h-3" />
                        <span>Comprovativo e-Mola pronto para conferência</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {receiptPreview && receiptFile.type.startsWith('image/') && (
                      <button
                        type="button"
                        id="deposit-receipt-view-btn"
                        onClick={() => setShowPreviewModal(true)}
                        className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                        title="Ver Comprovativo"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      id="deposit-receipt-remove-btn"
                      onClick={removeReceipt}
                      className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors"
                      title="Remover Comprovativo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Supplemental details: SMS Code / Transaction Ref & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  ID / Ref da SMS e-Mola (Opcional)
                </label>
                <input
                  id="deposit-receipt-ref-input"
                  type="text"
                  value={receiptReference}
                  onChange={(e) => setReceiptReference(e.target.value)}
                  placeholder="Ex: EM260907.1337..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Mensagem / Observação para a Administração (Opcional)
                </label>
                <input
                  id="deposit-receipt-notes-input"
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Transferência e-Mola enviada do número 86..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Fee & Calculation Summary */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-xs space-y-1.5">
            <div className="flex justify-between text-slate-400">
              <span>Montante Solicitado:</span>
              <span className="font-bold text-white">{numericAmount.toFixed(2)} MT</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Taxa de Processamento e-Mola:</span>
              <span className="font-bold text-emerald-400">0,00 MT (Grátis)</span>
            </div>
            <div className="flex justify-between text-sm font-black pt-1.5 border-t border-slate-800">
              <span className="text-white">Total a Creditar:</span>
              <span className="text-emerald-400">+{numericAmount.toFixed(2)} MT</span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            id="deposit-submit-btn"
            type="submit"
            disabled={loading || numericAmount < 10}
            className="w-full py-3.5 px-4 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-slate-950 font-black rounded-xl text-sm transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>A validar com a e-Mola...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 fill-slate-950" />
                <span>Confirmar Depósito via e-Mola de {numericAmount.toFixed(2)} MT</span>
              </>
            )}
          </button>

          {/* Security badge */}
          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500">
            <ShieldCheck className="w-4 h-4 text-orange-500" />
            <span>Depósito seguro via e-Mola Movitel Moçambique</span>
          </div>
        </form>
      )}

      {/* Full-Screen Receipt Preview Modal */}
      {showPreviewModal && (receiptPreview || successData?.receiptPreview) && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-full sm:max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-slate-800 bg-slate-950/80">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white">
                  Visualização do Comprovativo
                </span>
              </div>
              <button
                type="button"
                id="deposit-receipt-close-modal-btn"
                onClick={() => setShowPreviewModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-slate-950 flex items-center justify-center max-h-[70vh] overflow-auto">
              <img
                src={receiptPreview || successData?.receiptPreview || ''}
                alt="Comprovativo ampliado"
                className="max-h-[60vh] w-auto max-w-full rounded-lg object-contain border border-slate-800"
              />
            </div>

            <div className="p-3.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span className="truncate max-w-[220px]">
                {receiptFile?.name || successData?.receiptFileName || 'Comprovativo de Depósito'}
              </span>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
