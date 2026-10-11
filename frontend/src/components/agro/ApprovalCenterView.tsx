import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Scale, XCircle } from 'lucide-react';
import { agroStore } from '../../services/agroStore';
import { financialDocumentsStore, type Actor } from '../../services/financialDocuments';
import { storeService } from '../../services/storeService';
import { formatDateTime, formatRupiah } from '../../utils/formatters';
import { AgroHeader, AgroCard, StatusBadge, AgroEmpty } from './AgroUI';

/**
 * Pusat Persetujuan — SATU sumber gabungan:
 *  1. Pengajuan dana (financialDocumentsStore.fundRequests) — alur
 *     Diajukan → Diverifikasi Akuntan → Disetujui Owner → Direalisasikan
 *     Manager → Selesai. Verifikasi akuntan & persetujuan owner dilakukan
 *     DI SINI (sinkron dengan DB via dataSync).
 *  2. Approvals legacy agroStore.approvals (purchase order, LPJ, dll).
 *
 * Sebelumnya tab ini hanya membaca agroStore.approvals sehingga pengajuan
 * dana baru TIDAK PERNAH muncul di pusat persetujuan — itulah keluhan
 * "approval center tidak tersinkron".
 */

type FundRow = {
  id: string;
  kind: 'fund';
  ref: string;
  title: string;
  requester: string;
  at: string;
  status: string;
  amount?: number;
  verifiedBy?: string;
  approvedBy?: string;
};

interface Row {
  id: string;
  kind: 'fund' | 'legacy';
  ref: string;
  type: string;
  title: string;
  requester: string;
  at: string;
  status: string;
  amount?: number;
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
}

const actor = (): Actor => ({ uid: storeService.currentUser.uid, name: storeService.currentUser.displayName, role: storeService.currentUser.role });

export const ApprovalCenterView: React.FC = () => {
  const [version, setVersion] = useState(0);
  const [tab, setTab] = useState<'Menunggu' | 'Disetujui' | 'Ditolak'>('Menunggu');
  const [message, setMessage] = useState('');
  const agro = useMemo(() => agroStore.snapshot(), [version]);
  const findoc = useMemo(() => financialDocumentsStore.snapshot(), [version]);
  useEffect(() => {
    const a = agroStore.subscribe(() => setVersion(v => v + 1));
    const b = financialDocumentsStore.subscribe(() => setVersion(v => v + 1));
    return () => { a(); b(); };
  }, []);

  const role = storeService.currentUser.role;
  // v1.1 two pillars: verifikasi = ACCOUNTANT, persetujuan akhir = OWNER.
  const canVerify = role === 'ACCOUNTANT';
  const canApprove = role === 'OWNER';
  const actorName = storeService.currentUser.displayName;

  const fundRows: Row[] = findoc.fundRequests.map(item => ({
    id: `fund:${item.id}`,
    kind: 'fund',
    ref: item.requestNo,
    type: 'Pengajuan Dana',
    title: item.purpose,
    requester: item.requesterName,
    at: item.createdAt,
    status: item.status,
    amount: item.total,
    approvedBy: item.approvedBy,
    notes: item.category ? `${item.category} · ${item.location} · butuh ${item.neededDate}` : undefined,
  }));
  const legacyRows: Row[] = agro.approvals.map(a => ({
    id: `legacy:${a.id}`,
    kind: 'legacy',
    ref: a.referenceNo,
    type: a.type,
    title: a.title,
    requester: a.requester,
    at: a.requestedAt,
    status: a.status,
    approvedBy: a.approvedBy,
    approvedAt: a.approvedAt,
    notes: a.notes,
  }));

  // Pengajuan dana: Menunggu = Diajukan/Diverifikasi Akuntan.
  // Ditolak bucket juga memuat Perlu Revisi / Dibatalkan.
  const bucketOf = (row: Row) => {
    if (row.kind === 'fund') {
      if (row.status === 'Diajukan' || row.status === 'Diverifikasi Akuntan') return 'Menunggu';
      if (row.status === 'Ditolak' || row.status === 'Perlu Revisi' || row.status === 'Dibatalkan') return 'Ditolak';
      return 'Disetujui';
    }
    return row.status as 'Menunggu' | 'Disetujui' | 'Ditolak';
  };
  const allRows = [...fundRows, ...legacyRows].sort((a, b) => b.at.localeCompare(a.at));
  const counts = {
    Menunggu: allRows.filter(r => bucketOf(r) === 'Menunggu').length,
    Disetujui: allRows.filter(r => bucketOf(r) === 'Disetujui').length,
    Ditolak: allRows.filter(r => bucketOf(r) === 'Ditolak').length,
  };
  const filtered = allRows.filter(r => bucketOf(r) === tab);

  const run = (operation: () => unknown, success: string) => {
    try { operation(); setMessage(success); } catch (error) { setMessage(error instanceof Error ? error.message : 'Operasi gagal.'); }
  };

  const decideFund = (row: Row, action: 'verify' | 'approve' | 'reject') => {
    const fundId = row.id.replace(/^fund:/, '');
    if (action === 'verify') {
      run(() => financialDocumentsStore.verifyFundRequest(fundId, actor()), `Pengajuan ${row.ref} diverifikasi.`);
    } else if (action === 'approve') {
      run(() => financialDocumentsStore.approveFundRequest(fundId, actor()), `Pengajuan ${row.ref} disetujui Owner.`);
    } else {
      const reason = window.prompt('Alasan penolakan / revisi:');
      if (!reason || !reason.trim()) return;
      run(() => financialDocumentsStore.updateFundStatus(fundId, 'Ditolak', reason.trim(), actor()), `Pengajuan ${row.ref} ditolak.`);
    }
  };

  const decideLegacy = (row: Row, status: 'Disetujui' | 'Ditolak') => {
    agroStore.update('approvals', row.id.replace(/^legacy:/, ''), {
      status,
      approvedBy: actorName,
      approvedAt: new Date().toISOString(),
    });
    setMessage(`Pengajuan ${status === 'Disetujui' ? 'disetujui' : 'ditolak'}.`);
  };

  const toneOf = (s: string) => (s === 'Disetujui' || s === 'Selesai' || s === 'Disetujui Owner' || s === 'Direalisasikan Manager' ? 'green' : (s === 'Ditolak' || s === 'Dibatalkan' || s === 'Perlu Revisi') ? 'red' : 'amber') as 'green' | 'amber' | 'red';

  return (
    <div className="space-y-5 pb-16">
      <AgroHeader
        kicker="Finance Control"
        title="Pusat Persetujuan"
        subtitle="Pengajuan dana, purchase order, LPJ, dan invoice dalam satu ruang putusan."
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
        {filtered.map(row => (
          <AgroCard key={row.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[#1B5E20]">{row.ref} · {row.type}{row.amount != null ? ` · ${formatRupiah(row.amount)}` : ''}</p>
                <h4 className="mt-1 font-bold text-slate-900">{row.title}</h4>
                <p className="mt-0.5 text-xs text-slate-500">Pengaju: {row.requester} · {formatDateTime(row.at)}</p>
                {row.notes && <p className="mt-1 text-xs text-slate-600">{row.notes}</p>}
                {row.approvedBy && (
                  <p className="mt-1 text-[11px] text-slate-400">
                    Diputuskan oleh {row.approvedBy}{row.approvedAt ? ` · ${formatDateTime(row.approvedAt)}` : ''}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge value={row.status} tone={toneOf(row.status)} />
                {row.kind === 'fund' && row.status === 'Menunggu' ? null : null}
                {row.kind === 'fund' && canVerify && row.status === 'Diajukan' && (
                  <>
                    <button onClick={() => decideFund(row, 'verify')} className="inline-flex items-center gap-1 rounded-lg bg-[#FFFFFF] px-3 py-2 text-xs font-bold text-[#1B5E20] hover:bg-[#F8FAFC]">
                      <CheckCircle2 className="h-4 w-4" />Verifikasi
                    </button>
                    <button onClick={() => decideFund(row, 'reject')} className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100">
                      <XCircle className="h-4 w-4" />Tolak
                    </button>
                  </>
                )}
                {row.kind === 'fund' && canApprove && (row.status === 'Diajukan' || row.status === 'Diverifikasi Akuntan') && (
                  <>
                    <button onClick={() => decideFund(row, 'approve')} className="inline-flex items-center gap-1 rounded-lg bg-[#FFFFFF] px-3 py-2 text-xs font-bold text-[#1B5E20] hover:bg-[#F8FAFC]">
                      <CheckCircle2 className="h-4 w-4" />Setujui
                    </button>
                    <button onClick={() => decideFund(row, 'reject')} className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100">
                      <XCircle className="h-4 w-4" />Tolak
                    </button>
                  </>
                )}
                {row.kind === 'legacy' && canApprove && row.status === 'Menunggu' && (
                  <>
                    <button onClick={() => decideLegacy(row, 'Disetujui')} className="inline-flex items-center gap-1 rounded-lg bg-[#FFFFFF] px-3 py-2 text-xs font-bold text-[#1B5E20] hover:bg-[#F8FAFC]">
                      <CheckCircle2 className="h-4 w-4" />Setujui
                    </button>
                    <button onClick={() => decideLegacy(row, 'Ditolak')} className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100">
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

      {!canApprove && !canVerify && (
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-500">
          <Scale className="h-4 w-4" /> Hanya Owner (persetujuan) dan Finance (verifikasi) yang dapat memproses pengajuan.
        </div>
      )}
      {canApprove && !canVerify && counts.Menunggu > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-500">
          <Scale className="h-4 w-4" /> Owner dapat menyetujui langsung dari status Diajukan (verifikasi Finance dilewati).
        </div>
      )}
    </div>
  );
};
