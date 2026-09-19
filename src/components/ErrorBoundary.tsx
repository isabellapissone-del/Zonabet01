import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('CRITICAL UNCAUGHT UI ERROR in ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetAndReload = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-2xl p-6 shadow-2xl space-y-5 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
              <AlertCircle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black text-white tracking-wide">
                ZONABET - Recuperação do Sistema
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Ocorreu uma interrupção inesperada ao carregar a interface da aplicação. Os seus dados e bilhetes estão em segurança no servidor.
              </p>
            </div>

            {this.state.error && (
              <div className="text-left bg-slate-950 border border-slate-800 rounded-xl p-3 text-[11px] font-mono text-red-300 max-h-32 overflow-y-auto break-all">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-sm font-black rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/20 active:scale-[0.98]"
              >
                <RefreshCw className="w-4 h-4" />
                <span>RECARREGAR APLICAÇÃO</span>
              </button>

              <button
                onClick={this.handleResetAndReload}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Limpar Cache Local e Iniciar</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
