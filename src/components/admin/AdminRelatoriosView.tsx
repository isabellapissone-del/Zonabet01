import React, { useState } from 'react';
import { DashboardStats } from '../../types.ts';
import {
  FileSpreadsheet,
  Calendar,
  DollarSign,
  TrendingUp,
  Trophy,
  Award,
  Users,
  Printer,
  ArrowDownLeft,
  ArrowUpRight,
  Download,
} from 'lucide-react';

interface AdminRelatoriosViewProps {
  stats: DashboardStats | null;
}

export const AdminRelatoriosView: React.FC<AdminRelatoriosViewProps> = ({ stats }) => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const dailyReports = stats?.dailyReports || [];

  // Find report for the selected date or fallback to default
  const activeReport =
    dailyReports.find((r) => r.date === selectedDate) ||
    (selectedDate === new Date().toISOString().split('T')[0]
      ? {
          date: selectedDate,
          wagered: stats?.wageredToday || 0,
          paidOut: stats?.paidOutToday || 0,
          profit: stats?.houseProfitToday || 0,
          betsCount: stats?.betsTodayCount || 0,
          deposits: stats?.depositsToday || 0,
          withdrawals: stats?.withdrawalsToday || 0,
          newUsers: 0,
        }
      : {
          date: selectedDate,
          wagered: 0,
          paidOut: 0,
          profit: 0,
          betsCount: 0,
          deposits: 0,
          withdrawals: 0,
          newUsers: 0,
        });

  const marginPercent =
    activeReport.wagered > 0
      ? ((activeReport.profit / activeReport.wagered) * 100).toFixed(1)
      : '0.0';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Sub-navigation bar matching tree hierarchy */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-slate-800/60 border border-slate-700/80 rounded-2xl">
        <div className="flex items-center gap-2">
          <span className="font-mono text-purple-400 font-bold text-xs sm:text-sm">📊 RELATÓRIOS</span>
          <span className="text-slate-500">/</span>
          <span className="text-xs text-slate-300 font-semibold">Relatório Diário Consolidado</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-purple-400" />
            <span>Imprimir Relatório</span>
          </button>
        </div>
      </div>

      {/* Date Selector Filter */}
      <div className="p-4 bg-slate-800/80 border border-slate-700/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-bold text-white">Selecionar Data do Relatório:</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-purple-300 font-mono focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <button
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className="px-2.5 py-1 bg-purple-500/15 text-purple-300 border border-purple-500/30 rounded-lg font-bold"
          >
            Hoje
          </button>
          <button
            onClick={() => {
              const d = new Date();
              d.setDate(d.getDate() - 1);
              setSelectedDate(d.toISOString().split('T')[0]);
            }}
            className="px-2.5 py-1 bg-slate-800 text-slate-300 border border-slate-700 rounded-lg font-bold hover:bg-slate-750"
          >
            Ontem
          </button>
        </div>
      </div>

      {/* 4 Spotlight Daily Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Apostado no Dia */}
        <div className="p-5 bg-gradient-to-b from-slate-800/90 to-slate-900 border border-slate-700/80 rounded-2xl shadow-lg">
          <span className="text-xs font-bold text-slate-400 uppercase block">Total Apostado</span>
          <div className="text-2xl font-black text-cyan-400 mt-2">
            {activeReport.wagered.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">
            {activeReport.betsCount} bilhetes processados
          </span>
        </div>

        {/* 2. Total Pago em Prêmios */}
        <div className="p-5 bg-gradient-to-b from-slate-800/90 to-slate-900 border border-slate-700/80 rounded-2xl shadow-lg">
          <span className="text-xs font-bold text-slate-400 uppercase block">Prêmios Pagos</span>
          <div className="text-2xl font-black text-amber-400 mt-2">
            {activeReport.paidOut.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">
            Entregue a vencedores do dia
          </span>
        </div>

        {/* 3. Lucro Líquido da Casa */}
        <div className="p-5 bg-gradient-to-b from-slate-800/90 to-slate-900 border border-slate-700/80 rounded-2xl shadow-lg">
          <span className="text-xs font-bold text-slate-400 uppercase block">Lucro da Casa (GGR)</span>
          <div className={`text-2xl font-black mt-2 ${
            activeReport.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {activeReport.profit >= 0 ? '+' : ''}
            {activeReport.profit.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">
            Margem de lucro: <strong className="text-white">{marginPercent}%</strong>
          </span>
        </div>

        {/* 4. Novos Jogadores */}
        <div className="p-5 bg-gradient-to-b from-slate-800/90 to-slate-900 border border-slate-700/80 rounded-2xl shadow-lg">
          <span className="text-xs font-bold text-slate-400 uppercase block">Novos Jogadores</span>
          <div className="text-2xl font-black text-white mt-2">
            {activeReport.newUsers}
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">
            Cadastrados na data {activeReport.date}
          </span>
        </div>
      </div>

      {/* Movement Table for the Day */}
      <div className="p-5 bg-slate-800/80 border border-slate-700/80 rounded-2xl space-y-3">
        <h4 className="text-xs font-black uppercase text-slate-300 tracking-wider">
          Resumo Financeiro do Dia ({activeReport.date})
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">Depósitos no dia:</span>
            <span className="text-sm font-black text-emerald-400">
              +{activeReport.deposits.toFixed(2)} MT
            </span>
          </div>
          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">Levantamentos no dia:</span>
            <span className="text-sm font-black text-rose-400">
              -{activeReport.withdrawals.toFixed(2)} MT
            </span>
          </div>
          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">Saldo Líquido Entrado:</span>
            <span className="text-sm font-black text-cyan-400">
              {(activeReport.deposits - activeReport.withdrawals).toFixed(2)} MT
            </span>
          </div>
        </div>
      </div>

      {/* 14-Day Consolidated History Table */}
      <div className="space-y-3">
        <h4 className="text-sm font-black text-white flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-purple-400" />
          <span>Histórico Comparativo dos Últimos 14 Dias</span>
        </h4>

        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/90 text-slate-400 uppercase font-bold text-[10px] border-b border-slate-700">
              <tr>
                <th className="py-3 px-3.5">Data</th>
                <th className="py-3 px-3 text-center">Bilhetes</th>
                <th className="py-3 px-3 text-right">Apostado</th>
                <th className="py-3 px-3 text-right">Prêmios Pagos</th>
                <th className="py-3 px-3 text-right">Lucro da Casa</th>
                <th className="py-3 px-3 text-right">Depósitos</th>
                <th className="py-3 px-3 text-right">Levantamentos</th>
                <th className="py-3 px-3 text-center">Novos Jogadores</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-medium">
              {dailyReports.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    Ainda não existem relatórios consolidados em histórico.
                  </td>
                </tr>
              ) : (
                dailyReports.map((row) => (
                  <tr
                    key={row.date}
                    onClick={() => setSelectedDate(row.date)}
                    className={`cursor-pointer transition-colors ${
                      row.date === selectedDate ? 'bg-purple-500/10' : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="py-3 px-3.5 font-mono text-white font-bold whitespace-nowrap">
                      {row.date}
                    </td>

                    <td className="py-3 px-3 text-center text-slate-300">
                      {row.betsCount}
                    </td>

                    <td className="py-3 px-3 text-right font-bold text-cyan-400 whitespace-nowrap">
                      {row.wagered.toFixed(2)} MT
                    </td>

                    <td className="py-3 px-3 text-right font-bold text-amber-400 whitespace-nowrap">
                      {row.paidOut.toFixed(2)} MT
                    </td>

                    <td className={`py-3 px-3 text-right font-black whitespace-nowrap ${
                      row.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {row.profit >= 0 ? '+' : ''}{row.profit.toFixed(2)} MT
                    </td>

                    <td className="py-3 px-3 text-right text-emerald-300 whitespace-nowrap">
                      {row.deposits.toFixed(2)} MT
                    </td>

                    <td className="py-3 px-3 text-right text-rose-300 whitespace-nowrap">
                      {row.withdrawals.toFixed(2)} MT
                    </td>

                    <td className="py-3 px-3 text-center font-bold text-white">
                      {row.newUsers}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
