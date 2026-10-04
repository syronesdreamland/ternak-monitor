import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Pencil, Plus, Trash2, Truck, XCircle } from 'lucide-react';
import { agroStore, makeId } from '../../services/agroStore';
import { storeService } from '../../services/storeService';
import { PurchaseOrder } from '../../types';
import { formatRupiah, formatDate } from '../../utils/formatters';
import { canCreate, canEditModule, canDelete } from '../../services/permissions';
import {
  AgroHeader, AgroStat, AgroTable, StatusBadge, AgroButton,
  AgroSearch, AgroModal, AgroField, AgroSelect, AgroEmpty, AddButton,
} from './AgroUI';

interface Draft {
  poNo: string; supplierName: string; itemName: string; quantity: string;
  unit: string; unitPrice: string; orderDate: string; expectedDeliveryDate: string; status: string;
}

const emptyDraft = (): Draft => ({ poNo: '', supplierName: '', itemName: '', quantity: '', unit: 'sak', unitPrice: '', orderDate: new Date().toISOString().slice(0, 10), expectedDeliveryDate: '', status: 'Draft' });
const nextPoNo = (count: number) => `PO-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;

export const PurchaseOrderView: React.FC = () => {
  const [version, setVersion] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [editing, setEditing] = useState<PurchaseOrder | null>(null);
  const [showForm, setShowForm] = useState(false);
  const canWrite = canCreate(storeService.currentUser.role, 'purchase-order') && canEditModule(storeService.currentUser.role, 'purchase-order');
  const canRemove = canDelete(storeService.currentUser.role, 'purchase-order');
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const state = useMemo(() => agroStore.snapshot(), [version]);
  useEffect(() => agroStore.subscribe(() => setVersion(v => v + 1)), []);

  const orders = state.purchaseOrders;
  const setField = (patch: Partial<Draft>) => setDraft(d => ({ ...d, ...patch }));
  const totalAmount = (Number(draft.quantity) || 0) * (Number(draft.unitPrice) || 0);

  const filtered = orders.filter(o =>
    (statusFilter === 'Semua' || o.status === statusFilter) &&
    (o.poNo + o.supplierName + o.itemName).toLowerCase().includes(search.toLowerCase()));

  const totalValue = orders.filter(o => o.status !== 'Batal').reduce((s, o) => s + o.totalAmount, 0);
  const toneFor = (status: string) => status === 'Diterima' ? 'green' : status === 'Batal' ? 'red' : status === 'Dipesan' ? 'blue' : 'slate';

  const openAdd = () => { setEditing(null); setDraft({ ...emptyDraft(), poNo: nextPoNo(orders.length) }); setShowForm(true); };
  const openEdit = (item: PurchaseOrder) => {
    setEditing(item);
    setDraft({ poNo: item.poNo, supplierName: item.supplierName, itemName: item.itemName, quantity: String(item.quantity), unit: item.unit, unitPrice: String(item.unitPrice), orderDate: item.orderDate, expectedDeliveryDate: item.expectedDeliveryDate, status: item.status });
    setShowForm(true);
  };

  const save = () => {
    const payload = {
      poNo: draft.poNo, supplierName: draft.supplierName, itemName: draft.itemName,
      quantity: Number(draft.quantity) || 0, unit: draft.unit, unitPrice: Number(draft.unitPrice) || 0,
      totalAmount, orderDate: draft.orderDate, expectedDeliveryDate: draft.expectedDeliveryDate,
      status: draft.status as PurchaseOrder['status'], createdAt: new Date().toISOString(),
    };
    if (editing) {
      agroStore.update('purchaseOrders', editing.id, payload);
      storeService.addAuditLog('Purchase Order', 'Edit PO', editing.id, payload.poNo);
    } else {
      agroStore.add('purchaseOrders', { ...payload, id: makeId('po') });
      storeService.addAuditLog('Purchase Order', 'Buat PO', payload.poNo, payload.itemName);
    }
    setShowForm(false);
  };

  const remove = (item: PurchaseOrder) => {
    if (!canRemove) { window.alert('Hanya Manager/Developer yang dapat menghapus PO.'); return; }
    if (!window.confirm(`Hapus PO "${item.poNo}"?`)) return;
    agroStore.remove('purchaseOrders', item.id);
    storeService.addAuditLog('Purchase Order', 'Hapus PO', item.id, item.poNo);
  };

  const setStatus = (item: PurchaseOrder, status: PurchaseOrder['status']) => {
    if (!canWrite) { window.alert('Hanya Manager/Developer yang dapat mengubah status PO.'); return; }
    agroStore.update('purchaseOrders', item.id, { status });
    storeService.addAuditLog('Purchase Order', `Status PO: ${status}`, item.id, item.poNo, item.status, status);
  };

  const rows = filtered.map(o => (
    <tr key={o.id}>
      <td className="px-4 py-3 font-semibold text-slate-800">{o.poNo}</td>
      <td className="px-4 py-3 font-semibold text-slate-800">{o.supplierName}</td>
      <td className="px-4 py-3 text-slate-600">{o.itemName}</td>
      <td className="px-4 py-3 font-semibold">{o.quantity} {o.unit}</td>
      <td className="px-4 py-3 text-slate-600">{formatRupiah(o.unitPrice)}</td>
      <td className="px-4 py-3 font-semibold">{formatRupiah(o.totalAmount)}</td>
      <td className="px-4 py-3 text-slate-600">{formatDate(o.expectedDeliveryDate).split(',')[0]}</td>
      <td className="px-4 py-3"><StatusBadge value={o.status} tone={toneFor(o.status)} /></td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {o.status === 'Draft' && <AgroButton variant="ghost" onClick={() => setStatus(o, 'Dipesan')}><Truck className="h-4 w-4 text-blue-600" />Pesan</AgroButton>}
          {o.status === 'Dipesan' && <AgroButton variant="ghost" onClick={() => setStatus(o, 'Diterima')}><CheckCircle2 className="h-4 w-4 text-[#2E7D43]" />Terima</AgroButton>}
          {(o.status === 'Draft' || o.status === 'Dipesan') && <AgroButton variant="ghost" onClick={() => setStatus(o, 'Batal')}><XCircle className="h-4 w-4 text-rose-500" />Batal</AgroButton>}
          {(o.status === 'Draft') && (
            <>
              <AgroButton variant="ghost" onClick={() => openEdit(o)}><Pencil className="h-4 w-4" /></AgroButton>
              <AgroButton variant="ghost" onClick={() => remove(o)}><Trash2 className="h-4 w-4 text-rose-500" /></AgroButton>
            </>
          )}
        </div>
      </td>
    </tr>
  ));

  return (
    <div className="space-y-5 pb-16">
      <AgroHeader
        kicker="Inventory & Purchasing"
        title="Purchase Order"
        subtitle="Kelola pesanan pembelian ke supplier dengan total otomatis dan alur status."
        actions={canWrite ? <AddButton onClick={openAdd} label="Buat PO" /> : undefined}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AgroStat label="Total PO" value={String(orders.length)} hint="Semua status" />
        <AgroStat label="Nilai PO Aktif" value={formatRupiah(totalValue)} hint="Di luar Batal" accent />
        <AgroStat label="Dalam Pengiriman" value={String(orders.filter(o => o.status === 'Dipesan').length)} hint="Status Dipesan" />
        <AgroStat label="Diterima" value={String(orders.filter(o => o.status === 'Diterima').length)} hint="Barang tiba" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex-1"><AgroSearch value={search} onChange={setSearch} placeholder="Cari PO / supplier / barang..." /></div>
        <AgroSelect label="" value={statusFilter} onChange={setStatusFilter} options={['Semua', 'Draft', 'Dipesan', 'Diterima', 'Batal']} />
      </div>

      {filtered.length === 0 ? <AgroEmpty text="Belum ada purchase order." /> : (
        <AgroTable headers={['No. PO', 'Supplier', 'Barang', 'Jumlah', 'Harga', 'Total', 'Estimasi Tiba', 'Status', 'Aksi']}>{rows}</AgroTable>
      )}

      {showForm && (
        <AgroModal title={editing ? 'Edit PO' : 'Buat PO Baru'} onClose={() => setShowForm(false)}>
          <AgroField label="Nomor PO" value={draft.poNo} onChange={v => setField({ poNo: v })} />
          <AgroField label="Nama Supplier" value={draft.supplierName} onChange={v => setField({ supplierName: v })} />
          <AgroField label="Nama Barang" value={draft.itemName} onChange={v => setField({ itemName: v })} />
          <div className="grid grid-cols-2 gap-3">
            <AgroField label="Jumlah" type="number" value={draft.quantity} onChange={v => setField({ quantity: v })} />
            <AgroField label="Satuan" value={draft.unit} onChange={v => setField({ unit: v })} />
          </div>
          <AgroField label="Harga Satuan" type="number" value={draft.unitPrice} onChange={v => setField({ unitPrice: v })} />
          <div className="rounded-xl bg-[#FBF6E9]/60 p-3 text-sm font-bold text-[#1B5E20]">Total Otomatis: {formatRupiah(totalAmount)}</div>
          <div className="grid grid-cols-2 gap-3">
            <AgroField label="Tanggal Pesan" type="date" value={draft.orderDate} onChange={v => setField({ orderDate: v })} />
            <AgroField label="Estimasi Tiba" type="date" value={draft.expectedDeliveryDate} onChange={v => setField({ expectedDeliveryDate: v })} />
          </div>
          {editing && <AgroSelect label="Status" value={draft.status} onChange={v => setField({ status: v })} options={['Draft', 'Dipesan', 'Diterima', 'Batal']} />}
          <AgroButton onClick={save} className="w-full justify-center">{editing ? 'Simpan Perubahan' : 'Simpan PO'}</AgroButton>
        </AgroModal>
      )}
    </div>
  );
};

export default PurchaseOrderView;
