import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BellRing, CheckCircle2, FileText, WalletCards, X, XCircle } from 'lucide-react';
import { financialDocumentsStore, type FundRequest, type Invoice } from '../../services/financialDocuments';
import { storeService } from '../../services/storeService';
import { formatRupiah } from '../../utils/formatters';

/**
 * Toast popup kanan-bawah (non-blocking) untuk kejadian workflow penting:
 * pengajuan dana baru, perubahan status persetujuan, invoice baru, bukti
 * pembayaran masuk/diverifikasi/ditolak.
 *
 * Aturan:
 *  - Hanya kejadian lintas-perangkat (datang via sinkronisasi) yang memicu
 *    popup. Aksi pengguna di perangkat ini sendiri TIDAK memunculkan notif
 *    (dicek lewat audit entry yang actor-nya = user sendiri).
 *  - Data operasional biasa (ternak, pakan, keuangan harian, dll) TIDAK
 *    dinotifikasikan — hanya dokumen workflow (pengajuan dana & invoice).
 *  - Popup auto-dismiss 7 detik, bisa diklik untuk menutup, maks 3 tampil,
 *    tidak menghalangi interaksi UI (pointer-events hanya pada toast itu).
 */

interface ToastItem {
  id: string;
  tone: 'green' | 'amber' | 'red' | 'blue';
  title: string;
  detail: string;
}

interface DiffState {
  funds: Map<string, string>;
  invoices: Map<string, string>;
  auditIds: Set<string>;
}

const fundKey = (item: FundRequest) => JSON.stringify([item.status, item.realizedInvoiceNo ?? '', item.realizedAmount ?? '', item.cancelledReason ?? '']);
const invoiceKey = (item: Invoice) => JSON.stringify([
  item.paymentStatus, item.status,
  item.payments.map(p => [p.id, p.status, p.amount]).sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
]);

const diffMap = (prev: Map<string, string>, list: { id: string }[], keyOf: (item: never) => string) => {
  const added: string[] = [];
  const changed: string[] = [];
  const seen = new Set<string>();
  for (const raw of list) {
    const item = raw as never;
    const id = String((raw as { id: string }).id);
    seen.add(id);
    const key = keyOf(item);
    if (!prev.has(id)) added.push(id);
    else if (prev.get(id) !== key) changed.push(id);
  }
  const removed = [...prev.keys()].filter(id => !seen.has(id));
  return { added, changed, removed };
};

export const NotificationPopup: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  // Priming: snapshot pertama setelah mount = baseline login (jangan spam),
  // cukup satu ringkasan "menunggu tindakan" bila ada.
  const primedRef = useRef(false);
  const prevRef = useRef<DiffState | null>(null);
  const uid = storeService.currentUser.uid;
  const myName = storeService.currentUser.displayName;
  const role = storeService.currentUser.role;

  const pushToast = (toast: Omit<ToastItem, 'id'>) => {
    const item: ToastItem = { ...toast, id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` };
    setToasts(current => [...current.slice(-2), item]);
    setTimeout(() => setToasts(current => current.filter(t => t.id !== item.id)), 7000);
  };

  const isDecisionMaker = role === 'OWNER' || role === 'ACCOUNTANT';

  const summarizePending = (state: ReturnType<typeof financialDocumentsStore.snapshot>) => {
    if (!isDecisionMaker) return;
    const pendingFunds = state.fundRequests.filter(item => item.status === 'Diajukan' || item.status === 'Diverifikasi Akuntan');
    const pendingPayments = state.invoices.flatMap(invoice => invoice.payments
      .filter(payment => payment.status === 'Menunggu Verifikasi')
      .map(payment => ({ invoice, payment })));
    const totalPending = pendingFunds.length + pendingPayments.length;
    if (totalPending > 0) {
      pushToast({
        tone: 'amber',
        title: `${totalPending} dokumen menunggu tindakan`,
        detail: [
          pendingFunds.length > 0 ? `${pendingFunds.length} pengajuan dana` : null,
          pendingPayments.length > 0 ? `${pendingPayments.length} bukti bayar` : null,
        ].filter(Boolean).join(' · '),
      });
    }
  };

  useEffect(() => financialDocumentsStore.subscribe(() => {
    const state = financialDocumentsStore.snapshot();
    const newAudits = state.audits.filter(a => !prevRef.current?.auditIds.has(a.id));
    // Target dokumen yang berubah karena aksi PERANGKAT INI (actor = user sendiri)
    // → tidak boleh memicu popup (aturan: input sendiri tidak dinotifikasikan).
    const selfTargets = new Set(newAudits.filter(a => a.actor === myName).map(a => a.targetId));

    if (!primedRef.current || !prevRef.current) {
      primedRef.current = true;
      prevRef.current = {
        funds: new Map(state.fundRequests.map(item => [item.id, fundKey(item)])),
        invoices: new Map(state.invoices.map(item => [item.id, invoiceKey(item)])),
        auditIds: new Set(state.audits.map(a => a.id)),
      };
      summarizePending(state);
      return;
    }

    const prev = prevRef.current;
    const fundDiff = diffMap(prev.funds, state.fundRequests as unknown as { id: string }[], fundKey as unknown as (item: never) => string);
    const invoiceDiff = diffMap(prev.invoices, state.invoices as unknown as { id: string }[], invoiceKey as unknown as (item: never) => string);
    prevRef.current = {
      funds: new Map(state.fundRequests.map(item => [item.id, fundKey(item)])),
      invoices: new Map(state.invoices.map(item => [item.id, invoiceKey(item)])),
      auditIds: new Set(state.audits.map(a => a.id)),
    };

    // --- Pengajuan dana ---
    for (const idStr of fundDiff.added) {
      const item = state.fundRequests.find(f => f.id === idStr);
      if (!item || item.requesterId === uid || selfTargets.has(idStr)) continue;
      if (isDecisionMaker) {
        pushToast({ tone: 'blue', title: 'Pengajuan dana baru', detail: `${item.requestNo} · ${formatRupiah(item.total)} · ${item.requesterName}` });
      }
    }
    for (const idStr of fundDiff.changed) {
      if (selfTargets.has(idStr)) continue;
      const item = state.fundRequests.find(f => f.id === idStr);
      if (!item) continue;
      if (item.status === 'Disetujui Owner') {
        if (item.requesterId === uid || role === 'MANAGER') pushToast({ tone: 'green', title: 'Pengajuan disetujui Owner', detail: `${item.requestNo} · ${formatRupiah(item.total)}` });
      } else if (item.status === 'Ditolak' || item.status === 'Perlu Revisi') {
        if (item.requesterId === uid) pushToast({ tone: 'red', title: `Pengajuan ${item.status}`, detail: `${item.requestNo}${item.cancelledReason ? ` · ${item.cancelledReason}` : ''}` });
      } else if (item.status === 'Diverifikasi Akuntan') {
        if (item.requesterId === uid || role === 'OWNER') pushToast({ tone: 'blue', title: 'Pengajuan terverifikasi Finance', detail: `${item.requestNo} · menunggu persetujuan Owner` });
      } else if (item.status === 'Direalisasikan Manager') {
        if (role === 'OWNER' || role === 'ACCOUNTANT') pushToast({ tone: 'blue', title: 'Realisasi pengeluaran tercatat', detail: `${item.requestNo} · ${formatRupiah(item.realizedAmount ?? 0)} oleh ${item.realizedBy ?? 'Manager'}` });
      } else if (item.status === 'Selesai') {
        if (role === 'OWNER' || role === 'ACCOUNTANT') pushToast({ tone: 'green', title: 'Realisasi selesai', detail: item.requestNo });
      } else if (item.status === 'Dibatalkan') {
        if (item.requesterId !== uid && isDecisionMaker) pushToast({ tone: 'amber', title: 'Pengajuan dibatalkan pengaju', detail: item.requestNo });
      }
    }

    // --- Invoice & pembayaran ---
    for (const idStr of invoiceDiff.added) {
      const item = state.invoices.find(inv => inv.id === idStr);
      if (!item || selfTargets.has(idStr)) continue;
      if (isDecisionMaker && item.createdBy !== myName) pushToast({ tone: 'blue', title: 'Invoice baru dibuat', detail: `${item.invoiceNo} · ${formatRupiah(item.total)} · ${item.partyName}` });
    }
    for (const idStr of invoiceDiff.changed) {
      if (selfTargets.has(idStr)) continue;
      const item = state.invoices.find(inv => inv.id === idStr);
      if (!item) continue;
      const pending = item.payments.filter(p => p.status === 'Menunggu Verifikasi');
      if (pending.length > 0 && isDecisionMaker) {
        const newest = pending[pending.length - 1];
        if (newest.submittedBy !== myName) pushToast({ tone: 'amber', title: 'Bukti pembayaran menunggu verifikasi', detail: `${item.invoiceNo} · ${formatRupiah(newest.amount)} · ${newest.submittedBy}` });
      }
      const justVerified = item.payments.filter(p => p.status === 'Terverifikasi' && p.verifiedBy && p.verifiedBy !== myName);
      if (justVerified.length > 0) {
        const newest = justVerified[justVerified.length - 1];
        if (newest.submittedBy === myName || item.createdBy === myName || role === 'OWNER') pushToast({ tone: 'green', title: 'Pembayaran terverifikasi', detail: `${item.invoiceNo} · ${formatRupiah(newest.amount)}` });
      }
      const rejected = item.payments.filter(p => p.status === 'Ditolak');
      if (rejected.length > 0) {
        const newest = rejected[rejected.length - 1];
        if (newest.submittedBy === myName && !selfTargets.has(idStr)) pushToast({ tone: 'red', title: 'Bukti pembayaran ditolak', detail: `${item.invoiceNo} · ${newest.rejectionReason ?? ''}` });
      }
      if (item.status === 'Dibatalkan' && isDecisionMaker) pushToast({ tone: 'amber', title: 'Invoice dibatalkan', detail: `${item.invoiceNo} · ${item.cancelledReason ?? ''}` });
    }
  }), [uid, myName, role]);

  const toneClass: Record<ToastItem['tone'], string> = useMemo(() => ({
    green: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    red: 'border-rose-200 bg-rose-50 text-rose-900',
    blue: 'border-blue-200 bg-blue-50 text-blue-900',
  }), []);
  const toneIcon: Record<ToastItem['tone'], React.ReactNode> = useMemo(() => ({
    green: <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />,
    amber: <BellRing className="h-4 w-4 shrink-0 text-amber-600" />,
    red: <XCircle className="h-4 w-4 shrink-0 text-rose-600" />,
    blue: <FileText className="h-4 w-4 shrink-0 text-blue-600" />,
  }), []);

  if (toasts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed bottom-24 right-3 z-[70] flex w-[19rem] max-w-[calc(100vw-1.5rem)] flex-col gap-2 sm:bottom-6 sm:right-6" aria-live="polite">
      {toasts.map(toast => (
        <button
          key={toast.id}
          type="button"
          onClick={() => setToasts(current => current.filter(t => t.id !== toast.id))}
          className={`pointer-events-auto flex w-full items-start gap-2.5 rounded-2xl border p-3 text-left shadow-lg shadow-slate-900/10 backdrop-blur transition animate-[toast-in_.2s_ease-out] ${toneClass[toast.tone]}`}
        >
          {toneIcon[toast.tone]}
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-bold">{toast.title}</span>
            <span className="mt-0.5 block break-words text-[11px] opacity-80">{toast.detail}</span>
          </span>
          <X className="h-3.5 w-3.5 shrink-0 opacity-40" />
        </button>
      ))}
    </div>
  );
};
