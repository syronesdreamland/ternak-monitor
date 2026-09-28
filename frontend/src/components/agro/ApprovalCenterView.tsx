import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Scale, XCircle } from 'lucide-react';
import { agroStore } from '../../services/agroStore';
import { storeService } from '../../services/storeService';
import { formatDateTime } from '../../utils/formatters';
import { AgroHeader, AgroCard, StatusBadge, AgroEmpty } from './AgroUI';

// Pusat persetujuan: Owner/Manager menyetujui/menolak pengajuan.
export const ApprovalCenterView: React.FC = () => {
  const [version, setVersion] = useState(0);
  const [tab, setTab] = useState<'Menunggu' | 'Disetujui' | 'Ditolak'>('Menunggu');
  const [message, setMessage] = useState('');
  const state = useMemo(() => agroStore.snapshot(), [version]);
  useEffect(() => agroStore.subscribe(() => setVersion(v => v + 1)), []);

  const role = storeService.currentUser.role;
  // v1.1 two pillars: persetujuan hanya milik OWNER (Manager = eksekutor,
  // bukan pengambil keputusan). Lainnya view-only.
  const canDecide = role === 'OWNER';
  const actorName = storeService.currentUser.displayName;

  const filtered = state.approvals.filter(a => a.status === tab);
  const counts = {
    Menunggu: state.approvals.filter(a => a.status === 'Menunggu').length,
    Disetujui: state.approvals.filter(a => a.status === 'Disetujui').length,
    Ditolak: state.approvals.filter(a => a.status === 'Ditolak').length,
  };

  const decide = (id: string, status: 'Disetujui' | 'Ditolak') => {
    agroStore.update('approvals', id, {
      status,
      approvedBy: actorName,
      approvedAt: new Date().toISOString(),
    });
    setMessage(`Pengajuan ${status === 'Disetujui' ? 'disetujui' : 'ditolak'}.`);
  };

  const toneOf = (s: string) => (s === 'Disetujui' ? 'green' : s === 'Ditolak' ? 'red' : 'amber') as 'green' | 'amber' | 'red';

  return (
    <div className="space-y-5 pb-16">
      <AgroHeader
        kicker="Finance Control"
        title="Pusat Persetujuan"
        subtitle="Tinjau dan putuskan pengajuan dana, purchase order, LPJ, dan invoice."
      />

      <div className="flex gap-2 rounded-2xl border bg-white p-2">
        {(['Menunggu', 'Disetujui', 'Ditolak'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-xl px-4 py-3 text-xs font-bold ${tab === t ? 'bg-[#1B5E20] text-white' : 'text-slate-500'}`}
          >
            {t} ({counts[t]})
          </button>
        ))}
      </div>

      {message && <div role="status" className="rounded-xl border border-[#EED995] bg-[#FBF6E9] p-3 text-xs font-bold text-[#A97A14]">{message}</div>}

      <div className="space-y-3">
        {filtered.map(a => (
          <AgroCard key={a.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[#1B5E20]">{a.referenceNo} · {a.type}</p>
                <h4 className="mt-1 font-bold text-slate-900">{a.title}</h4>
                <p className="mt-0.5 text-xs text-slate-500">Pengaju: {a.requester} · {formatDateTime(a.requestedAt)}</p>
                {a.notes && <p className="mt-1 text-xs text-slate-600">{a.notes}</p>}
                {a.approvedBy && (
                  <p className="mt-1 text-[11px] text-slate-400">
                    Diputuskan oleh {a.approvedBy}{a.approvedAt ? ` · ${formatDateTime(a.approvedAt)}` : ''}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge value={a.status} tone={toneOf(a.status)} />
                {canDecide && a.status === 'Menunggu' && (
                  <>
                    <button
                      onClick={() => decide(a.id, 'Disetujui')}
                      className="inline-flex items-center gap-1 rounded-lg bg-[#FFFFFF] px-3 py-2 text-xs font-bold text-[#1B5E20] hover:bg-[#F8FAFC]"
                    >
                      <CheckCircle2 className="h-4 w-4" />Setujui
                    </button>
                    <button
                      onClick={() => decide(a.id, 'Ditolak')}
                      className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100"
                    >
                      <XCircle className="h-4 w-4" />Tolak
                    </button>
                  </>
                )}
              </div>
            </div>
          </AgroCard>
        ))}
        {filtered.length === 0 && <AgroEmpty text={`Belum ada pengajuan berstatus "${tab}".`} />}
      </div>

      {!canDecide && (
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-500">
          <Scale className="h-4 w-4" /> Hanya Owner yang dapat menyetujui atau menolak pengajuan.
        </div>
      )}
    </div>
  );
};
