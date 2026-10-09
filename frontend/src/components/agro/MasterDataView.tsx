import React, { useEffect, useMemo, useState } from 'react';
import { Database, Info, Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { agroStore, makeId } from '../../services/agroStore';
import { storeService } from '../../services/storeService';
import { MasterDataItem } from '../../types';
import {
  AgroHeader, AgroCard, AgroStat, AgroTable, StatusBadge, AgroButton,
  AgroSearch, AgroModal, AgroField, AgroSelect, AgroEmpty, AddButton,
} from './AgroUI';

interface Draft {
  category: string; name: string; value: string;
}

const emptyDraft = (): Draft => ({ category: 'Divisi', name: '', value: '' });
const CATEGORIES: MasterDataItem['category'][] = ['Role', 'Lokasi', 'Kategori Biaya', 'Satuan', 'Divisi'];

export const MasterDataView: React.FC = () => {
  const [version, setVersion] = useState(0);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Semua');
  const [editing, setEditing] = useState<MasterDataItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const state = useMemo(() => agroStore.snapshot(), [version]);
  useEffect(() => agroStore.subscribe(() => setVersion(v => v + 1)), []);

  const masterData = state.masterData;
  const role = storeService.currentUser.role;
  const setField = (patch: Partial<Draft>) => setDraft(d => ({ ...d, ...patch }));

  const filtered = masterData.filter(m =>
    (categoryFilter === 'Semua' || m.category === categoryFilter) &&
    (m.name + m.value + m.category).toLowerCase().includes(search.toLowerCase()));

  const activeCount = masterData.filter(m => m.isActive).length;

  const openAdd = () => { setEditing(null); setDraft(emptyDraft()); setShowForm(true); };
  const openEdit = (item: MasterDataItem) => {
    setEditing(item);
    setDraft({ category: item.category, name: item.name, value: item.value });
    setShowForm(true);
  };

  const save = () => {
    const payload = {
      category: draft.category as MasterDataItem['category'], name: draft.name, value: draft.value,
      isActive: editing?.isActive ?? true, createdAt: editing?.createdAt ?? new Date().toISOString(),
    };
    if (editing) {
      agroStore.update('masterData', editing.id, payload);
      storeService.addAuditLog('Master Data', 'Edit Master Data', editing.id, payload.name);
    } else {
      agroStore.add('masterData', { ...payload, id: makeId('md') });
      storeService.addAuditLog('Master Data', 'Tambah Master Data', payload.category, payload.name);
    }
    setShowForm(false);
  };

  const remove = (item: MasterDataItem) => {
    if (!window.confirm(`Hapus "${item.name}"?`)) return;
    agroStore.remove('masterData', item.id);
    storeService.addAuditLog('Master Data', 'Hapus Master Data', item.id, item.name);
  };

  const toggleActive = (item: MasterDataItem) => {
    agroStore.update('masterData', item.id, { isActive: !item.isActive });
    storeService.addAuditLog('Master Data', item.isActive ? 'Nonaktifkan' : 'Aktifkan', item.id, item.name);
  };

  const rows = filtered.map(m => (
    <tr key={m.id}>
      <td className="px-4 py-3 font-semibold text-slate-800">{m.category}</td>
      <td className="px-4 py-3 font-semibold text-slate-800">{m.name}</td>
      <td className="px-4 py-3 text-slate-600">{m.value}</td>
      <td className="px-4 py-3"><StatusBadge value={m.isActive ? 'Aktif' : 'Nonaktif'} tone={m.isActive ? 'green' : 'slate'} /></td>
      <td className="px-4 py-3">
        <div className="flex gap-1">
          <AgroButton variant="ghost" onClick={() => toggleActive(m)}>{m.isActive ? 'Nonaktifkan' : 'Aktifkan'}</AgroButton>
          <AgroButton variant="ghost" onClick={() => openEdit(m)}><Pencil className="h-4 w-4" /></AgroButton>
          <AgroButton variant="ghost" onClick={() => remove(m)}><Trash2 className="h-4 w-4 text-rose-500" /></AgroButton>
        </div>
      </td>
    </tr>
  ));

  return (
    <div className="space-y-5 pb-16">
      <AgroHeader
        kicker="Report & System"
        title="Master Data & Role"
        subtitle="Kelola data referensi sistem: peran, lokasi, kategori biaya, satuan, dan divisi."
        actions={<AddButton force onClick={openAdd} label="Tambah Data" />}
      />

      <AgroCard className="border-[#E4C25E]/50 bg-[#FBF6E9]/50">
        <p className="flex items-center gap-2 text-sm font-bold text-[#1B5E20]"><ShieldCheck className="h-4 w-4" />Hak Akses Pengelolaan</p>
        <p className="mt-1 text-sm text-slate-600">Pengelolaan master data (tambah, ubah, hapus, aktif/nonaktif) merupakan kewenangan khusus. Hanya pengguna dengan peran <span className="font-bold text-[#1B5E20]">DEVELOPER</span> (dan ADMIN) yang dapat mengubah data referensi sistem. Perubahan akan tercatat di Audit Trail.</p>
        <p className="mt-1 text-xs text-slate-500">Peran Anda saat ini: <span className="font-bold">{role}</span>.</p>
      </AgroCard>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AgroStat label="Total Entri" value={String(masterData.length)} hint="Semua kategori" />
        <AgroStat label="Aktif" value={String(activeCount)} hint="Sedang digunakan" accent />
        <AgroStat label="Nonaktif" value={String(masterData.length - activeCount)} hint="Tidak dipakai" />
        <AgroStat label="Kategori" value={String(CATEGORIES.length)} hint="Tipe data" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex-1"><AgroSearch value={search} onChange={setSearch} placeholder="Cari nama / nilai..." /></div>
        <AgroSelect label="" value={categoryFilter} onChange={setCategoryFilter} options={['Semua', ...CATEGORIES]} />
      </div>

      {filtered.length === 0 ? <AgroEmpty text="Belum ada master data." /> : (
        <AgroTable headers={['Kategori', 'Nama', 'Nilai', 'Status', 'Aksi']}>{rows}</AgroTable>
      )}

      {showForm && (
        <AgroModal title={editing ? 'Edit Master Data' : 'Tambah Master Data'} onClose={() => setShowForm(false)}>
          <AgroSelect label="Kategori" value={draft.category} onChange={v => setField({ category: v })} options={CATEGORIES} />
          <AgroField label="Nama (Label)" value={draft.name} onChange={v => setField({ name: v })} />
          <AgroField label="Nilai (Value)" value={draft.value} onChange={v => setField({ value: v })} />
          <AgroButton onClick={save} className="w-full justify-center">{editing ? 'Simpan Perubahan' : 'Simpan Data'}</AgroButton>
        </AgroModal>
      )}
    </div>
  );
};

export default MasterDataView;
