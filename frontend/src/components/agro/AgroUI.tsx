import React, { ReactNode } from 'react';
import { XCircle, FileText, Plus, Search, Download } from 'lucide-react';
import { exportToExcel, exportToPDF } from '../../utils/formatters';
import { storeService } from '../../services/storeService';
import { canEdit } from '../../services/permissions';

// ============================================================================
// Primitif UI bersama untuk view divisi baru (tema ranch editorial).
// ============================================================================

export const AgroHeader: React.FC<{ kicker: string; title: string; subtitle?: string; actions?: ReactNode }> = ({ kicker, title, subtitle, actions }) => (
  <div className="rounded-3xl bg-[#1B5E20] p-5 text-white shadow-lg sm:p-7">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="ranch-label ranch-label--on-dark">{kicker}</p>
        <h2 className="mt-2 text-2xl font-bold text-white!">{title}</h2>
        {subtitle && <p className="mt-2 text-sm text-white/85!">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  </div>
);

export const AgroCard: React.FC<{ children: ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>{children}</div>
);

export const AgroStat: React.FC<{ label: string; value: string; hint?: string; accent?: boolean }> = ({ label, value, hint, accent }) => (
  <AgroCard className={accent ? 'border-[#E4C25E]/70 bg-[#FBF6E9]/60' : ''}>
    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
    <p className="mt-1 text-lg sm:text-xl font-bold text-slate-900 leading-tight break-words whitespace-normal">{value}</p>
    {hint && <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p>}
  </AgroCard>
);

export const AgroTable: React.FC<{ headers: string[]; children: ReactNode }> = ({ headers, children }) => (
  <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
    <table className="w-full min-w-[640px] text-left text-sm">
      <thead>
        <tr className="border-b border-slate-200 bg-slate-50">
          {headers.map(h => <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">{h}</th>)}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">{children}</tbody>
    </table>
  </div>
);

export const StatusBadge: React.FC<{ value: string; tone?: 'green' | 'amber' | 'red' | 'blue' | 'violet' | 'slate' }> = ({ value, tone = 'slate' }) => {
  const tones: Record<string, string> = {
    green: 'bg-[#FFFFFF] text-[#1B5E20]',
    amber: 'bg-[#FBF6E9] text-[#A97A14]',
    red: 'bg-rose-50 text-rose-700',
    blue: 'bg-blue-50 text-blue-800',
    violet: 'bg-[#FBF6E9] text-[#A97A14]',
    slate: 'bg-slate-100 text-slate-600',
  };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${tones[tone]}`}>{value}</span>;
};

export const AgroButton: React.FC<{ onClick: () => void; children: ReactNode; variant?: 'primary' | 'ghost' | 'outline'; className?: string }> = ({ onClick, children, variant = 'primary', className = '' }) => {
  const styles = variant === 'primary'
    ? 'bg-[#1B5E20] text-white hover:bg-[#123D18]'
    : variant === 'outline'
      ? 'border border-slate-300 text-slate-700 hover:bg-slate-50'
      : 'text-slate-600 hover:bg-slate-100';
  return (
    <button type="button" onClick={onClick} className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold transition ${styles} ${className}`}>
      {children}
    </button>
  );
};

export const AgroSearch: React.FC<{ value: string; onChange: (v: string) => void; placeholder?: string }> = ({ value, onChange, placeholder = 'Cari...' }) => (
  <div className="relative">
    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#1B5E20]" />
  </div>
);

export const AgroModal: React.FC<{ title: string; onClose: () => void; children: ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
    <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold">{title}</h3>
        <button onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100"><XCircle className="h-5 w-5" /></button>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  </div>
);

export const AgroField: React.FC<{ label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }> = ({ label, value, onChange, type = 'text', placeholder }) => (
  <label className="block text-xs font-bold text-slate-700">
    {label}
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-[#1B5E20]" />
  </label>
);

export const AgroSelect: React.FC<{ label: string; value: string; onChange: (v: string) => void; options: string[] }> = ({ label, value, onChange, options }) => (
  <label className="block text-xs font-bold text-slate-700">
    {label}
    <select value={value} onChange={e => onChange(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5">
      {options.map(o => <option key={o}>{o}</option>)}
    </select>
  </label>
);

export const AgroEmpty: React.FC<{ text?: string }> = ({ text = 'Belum ada data.' }) => (
  <div className="rounded-2xl border border-dashed bg-white p-10 text-center text-sm text-slate-400">
    <FileText className="mx-auto mb-2 h-7 w-7" />{text}
  </div>
);

export const ExportButtons: React.FC<{ title: string; headers: string[]; rows: any[][]; data: Record<string, any>[]; filename: string }> = ({ title, headers, rows, data, filename }) => (
  <div className="flex gap-2">
    <AgroButton variant="outline" onClick={() => exportToExcel(data, filename)}><Download className="h-4 w-4" />Excel</AgroButton>
    <AgroButton variant="outline" onClick={() => exportToPDF(title, headers, rows, filename)}><Download className="h-4 w-4" />PDF</AgroButton>
  </div>
);

// FIX 2026-10-09 (audit dashboard, opsi A): tombol "+ Tambah" disembunyikan
// untuk role non-inputer (canEdit=false: Owner/Finance/Mitra). Sebelumnya
// tombol tampil tapi aksi input gagal diam-diam (RLS menolak) — kelas bug
// "tombol mati diam-diam". MasterDataView memakai `force` karena Owner
// memang pemilik modul master data (canManageMasterData, RLS master_data = OWNER).
export const AddButton: React.FC<{ onClick: () => void; label: string; force?: boolean }> = ({ onClick, label, force }) => {
  if (!force && !canEdit(storeService.currentUser.role)) return null;
  return <AgroButton onClick={onClick}><Plus className="h-4 w-4" />{label}</AgroButton>;
};
