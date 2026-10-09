import React, { useState } from 'react';
import { ArrowRight, ReceiptText } from 'lucide-react';
import { storeService } from '../../services/storeService';
import { formatRupiah, formatDate } from '../../utils/formatters';

type PeriodMode = 'harian' | 'bulanan' | 'rentang';

interface DashboardExpenseSummaryProps {
  onNavigateTab: (tabId: string) => void;
}

/**
 * Ringkasan Pengeluaran — khusus OWNER di Dashboard utama.
 * v1.1: menu Pengeluaran (input) khusus Manager; Owner mantau via kartu ini.
 * Data sumber: storeService.financialTransactions (type === 'expense'),
 * sinkron Supabase via dataSync — total dihitung dari data yang sama
 * dengan Laporan Laba Rugi (getDashboardMetrics).
 */
export const DashboardExpenseSummary: React.FC<DashboardExpenseSummaryProps> = ({ onNavigateTab }) => {
  const role = storeService.currentUser.role;
  const [mode, setMode] = useState<PeriodMode>('bulanan');
  const [day, setDay] = useState(new Date().toISOString().slice(0, 10));
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [from, setFrom] = useState(new Date(Date.now() - 29 * 864e5).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));

  if (role !== 'OWNER' && role !== 'DEVELOPER' && role !== 'ADMIN') return null;

  const inPeriod = (date: string) => {
    if (mode === 'harian') return date === day;
    if (mode === 'bulanan') return date.startsWith(month);
    return date >= from && date <= to;
  };

  const expenses = storeService.financialTransactions
    .filter(t => t.type === 'expense' && inPeriod(t.date))
    .sort((a, b) => b.date.localeCompare(a.date));
  const total = expenses.reduce((acc, t) => acc + t.amount, 0);

  const periodLabel = mode === 'harian' ? `Harian · ${formatDate(day)}`
    : mode === 'bulanan' ? `Bulanan · ${new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${month}-01T00:00:00Z`))}`
    : `Rentang · ${formatDate(from)} – ${formatDate(to)}`;

  const inputCls = 'rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-[#1B5E20]/40';

  return (
    <div className="card-polish p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-rose-50 text-rose-700"><ReceiptText className="w-4 h-4" /></div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Ringkasan Pengeluaran</h3>
            <p className="text-[11px] text-slate-500">{periodLabel}</p>
          </div>
        </div>
        {/* Filter periode: harian / bulanan / rentang tanggal */}
        <div className="flex flex-wrap items-center gap-1.5">
          {(['harian', 'bulanan', 'rentang'] as PeriodMode[]).map(m => (
            <button key={m} type="button" onClick={() => setMode(m)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize transition ${mode === m ? 'bg-[#1B5E20] text-white' : 'bg-slate-50 text-slate-600 hover:bg-[#F1F5F9]'}`}>
              {m}
            </button>
          ))}
          {mode === 'harian' && <input type="date" value={day} onChange={e => setDay(e.target.value)} className={inputCls} />}
          {mode === 'bulanan' && <input type="month" value={month} onChange={e => setMonth(e.target.value)} className={inputCls} />}
          {mode === 'rentang' && (
            <span className="flex items-center gap-1">
              <input type="date" value={from} onChange={e => setFrom(e.target.value)} className={inputCls} aria-label="Dari tanggal" />
              <span className="text-xs text-slate-400">–</span>
              <input type="date" value={to} onChange={e => setTo(e.target.value)} className={inputCls} aria-label="Sampai tanggal" />
            </span>
          )}
        </div>
      </div>

      {/* Total periode terpilih */}
      <div className="mb-3 rounded-xl bg-rose-50/60 border border-rose-100 px-4 py-3 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-rose-700">Total Pengeluaran</span>
        <span className="text-lg font-extrabold text-rose-700">{formatRupiah(total)}</span>
      </div>

      {/* Rincian pengeluaran (5 terakhir di periode) */}
      <div className="space-y-2">
        {expenses.length === 0 && (
          <p className="text-xs text-slate-400 py-3 text-center">Tidak ada pengeluaran pada periode ini.</p>
        )}
        {expenses.slice(0, 5).map(t => (
          <div key={t.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start justify-between gap-3 text-xs">
            <div className="min-w-0">
              <div className="font-bold text-slate-900 truncate">{t.category || 'Lainnya'} · {formatDate(t.date)}</div>
              <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                {t.description || '—'}{t.payeePayer ? ` · ${t.payeePayer}` : ''}
              </div>
            </div>
            <span className="font-bold text-rose-700 shrink-0">-{formatRupiah(t.amount)}</span>
          </div>
        ))}
        {expenses.length > 5 && (
          <p className="text-[11px] text-slate-400 text-center">+ {expenses.length - 5} transaksi lainnya</p>
        )}
      </div>

      <button type="button" onClick={() => onNavigateTab('expenses')}
        className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#1B5E20] px-3 py-2.5 text-xs font-bold text-white transition hover:bg-[#0A3D26]">
        Lihat Detail Pengeluaran
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
