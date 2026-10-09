import React, { useState, useEffect } from 'react';
import {
  Building2, TrendingUp, TrendingDown, HeartPulse, Scale, ShieldAlert,
  Wallet, FileSpreadsheet, Plus, CheckCircle2, ArrowRight, Receipt, WalletCards, Clock3
} from 'lucide-react';
import { storeService } from '../../services/storeService';
import { financialDocumentsStore } from '../../services/financialDocuments';
import { canEdit } from '../../services/permissions';
import { DashboardExpenseSummary } from './DashboardExpenseSummary';
import { formatRupiah, formatDate } from '../../utils/formatters';

interface DashboardOverviewProps {
  onOpenQuickAction: () => void;
  onNavigateTab: (tabId: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  onOpenQuickAction,
  onNavigateTab
}) => {
  const [metrics, setMetrics] = useState(storeService.getDashboardMetrics());
  const [locations, setLocations] = useState(storeService.locations);
  const [dailyReports, setDailyReports] = useState(storeService.dailyReports);
  const [notifications, setNotifications] = useState(storeService.notifications);
  const [activeLocId, setActiveLocId] = useState(storeService.activeLocationId);
  const [workflow, setWorkflow] = useState(financialDocumentsStore.snapshot());

  useEffect(() => {
    const unsubscribe = storeService.subscribe(() => {
      setMetrics(storeService.getDashboardMetrics());
      setLocations(storeService.locations);
      setDailyReports(storeService.dailyReports);
      setNotifications(storeService.notifications);
      setActiveLocId(storeService.activeLocationId);
    });
    return unsubscribe;
  }, []);

  useEffect(() => financialDocumentsStore.subscribe(() => setWorkflow(financialDocumentsStore.snapshot())), []);

  const criticalNotifs = notifications.filter(n => n.severity === 'critical' || n.severity === 'warning');

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* Top Header Banner with Professional Polish Styling */}
      <div className="ranch-hero rounded-xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <p className="ranch-label ranch-label--on-dark relative z-10 mb-2">Pusat kendali operasional</p>
          <h2 className="ranch-heading relative z-10 text-xl sm:text-2xl font-bold tracking-tight text-white!">
            Ringkasan peternakan hari ini
          </h2>
          <p className="relative z-10 max-w-2xl mt-1 text-xs sm:text-sm text-white/85! leading-relaxed">
            Pantau populasi, kesehatan, aktivitas kandang, dan arus keuangan dari satu tempat.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* FIX 2026-10-09 (audit dashboard, opsi A): sembunyikan utk role non-inputer
              — QuickActionsModal di-gate canEdit di App.tsx, tombol tampil tapi mati. */}
          {canEdit(storeService.currentUser.role) && (
            <button
              onClick={onOpenQuickAction}
              className="ranch-action-secondary relative z-10 bg-white/10! text-[#FFFFFF]! border-white/35!"
            >
              <Plus className="w-4 h-4" />
              <span>Aksi Kandang</span>
            </button>
          )}
        </div>
      </div>

      {/* Primary KPI Metric Cards Grid - Professional Polish Style */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Active Livestock */}
        <div className="card-polish ranch-kpi hover:border-[#1B5E20]/30 transition">
          <div className="flex items-center justify-between">
            <span className="stat-label-polish">Total Ternak</span>
            <div className="p-1.5 rounded-lg bg-[#F1F5F9] text-[#1B5E20]">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="stat-value-polish">{metrics.totalActive}</div>
          <div className="text-[11px] text-[#1B5E20] font-medium mt-1">
            ↑ Sehat: {metrics.healthy} | Sakit: {metrics.sick}
          </div>
        </div>

        {/* Health Condition */}
        <div className="card-polish hover:border-rose-300 transition">
          <div className="flex items-center justify-between">
            <span className="stat-label-polish">Ternak Sakit/Isolasi</span>
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
              <HeartPulse className="w-4 h-4" />
            </div>
          </div>
          <div className="stat-value-polish text-[#ef4444]">{metrics.sick + metrics.isolation}</div>
          <div className="text-[11px] text-[#ef4444] font-medium mt-1">
            {metrics.sick > 0 ? 'Perlu Penanganan Intensif' : 'Semua Dalam Terapi'}
          </div>
        </div>

        {/* Total Income */}
        <div className="card-polish ranch-kpi hover:border-[#C9971C]/40 transition">
          <div className="flex items-center justify-between">
            <span className="stat-label-polish">Total Pemasukan</span>
            <div className="p-1.5 rounded-lg bg-[#F1F5F9] text-[#C9971C]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="stat-value-polish text-slate-900">{formatRupiah(metrics.income)}</div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">Penjualan & Operasional</div>
        </div>

        {/* Net Profit */}
        <div className="card-polish ranch-kpi hover:border-[#1B5E20]/30 transition">
          <div className="flex items-center justify-between">
            <span className="stat-label-polish">Arus Kas Bersih</span>
            <div className="p-1.5 rounded-lg bg-[#F1F5F9] text-[#1B5E20]">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className={`stat-value-polish ${metrics.netProfit >= 0 ? 'text-[#1B5E20]' : 'text-rose-600'}`}>
            {formatRupiah(metrics.netProfit)}
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">
            Pengeluaran: {formatRupiah(metrics.expenses)}
          </div>
        </div>

      </div>

      {/* Ringkasan Pengeluaran — khusus Owner (mantau biaya operasional) */}
      <DashboardExpenseSummary onNavigateTab={onNavigateTab} />

      {/* Funding and invoice workflow indicators */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <button onClick={() => onNavigateTab('invoices')} className="card-polish text-left transition hover:border-[#EED995]">
          <WalletCards className="mb-2 h-5 w-5 text-[#A97A14]"/><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Menunggu Persetujuan</p><p className="mt-1 text-xl font-bold">{workflow.fundRequests.filter(item => ['Diajukan','Diverifikasi Akuntan'].includes(item.status)).length}</p>
        </button>
        <button onClick={() => onNavigateTab('invoices')} className="card-polish text-left transition hover:border-[#E2E8F0]">
          <CheckCircle2 className="mb-2 h-5 w-5 text-[#1B5E20]"/><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Dana Disetujui</p><p className="mt-1 text-sm font-bold">{formatRupiah(workflow.fundRequests.filter(item => ['Disetujui Owner','Dicairkan','Selesai'].includes(item.status)).reduce((sum,item) => sum + item.total, 0))}</p>
        </button>
        <button onClick={() => onNavigateTab('invoices')} className="card-polish text-left transition hover:border-rose-300">
          <Receipt className="mb-2 h-5 w-5 text-rose-700"/><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Invoice Belum Lunas</p><p className="mt-1 text-xl font-bold">{workflow.invoices.filter(item => item.status === 'Aktif' && item.remainingAmount > 0).length}</p>
        </button>
        <button onClick={() => onNavigateTab('invoices')} className="card-polish text-left transition hover:border-blue-300">
          <Clock3 className="mb-2 h-5 w-5 text-blue-700"/><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Verifikasi Bayar</p><p className="mt-1 text-xl font-bold">{workflow.invoices.flatMap(item => item.payments).filter(item => item.status === 'Menunggu Verifikasi').length}</p>
        </button>
      </div>

      {/* Critical Warnings Alert Bar */}
      {criticalNotifs.length > 0 && (
        <div className="bg-[#FBF6E9] border border-[#EED995] rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#EED995] text-[#A97A14] rounded-lg shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#A97A14]">
                Notifikasi & Alert Kandang ({criticalNotifs.length} Perhatian)
              </h4>
              <p className="text-xs text-[#A97A14]">
                {criticalNotifs[0].title}: {criticalNotifs[0].message}
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('notifications')}
            className="ranch-action-primary px-3 py-1.5 text-xs shrink-0"
          >
            Lihat Semua Alert
          </button>
        </div>
      )}

      {/* Multi-Location Comparison Table */}
      <div className="card-polish p-0 overflow-hidden">
        <div className="p-4 bg-slate-50/80 border-b border-[#e2e8f0] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Ringkasan Lokasi Kandang Peternakan</h3>
            <p className="text-xs text-slate-500">Perbandingan populasi, PIC, dan status kandang real-time</p>
          </div>
          <button
            onClick={() => onNavigateTab('livestock')}
            className="flex items-center gap-1 text-xs font-bold text-[#1B5E20] hover:underline transition cursor-pointer"
          >
            <span>Master Ternak</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2.5 text-[11px] font-bold text-[#64748b] uppercase tracking-wider border-b-2 border-[#f1f5f9]">Nama Lokasi</th>
                <th className="px-4 py-2.5 text-[11px] font-bold text-[#64748b] uppercase tracking-wider border-b-2 border-[#f1f5f9]">PIC Kandang</th>
                <th className="px-4 py-2.5 text-[11px] font-bold text-[#64748b] uppercase tracking-wider border-b-2 border-[#f1f5f9]">Jenis Ternak</th>
                <th className="px-4 py-2.5 text-[11px] font-bold text-[#64748b] uppercase tracking-wider border-b-2 border-[#f1f5f9] text-center">Blok Kandang</th>
                <th className="px-4 py-2.5 text-[11px] font-bold text-[#64748b] uppercase tracking-wider border-b-2 border-[#f1f5f9] text-center">Populasi</th>
                <th className="px-4 py-2.5 text-[11px] font-bold text-[#64748b] uppercase tracking-wider border-b-2 border-[#f1f5f9] text-center">Kondisi Sehat</th>
                <th className="px-4 py-2.5 text-[11px] font-bold text-[#64748b] uppercase tracking-wider border-b-2 border-[#f1f5f9] text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9] text-xs font-medium">
              {locations.map(loc => {
                const locLivestock = storeService.getActiveLivestock(loc.id);
                const healthy = locLivestock.filter(l => l.healthStatus === 'Sehat').length;
                return (
                  <tr key={loc.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3 font-bold text-slate-900 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-[#1B5E20]" />
                      <span>{loc.name}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div>{loc.picName}</div>
                      <div className="text-[10px] text-slate-400">{loc.picPhone}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {loc.livestockTypes.join(', ')}
                    </td>
                    <td className="px-4 py-3 text-center font-mono font-bold text-slate-700">{loc.penCount} blok</td>
                    <td className="px-4 py-3 text-center font-mono font-bold text-[#1B5E20] text-sm">{locLivestock.length} ekor</td>
                    <td className="px-4 py-3 text-center font-bold text-[#1B5E20]">{healthy} ekor</td>
                    <td className="px-4 py-3 text-center">
                      <span className="badge-success-polish">
                        {loc.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Latest Daily Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Daily Reports Status */}
        <div className="card-polish space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-[#1B5E20]" />
              <span>Laporan Harian Kandang Terakhir</span>
            </h3>
            <button
              onClick={() => onNavigateTab('daily-reports')}
              className="text-xs font-bold text-[#1B5E20] hover:underline cursor-pointer"
            >
              Lihat Laporan
            </button>
          </div>

          <div className="space-y-2">
            {dailyReports.slice(0, 3).map(rpt => (
              <div key={rpt.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-900">
                    {rpt.locationName} · {formatDate(rpt.date)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Populasi Akhir: <span className="font-bold text-slate-800">{rpt.popFinal} ekor</span> (Awal: {rpt.popInitial})
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  rpt.reportStatus === 'Disetujui' ? 'badge-success-polish' :
                  rpt.reportStatus === 'Dikirim' ? 'bg-blue-100 text-blue-900' : 'badge-warning-polish'
                }`}>
                  {rpt.reportStatus}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Navigation Modules */}
        <div className="card-polish space-y-3">
          <h3 className="text-sm font-bold text-slate-900">Akses Cepat Modul Utama</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => onNavigateTab('health')}
              className="p-3 rounded-xl bg-slate-50 hover:bg-[#F1F5F9]/40 border border-slate-200 hover:border-[#1B5E20]/30 text-left font-bold text-slate-800 flex items-center justify-between transition cursor-pointer"
            >
              <span>Kesehatan & Obat</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <button
              onClick={() => onNavigateTab('finance')}
              className="p-3 rounded-xl bg-slate-50 hover:bg-[#F1F5F9]/40 border border-slate-200 hover:border-[#1B5E20]/30 text-left font-bold text-slate-800 flex items-center justify-between transition cursor-pointer"
            >
              <span>Keuangan & Laba</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
