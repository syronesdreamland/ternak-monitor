import React, { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { agroStore, makeId } from '../../services/agroStore';
import { storeService } from '../../services/storeService';
import type { LpjItem, LpjReport } from '../../types';
import { formatRupiah } from '../../utils/formatters';
import { canCreate, canEditModule, canDelete } from '../../services/permissions';
import { AgroHeader, AgroCard, AgroStat, AgroTable, StatusBadge, AgroButton, AgroSearch, AgroModal, AgroField, AgroSelect, AgroEmpty, AddButton } from './AgroUI';

const emptyItem = (): LpjItem => ({ id: makeId('lpj-i'), description: '', category: '', amount: 0 });

// LPJ (Laporan Pertanggungjawaban) dana per divisi.
export const LpjView: React.FC = () => {
  const [version, setVersion] = useState(0);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const canWrite = canCreate(storeService.currentUser.role, 'lpj') && canEditModule(storeService.currentUser.role, 'lpj');
  const canRemove = canDelete(storeService.currentUser.role, 'lpj');
  const [title, setTitle] = useState('');
  const [division, setDivision] = useState('');
  const [periodStart, setPeriodStart] = useState(new Date().toISOString().slice(0, 10));
  const [periodEnd, setPeriodEnd] = useState(new Date().toISOString().slice(0, 10));
  const [totalAllocated, setTotalAllocated] = useState(0);
  const [submittedBy, setSubmittedBy] = useState('');
  const [items, setItems] = useState<LpjItem[]>([emptyItem()]);
  const state = useMemo(() => agroStore.snapshot(), [version]);
  useEffect(() => agroStore.subscribe(() => setVersion(v => v + 1)), []);

  const reports = state.lpjReports;
  const filtered = reports.filter(r => {
    const q = search.toLowerCase();
    return r.referenceNo.toLowerCase().includes(q) || r.title.toLowerCase().includes(q) || r.division.toLowerCase().includes(q);
  });

  const openCreate = () => {
    setEditingId(null);
    setTitle(''); setDivision(''); setTotalAllocated(0); setSubmittedBy('');
    setPeriodStart(new Date().toISOString().slice(0, 10));
    setPeriodEnd(new Date().toISOString().slice(0, 10));
    setItems([emptyItem()]);
    setShowForm(true);
  };

  const openEdit = (r: LpjReport) => {
    setEditingId(r.id);
    setTitle(r.title); setDivision(r.division); setTotalAllocated(r.totalAllocated); setSubmittedBy(r.submittedBy);
    setPeriodStart(r.periodStart); setPeriodEnd(r.periodEnd);
    setItems(r.items.length ? r.items.map(i => ({ ...i })) : [emptyItem()]);
    setShowForm(true);
  };

  const totalSpent = items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const remaining = totalAllocated - totalSpent;

  const setItem = (index: number, patch: Partial<LpjItem>) =>
    setItems(prev => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));

  const save = () => {
    if (!title.trim() || !division.trim()) return;
    const payload: LpjReport = {
      id: editingId ?? makeId('lpj'),
      referenceNo: editingId
        ? reports.find(r => r.id === editingId)?.referenceNo ?? 'LPJ'
        : `LPJ-${new Date().getFullYear()}-${String(reports.length + 1).padStart(3, '0')}`,
      title: title.trim(),
      division: division.trim(),
      periodStart,
      periodEnd,
      totalAllocated,
      totalSpent,
      remaining,
      status: 'Draft',
      items: items.filter(i => i.description.trim()),
      submittedBy: submittedBy.trim(),
      createdAt: editingId ? reports.find(r => r.id === editingId)?.createdAt ?? new Date().toISOString() : new Date().toISOString(),
    };
    if (editingId) agroStore.update('lpjReports', editingId, { ...payload } as Record<string, unknown>);
    else agroStore.add('lpjReports', payload);
    setShowForm(false);
  };

  const advanceStatus = (r: LpjReport) => {
    if (!canWrite) { window.alert('Hanya Manager/Developer yang dapat mengubah LPJ.'); return; }
    const next = r.status === 'Draft' ? 'Diajukan' : r.status === 'Diajukan' ? 'Diverifikasi' : r.status === 'Diverifikasi' ? 'Disetujui' : r.status;
    agroStore.update('lpjReports', r.id, { status: next });
  };

  const toneOf = (s: string) =>
    (s === 'Disetujui' ? 'green' : s === 'Revisi' ? 'red' : s === 'Draft' ? 'slate' : 'amber') as 'green' | 'amber' | 'red' | 'slate';

  return (
    <div className="space-y-5 pb-16">
      <AgroHeader
        kicker="Finance Control"
        title="LPJ Pertanggungjawaban"
        subtitle="Kelola laporan pertanggungjawaban dana beserta rincian belanjanya."
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full sm:w-72"><AgroSearch value={search} onChange={setSearch} placeholder="Cari referensi, judul, divisi..." /></div>
        {canWrite && <div className="ml-auto"><AddButton onClick={openCreate} label="Buat LPJ" /></div>}
      </div>

      {filtered.length === 0 ? (
        <AgroEmpty text="Belum ada LPJ." />
      ) : (
        <div className="space-y-3">
          {filtered.map(r => (
            <AgroCard key={r.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-[#1B5E20]">{r.referenceNo} · {r.division}</p>
                  <h4 className="mt-1 font-bold text-slate-900">{r.title}</h4>
                  <p className="mt-0.5 text-xs text-slate-500">Periode {r.periodStart} s/d {r.periodEnd} · Oleh {r.submittedBy}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge value={r.status} tone={toneOf(r.status)} />
                  {canWrite && r.status !== 'Disetujui' && <AgroButton variant="outline" onClick={() => advanceStatus(r)}>Lanjutkan</AgroButton>}
                  {canWrite && <AgroButton variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></AgroButton>}
                  {canRemove && <AgroButton variant="ghost" onClick={() => { if (confirm('Hapus LPJ ini?')) agroStore.remove('lpjReports', r.id); }}><Trash2 className="h-4 w-4" /></AgroButton>}
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3">
                <AgroStat label="Dana Dialokasikan" value={formatRupiah(r.totalAllocated)} />
                <AgroStat label="Terpakai" value={formatRupiah(r.totalSpent)} />
                <AgroStat label="Sisa" value={formatRupiah(r.remaining)} accent />
              </div>
            </AgroCard>
          ))}
        </div>
      )}

      {showForm && (
        <AgroModal title={editingId ? 'Edit LPJ' : 'Buat LPJ Baru'} onClose={() => setShowForm(false)}>
          <AgroField label="Judul" value={title} onChange={setTitle} placeholder="LPJ Operasional September" />
          <div className="grid grid-cols-2 gap-3">
            <AgroField label="Divisi" value={division} onChange={setDivision} placeholder="Perikanan, Kebun..." />
            <AgroField label="Dana Dialokasikan (Rp)" type="number" value={totalAllocated === 0 ? '' : String(totalAllocated)} onChange={v => setTotalAllocated(Number(v))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <AgroField label="Periode Mulai" type="date" value={periodStart} onChange={setPeriodStart} />
            <AgroField label="Periode Selesai" type="date" value={periodEnd} onChange={setPeriodEnd} />
          </div>
          <AgroField label="Diajukan Oleh" value={submittedBy} onChange={setSubmittedBy} placeholder="Nama pengaju" />

          <div className="rounded-xl bg-slate-50 p-3">
            <p className="mb-2 text-xs font-bold text-slate-700">Rincian Belanja</p>
            <div className="space-y-2">
              {items.map((it, i) => (
                <div key={it.id} className="grid grid-cols-12 gap-2">
                  <div className="col-span-5"><AgroField label={i === 0 ? 'Deskripsi' : ''} value={it.description} onChange={v => setItem(i, { description: v })} placeholder="Rincian" /></div>
                  <div className="col-span-3"><AgroField label={i === 0 ? 'Kategori' : ''} value={it.category} onChange={v => setItem(i, { category: v })} placeholder="Kategori" /></div>
                  <div className="col-span-3"><AgroField label={i === 0 ? 'Jumlah (Rp)' : ''} type="number" value={it.amount === 0 ? '' : String(it.amount)} onChange={v => setItem(i, { amount: Number(v) })} /></div>
                  <div className="col-span-1 flex items-end justify-center pb-1">
                    <button onClick={() => setItems(prev => prev.filter((_, idx) => idx !== i))} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setItems(prev => [...prev, emptyItem()])} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#1B5E20]"><Plus className="h-4 w-4" />Tambah Rincian</button>
          </div>

          <div className="rounded-xl bg-[#FBF6E9]/60 p-3 text-xs font-bold text-slate-700">
            Terpakai: {formatRupiah(totalSpent)} · Sisa: {formatRupiah(remaining)}
          </div>

          <div className="flex gap-2 pt-1">
            <AgroButton onClick={save} className="flex-1 justify-center">Simpan</AgroButton>
            <AgroButton variant="outline" onClick={() => setShowForm(false)}>Batal</AgroButton>
          </div>
        </AgroModal>
      )}
    </div>
  );
};
