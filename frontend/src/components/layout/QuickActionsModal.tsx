import React from 'react';
import {
  X, FileSpreadsheet, Scale, HeartPulse, Baby, Skull,
  PlusCircle, Wallet, Wheat
} from 'lucide-react';

interface QuickActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (actionKey: string) => void;
}

export const QuickActionsModal: React.FC<QuickActionsModalProps> = ({
  isOpen,
  onClose,
  onSelectAction
}) => {
  if (!isOpen) return null;

  const actions = [
    {
      id: 'add-daily-report',
      label: '+ LAPORAN HARIAN',
      desc: 'Input laporan populasi, aktivitas, & biaya harian kandang',
      color: 'bg-[#123D18] text-white border-[#1B5E20] hover:bg-[#1B5E20]',
      icon: <FileSpreadsheet className="w-6 h-6 text-[#F8FAFC]" />
    },
    {
      id: 'add-weight',
      label: '+ TIMBANG BOBOT',
      desc: 'Catat timbangan bobot ternak rutin',
      color: 'bg-[#FFFFFF] text-[#123D18] border-[#F1F5F9] hover:bg-[#F8FAFC]',
      icon: <Scale className="w-6 h-6 text-[#1B5E20]" />
    },
    {
      id: 'add-feed',
      label: '+ INPUT PAKAN',
      desc: 'Tambah stok pakan & catat masuk/keluar',
      color: 'bg-[#FFFFFF] text-[#123D18] border-[#F1F5F9] hover:bg-[#F8FAFC]',
      icon: <Wheat className="w-6 h-6 text-[#1B5E20]" />
    },
    {
      id: 'add-health',
      label: '+ LAPOR KESEHATAN',
      desc: 'Catat ternak sakit, obat, & penanganan medis',
      color: 'bg-rose-50 text-rose-900 border-rose-200 hover:bg-rose-100',
      icon: <HeartPulse className="w-6 h-6 text-rose-600" />
    },
    {
      id: 'add-birth',
      label: '+ LAPOR KELAHIRAN',
      desc: 'Catat anak ternak baru lahir & hubungkan ke induk',
      color: 'bg-[#FBF6E9] text-[#A97A14] border-[#EED995] hover:bg-[#F6EBC9]',
      icon: <Baby className="w-6 h-6 text-[#C9971C]" />
    },
    {
      id: 'add-death',
      label: '+ LAPOR KEMATIAN',
      desc: 'Dokumentasikan kematian ternak secara resmi',
      color: 'bg-slate-100 text-slate-900 border-slate-300 hover:bg-slate-200',
      icon: <Skull className="w-6 h-6 text-slate-700" />
    },
    {
      id: 'add-finance',
      label: '+ TRANSAKSI BIAYA/PEMASUKAN',
      desc: 'Catat pemasukan atau pengeluaran operasional',
      color: 'bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-100',
      icon: <Wallet className="w-6 h-6 text-blue-600" />
    },
    {
      id: 'add-livestock',
      label: '+ TERNAK BARU',
      desc: 'Daftarkan ternak baru masuk kandang',
      color: 'bg-purple-50 text-purple-900 border-purple-200 hover:bg-purple-100',
      icon: <PlusCircle className="w-6 h-6 text-purple-600" />
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex animate-fade-in items-end justify-center bg-slate-900/60 p-0 backdrop-blur-xs sm:items-center sm:p-4">
      <div className="flex max-h-[94dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:max-h-[92vh] sm:rounded-2xl">
        
        {/* Header */}
        <div className="shrink-0 bg-[#123D18] px-4 pt-4 pb-3 text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-white/15 shrink-0">
              <FileSpreadsheet className="w-5 h-5 text-[#F8FAFC]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold leading-tight">Aksi Cepat Petugas Kandang</h3>
              <p className="text-[11px] text-[#F1F5F9] mt-0.5">Pilih tindakan operasional untuk diinput</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#F1F5F9] hover:text-white hover:bg-white/10 rounded-lg transition shrink-0"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Grid */}
        <div className="p-4 space-y-2.5 overflow-y-auto">
          {actions.map(act => (
            <button
              key={act.id}
              onClick={() => {
                onSelectAction(act.id);
                onClose();
              }}
              className={`w-full p-3.5 rounded-xl border flex items-center gap-3.5 text-left transition transform active:scale-[0.99] cursor-pointer ${act.color}`}
            >
              <div className="p-2 rounded-lg bg-white/80 shadow-2xs shrink-0">
                {act.icon}
              </div>
              <div>
                <p className="text-xs font-bold tracking-tight">{act.label}</p>
                <p className="text-[11px] opacity-80 leading-tight">{act.desc}</p>
              </div>
            </button>
          ))}
        </div>

      </div>
    </div>
  );
};
