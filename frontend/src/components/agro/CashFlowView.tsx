import React, { useEffect, useMemo, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { agroStore, makeId } from '../../services/agroStore';
import { storeService } from '../../services/storeService';
import type { CashTransaction } from '../../types';
import { formatRupiah } from '../../utils/formatters';
import { canCreate, canEditModule, canDelete } from '../../services/permissions';
import { AgroHeader, AgroCard, AgroStat, AgroTable, StatusBadge, AgroButton, AgroSearch, AgroModal, AgroField, AgroSelect, AgroEmpty, AddButton } from './AgroUI';

const emptyDraft = (): Omit<CashTransaction, 'id' | 'createdAt'> => ({
  referenceNo: '',
  date: new Date().toISOString().slice(0, 10),
  type: 'Masuk',
  category: '',
  description: '',
  amount: 0,
  sourceDivision: '',
  paymentMethod: 'Transfer Bank',
  officerName: '',
});

// Arus kas masuk & keluar: catat dan kelola transaksi keuangan.
export const CashFlowView: React.FC = () => {
  const [version, setVersion] = useState(0);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'Semua' | 'Masuk' | 'Keluar'>('Semua');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft());
  const canWrite = canCreate(storeService.currentUser.role, 'cash-flow') && canEditModule(storeService.currentUser.role, 'cash-flow');
  const canRemove = canDelete(storeService.currentUser.role, 'cash-flow');
  const state = useMemo(() => agroStore.snapshot(), [version]);
  useEffect(() => agroStore.subscribe(() => setVersion(v => v + 1)), []);

  const txs = state.cashTransactions;
  const totalMasuk = txs.filter(t => t.type === 'Masuk').reduce((s, t) => s + t.amount, 0);
  const totalKeluar = txs.filter(t => t.type === 'Keluar').reduce((s, t) => s + t.amount, 0);

  const filtered = txs
    .filter(t => typeFilter === 'Semua' || t.type === typeFilter)
    .filter(t => {
      const q = search.toLowerCase();
      return (
        t.referenceNo.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.sourceDivision.toLowerCase().includes(q)
      );
    });

  const openCreate = () => { setDraft(emptyDraft()); setEditingId(null); setShowForm(true); };
  const openEdit = (t: CashTransaction) => {
    setDraft({
      referenceNo: t.referenceNo, date: t.date, type: t.type, category: t.category,
      description: t.description, amount: t.amount, sourceDivision: t.sourceDivision,
      paymentMethod: t.paymentMethod, officerName: t.officerName, notes: t.notes,
    });
    setEditingId(t.id);
    setShowForm(true);
  };

  const save = () => {
    if (!draft.referenceNo.trim() || !draft.description.trim() || draft.amount <= 0) return;
    const payload: CashTransaction = {
      ...draft,
      id: editingId ?? makeId('cash'),
      createdAt: editingId ? txs.find(t => t.id === editingId)?.createdAt ?? new Date().toISOString() : new Date().toISOString(),
    };
    if (editingId) agroStore.update('cashTransactions', editingId, { ...payload } as Record<string, unknown>);
    else agroStore.add('cashTransactions', payload);
    setShowForm(false);
  };

  const remove = (id: string) => {
    if (!canRemove) { window.alert('Hanya Owner/Finance yang dapat menghapus transaksi kas.'); return; }
    if (confirm('Hapus transaksi ini?')) agroStore.remove('cashTransactions', id);
  };

  return (
    <div className="space-y-5 pb-16">
      <AgroHeader
        kicker="Finance Control"
        title="Kas Masuk & Keluar"
        subtitle="Catat pemasukan dan pengeluaran, filter berdasarkan jenis, dan pantau saldo."
      />

      <div className="grid grid-cols-3 gap-3">
        <AgroStat label="Kas Masuk" value={formatRupiah(totalMasuk)} />
        <AgroStat label="Kas Keluar" value={formatRupiah(totalKeluar)} />
        <AgroStat label="Saldo" value={formatRupiah(totalMasuk - totalKeluar)} accent />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full sm:w-72"><AgroSearch value={search} onChange={setSearch} placeholder="Cari referensi, deskripsi, kategori..." /></div>
        <AgroSelect label="" value={typeFilter} onChange={v => setTypeFilter(v as typeof typeFilter)} options={['Semua', 'Masuk', 'Keluar']} />
        {canWrite && <div className="ml-auto"><AddButton onClick={openCreate} label="Tambah Transaksi" /></div>}
      </div>

      {filtered.length === 0 ? (
        <AgroEmpty text="Tidak ada transaksi yang cocok." />
      ) : (
        <AgroTable headers={['Referensi', 'Tanggal', 'Jenis', 'Kategori', 'Deskripsi', 'Divisi', 'Metode', 'Jumlah', 'Aksi']}>
          {filtered.map(t => (
            <tr key={t.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-bold text-[#1B5E20]">{t.referenceNo}</td>
              <td className="px-4 py-3 text-slate-600">{t.date}</td>
              <td className="px-4 py-3"><StatusBadge value={t.type} tone={t.type === 'Masuk' ? 'green' : 'red'} /></td>
              <td className="px-4 py-3 text-slate-700">{t.category}</td>
              <td className="px-4 py-3 text-slate-700">{t.description}</td>
              <td className="px-4 py-3 text-slate-500">{t.sourceDivision}</td>
              <td className="px-4 py-3 text-slate-500">{t.paymentMethod}</td>
              <td className={`px-4 py-3 font-bold ${t.type === 'Masuk' ? 'text-[#1B5E20]' : 'text-rose-700'}`}>{formatRupiah(t.amount)}</td>
              <td className="px-4 py-3">
                <div className="flex gap-1">
                  {canWrite && <AgroButton variant="ghost" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></AgroButton>}
                  {canRemove && <AgroButton variant="ghost" onClick={() => remove(t.id)}><Trash2 className="h-4 w-4" /></AgroButton>}
                </div>
              </td>
            </tr>
          ))}
        </AgroTable>
      )}

      {showForm && (
        <AgroModal title={editingId ? 'Edit Transaksi' : 'Tambah Transaksi'} onClose={() => setShowForm(false)}>
          <AgroField label="Nomor Referensi" value={draft.referenceNo} onChange={v => setDraft({ ...draft, referenceNo: v })} placeholder="KAS-2026-003" />
          <div className="grid grid-cols-2 gap-3">
            <AgroField label="Tanggal" type="date" value={draft.date} onChange={v => setDraft({ ...draft, date: v })} />
            <AgroSelect label="Jenis" value={draft.type} onChange={v => setDraft({ ...draft, type: v as CashTransaction['type'] })} options={['Masuk', 'Keluar']} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <AgroField label="Kategori" value={draft.category} onChange={v => setDraft({ ...draft, category: v })} placeholder="Penjualan, Pembelian Pakan..." />
            <AgroField label="Divisi Sumber" value={draft.sourceDivision} onChange={v => setDraft({ ...draft, sourceDivision: v })} placeholder="Perikanan, Kebun..." />
          </div>
          <AgroField label="Deskripsi" value={draft.description} onChange={v => setDraft({ ...draft, description: v })} placeholder="Keterangan transaksi" />
          <div className="grid grid-cols-2 gap-3">
            <AgroField label="Jumlah (Rp)" type="number" value={draft.amount === 0 ? '' : String(draft.amount)} onChange={v => setDraft({ ...draft, amount: Number(v) })} placeholder="0" />
            <AgroSelect label="Metode Pembayaran" value={draft.paymentMethod} onChange={v => setDraft({ ...draft, paymentMethod: v })} options={['Transfer Bank', 'Tunai', 'QRIS', 'Cek/Giro']} />
          </div>
          <AgroField label="Petugas" value={draft.officerName} onChange={v => setDraft({ ...draft, officerName: v })} placeholder="Nama petugas" />
          <div className="flex gap-2 pt-1">
            <AgroButton onClick={save} className="flex-1 justify-center">Simpan</AgroButton>
            <AgroButton variant="outline" onClick={() => setShowForm(false)}>Batal</AgroButton>
          </div>
        </AgroModal>
      )}
    </div>
  );
};
