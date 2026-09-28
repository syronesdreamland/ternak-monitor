import React, { useEffect, useState } from 'react';
import { ArrowRight, Camera, Pencil, Plus, ReceiptText, Trash2, WalletCards, X } from 'lucide-react';
import { storeService } from '../../services/storeService';
import { saveAttachments, getAttachment, parseAttachmentId } from '../../services/r2Storage';
import { canEditModule, canDelete } from '../../services/permissions';
import { FinancialTransaction } from '../../types';
import { formatDate, formatRupiah } from '../../utils/formatters';

type OperationalExpenseCategory = 'Pakan' | 'Obat & Vitamin' | 'Tenaga Kerja' | 'Transportasi' | 'Operasional Lainnya';

const expenseCategories: Array<{
  value: OperationalExpenseCategory;
  label: string;
  description: string;
  color: string;
}> = [
  { value: 'Pakan', label: 'Pakan', description: 'Konsentrat, rumput, silase, mineral', color: 'text-[#A97A14] bg-[#FBF6E9]' },
  { value: 'Obat & Vitamin', label: 'Obat & Vitamin', description: 'Obat, vaksin, vitamin, pemeriksaan', color: 'text-rose-700 bg-rose-50' },
  { value: 'Tenaga Kerja', label: 'Tenaga Kerja', description: 'Gaji, upah harian, lembur, jasa', color: 'text-blue-700 bg-blue-50' },
  { value: 'Transportasi', label: 'Transportasi', description: 'Bahan bakar, pengiriman, perjalanan', color: 'text-[#A97A14] bg-[#FBF6E9]' },
  { value: 'Operasional Lainnya', label: 'Lainnya', description: 'Listrik, air, kandang, administrasi', color: 'text-slate-700 bg-slate-100' },
];

interface ExpenseManagementViewProps {
  onOpenFinance: () => void;
}

export const ExpenseManagementView: React.FC<ExpenseManagementViewProps> = ({ onOpenFinance }) => {
  const [transactions, setTransactions] = useState(storeService.financialTransactions);
  const [locations, setLocations] = useState(storeService.locations);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [proofFiles, setProofFiles] = useState<File[]>([]);
  const currentPeriod = new Date().toISOString().slice(0, 7);
  const [selectedPeriod, setSelectedPeriod] = useState(currentPeriod);
  const role = storeService.currentUser.role;
  // v1.1: menu Pengeluaran adalah area kerja Manager (inputer keuangan).
  const canManageExpense = canEditModule(role, 'expenses');
  const canRemoveExpense = canDelete(role, 'expenses');

  const [category, setCategory] = useState<OperationalExpenseCategory>('Pakan');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceNo, setInvoiceNo] = useState(`EXP-${Date.now().toString().slice(-6)}`);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [locationId, setLocationId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Transfer Bank');
  const [payeePayer, setPayeePayer] = useState('');

  useEffect(() => storeService.subscribe(() => {
    setTransactions(storeService.financialTransactions);
    setLocations(storeService.locations);
  }), []);

  const allowedCategories = new Set<string>(expenseCategories.map(item => item.value));
  const periodLabel = new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${selectedPeriod}-01T00:00:00Z`));
  const expenses = transactions.filter(transaction =>
    transaction.type === 'expense'
    && allowedCategories.has(transaction.category)
    && transaction.date.startsWith(selectedPeriod)
  );
  const totalExpense = expenses.reduce((total, transaction) => total + transaction.amount, 0);

  const openNewExpense = (initialCategory: OperationalExpenseCategory = 'Pakan') => {
    const today = new Date().toISOString().split('T')[0];
    setEditingId(null);
    setCategory(initialCategory);
    setDate(selectedPeriod === currentPeriod ? today : `${selectedPeriod}-01`);
    setInvoiceNo(`EXP-${Math.floor(100000 + Math.random() * 900000)}`);
    setAmount('');
    setDescription('');
    setLocationId(locations[0]?.id ?? '');
    setPaymentMethod('Transfer Bank');
    setPayeePayer('');
    setIsModalOpen(true);
  };

  const openEditExpense = (transaction: FinancialTransaction) => {
    setEditingId(transaction.id);
    setCategory(transaction.category as OperationalExpenseCategory);
    setDate(transaction.date);
    setInvoiceNo(transaction.invoiceNo);
    setAmount(String(transaction.amount));
    setDescription(transaction.description);
    setLocationId(transaction.locationId);
    setPaymentMethod(transaction.paymentMethod);
    setPayeePayer(transaction.payeePayer);
    setIsModalOpen(true);
  };

  const saveExpense = (event: React.FormEvent) => {
    event.preventDefault();
    const location = locations.find(item => item.id === locationId) ?? locations[0];
    if (!location) return;

    const expenseData: Omit<FinancialTransaction, 'id' | 'createdAt'> = {
      invoiceNo,
      date,
      type: 'expense' as const,
      category,
      description,
      locationId: location.id,
      locationName: location.name,
      amount: Number(amount) || 0,
      paymentMethod,
      payeePayer,
      createdBy: storeService.currentUser.displayName,
    };

    const finish = async () => {
      // v1.1 Pindai Nota: foto bukti transaksi diunggah ke R2 dan ditautkan
      // ke kolom proofUrl transaksi (tampil di riwayat + laporan Owner).
      if (proofFiles.length > 0) {
        try {
          const ids = await saveAttachments(proofFiles);
          const parsed = parseAttachmentId(ids[0]);
          if (parsed.url) expenseData.proofUrl = parsed.url;
        } catch (error) {
          console.error('Upload nota gagal:', error);
          window.alert('Pengeluaran tetap tersimpan, namun unggah nota gagal. Coba unggah ulang lewat Edit.');
        }
      }
      if (editingId) storeService.updateFinancialTransaction(editingId, expenseData);
      else storeService.addFinancialTransaction(expenseData);
      setSelectedPeriod(date.slice(0, 7));
      setEditingId(null);
      setProofFiles([]);
      setIsModalOpen(false);
    };
    void finish();
  };

  const deleteExpense = (transaction: FinancialTransaction) => {
    const confirmed = window.confirm(
      `Hapus pengeluaran ${transaction.invoiceNo} sebesar ${formatRupiah(transaction.amount)}?\n\nTransaksi juga akan hilang dari Laporan Laba Rugi.`
    );
    if (confirmed) storeService.deleteFinancialTransaction(transaction.id);
  };

  const categoryLabel = (value: string) => expenseCategories.find(item => item.value === value)?.label ?? value;

  return (
    <div className="space-y-3 pb-24 animate-fade-in sm:space-y-4 md:pb-12">
      <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <WalletCards className="h-5 w-5 text-[#1B5E20]" /> Pengelola Pengeluaran
          </h2>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500 sm:text-xs">Kelola biaya pakan, kesehatan, tenaga kerja, transportasi, dan operasional lainnya.</p>
        </div>
        <button type="button" onClick={onOpenFinance} className="inline-flex w-fit items-center gap-2 rounded-xl border border-[#F1F5F9] bg-[#FFFFFF] px-3.5 py-2.5 text-xs font-bold text-[#123D18] transition hover:bg-[#F8FAFC]">
          Buka Laporan Laba Rugi <ArrowRight className="h-4 w-4" />
        </button>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#1B5E20]">Periode bulanan</p>
            <h3 className="mt-1 text-base font-bold capitalize text-slate-900">{periodLabel}</h3>
            <p className="mt-0.5 text-[10px] text-slate-500">{expenses.length} transaksi pengeluaran tercatat</p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[auto_auto]">
            <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <span className="text-[10px] font-bold text-slate-500">Periode</span>
              <input type="month" value={selectedPeriod} onChange={event => setSelectedPeriod(event.target.value || currentPeriod)} className="bg-transparent text-xs font-bold text-slate-800 outline-none" aria-label="Pilih periode pengeluaran" />
            </label>
            {canManageExpense && (
            <button type="button" onClick={() => openNewExpense()} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#123D18] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#1B5E20]">
              <Plus className="h-4 w-4" /> Catat Pengeluaran
            </button>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-end justify-between rounded-xl bg-slate-950 p-4 text-white">
          <div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Total pengeluaran bulan ini</span>
            <strong className="mt-1 block font-mono text-2xl font-bold">{formatRupiah(totalExpense)}</strong>
          </div>
          <ReceiptText className="h-6 w-6 text-[#E2E8F0]" />
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
        <div className="border-b border-slate-100 px-4 py-3.5">
          <h3 className="text-sm font-bold text-slate-900">Pengeluaran per Kategori</h3>
          <p className="mt-0.5 text-[10px] text-slate-500">Ketuk kategori untuk langsung mencatat biaya.</p>
        </div>
        <div className="grid grid-flow-col auto-cols-[minmax(155px,1fr)] gap-px overflow-x-auto bg-slate-200 sm:grid-flow-row sm:grid-cols-3 sm:auto-cols-auto xl:grid-cols-5">
          {expenseCategories.map(item => {
            const categoryTotal = expenses
              .filter(transaction => transaction.category === item.value)
              .reduce((total, transaction) => total + transaction.amount, 0);
            return (
              <button key={item.value} type="button" onClick={() => openNewExpense(item.value)} className="bg-white p-4 text-left transition hover:bg-slate-50">
                <span className={`inline-flex rounded-md px-2 py-1 text-[9px] font-bold ${item.color}`}>{item.label}</span>
                <strong className="mt-2 block font-mono text-base font-bold text-rose-600">{formatRupiah(categoryTotal)}</strong>
                <span className="mt-1 block text-[9px] leading-relaxed text-slate-400">{item.description}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3.5">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Riwayat Pengeluaran</h3>
            <p className="mt-0.5 text-[10px] text-slate-500">Tersinkron otomatis dengan Laporan Laba Rugi</p>
          </div>
          <span className="text-[10px] font-bold text-slate-500">{expenses.length} Transaksi</span>
        </div>

        <div className="divide-y divide-slate-100 md:hidden">
          {expenses.map(transaction => (
            <article key={transaction.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="inline-flex rounded-md bg-rose-50 px-2 py-1 text-[9px] font-bold text-rose-700">{categoryLabel(transaction.category)}</span>
                  <p className="mt-2 text-xs font-bold leading-relaxed text-slate-800">{transaction.description}</p>
                </div>
                <strong className="shrink-0 font-mono text-sm font-bold text-rose-600">-{formatRupiah(transaction.amount)}</strong>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-1 text-[10px] text-slate-500">
                <span className="truncate font-mono font-bold text-slate-700">{transaction.invoiceNo}</span>
                <span className="truncate text-right">{transaction.locationName}</span>
                <span className="truncate">{formatDate(transaction.date)}</span>
                <span className="truncate text-right">{transaction.paymentMethod}</span>
              </div>
              <div className="mt-3 flex justify-end gap-2 border-t border-slate-100 pt-2.5">
                {canManageExpense && <button type="button" onClick={() => openEditExpense(transaction)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-blue-50 px-3 text-[10px] font-bold text-blue-700"><Pencil className="h-3.5 w-3.5" /> Edit</button>}
                {canRemoveExpense && <button type="button" onClick={() => deleteExpense(transaction)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-rose-50 px-3 text-[10px] font-bold text-rose-700"><Trash2 className="h-3.5 w-3.5" /> Hapus</button>}
              </div>
            </article>
          ))}
          {expenses.length === 0 && <div className="p-10 text-center text-xs text-slate-400">Belum ada pengeluaran pada periode {periodLabel}.</div>}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="p-3.5">Tanggal</th><th className="p-3.5">Referensi</th><th className="p-3.5">Kategori</th><th className="p-3.5">Keterangan</th><th className="p-3.5">Lokasi</th><th className="p-3.5 text-right">Nominal</th><th className="p-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenses.map(transaction => (
                <tr key={transaction.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap p-3.5 text-slate-600">{formatDate(transaction.date)}</td>
                  <td className="p-3.5 font-mono font-bold">{transaction.invoiceNo}</td>
                  <td className="p-3.5"><span className="whitespace-nowrap rounded-md bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-700">{categoryLabel(transaction.category)}</span></td>
                  <td className="min-w-52 p-3.5 font-semibold text-slate-700">{transaction.description}</td>
                  <td className="whitespace-nowrap p-3.5 text-slate-600">{transaction.locationName}</td>
                  <td className="whitespace-nowrap p-3.5 text-right font-mono text-sm font-bold text-rose-600">-{formatRupiah(transaction.amount)}</td>
                  <td className="p-3.5"><div className="flex justify-end gap-1">{canManageExpense && <button type="button" onClick={() => openEditExpense(transaction)} className="rounded-lg p-1.5 text-blue-700 hover:bg-blue-50" aria-label={`Edit ${transaction.invoiceNo}`}><Pencil className="h-4 w-4" /></button>}{canRemoveExpense && <button type="button" onClick={() => deleteExpense(transaction)} className="rounded-lg p-1.5 text-rose-700 hover:bg-rose-50" aria-label={`Hapus ${transaction.invoiceNo}`}><Trash2 className="h-4 w-4" /></button>}{transaction.proofUrl && <a href={transaction.proofUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg p-1.5 text-[#1B5E20] hover:bg-emerald-50" aria-label={`Lihat nota ${transaction.invoiceNo}`}><Camera className="h-4 w-4" /></a>}</div></td>
                </tr>
              ))}
              {expenses.length === 0 && <tr><td colSpan={7} className="p-10 text-center text-slate-400">Belum ada pengeluaran pada periode {periodLabel}.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-xs sm:items-center sm:p-4">
          <div className="max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:max-h-[92vh] sm:rounded-2xl">
            <div className="sticky top-0 flex items-center justify-between bg-[#123D18] p-4 font-bold text-white">
              <h3>{editingId ? 'Edit Pengeluaran' : 'Catat Pengeluaran'}</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="rounded p-1 hover:bg-[#1B5E20]" aria-label="Tutup form"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={saveExpense} className="space-y-3 p-4 text-xs sm:p-5">
              <div>
                <label className="mb-1 block font-bold text-slate-700">Kategori *</label>
                <select value={category} onChange={event => setCategory(event.target.value as OperationalExpenseCategory)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-bold outline-none focus:ring-2 focus:ring-[#1B5E20]">
                  {expenseCategories.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div><label className="mb-1 block font-bold text-slate-700">Tanggal *</label><input type="date" value={date} onChange={event => setDate(event.target.value)} required className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#1B5E20]" /></div>
                <div><label className="mb-1 block font-bold text-slate-700">Nomor Referensi *</label><input value={invoiceNo} onChange={event => setInvoiceNo(event.target.value)} required className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono outline-none focus:ring-2 focus:ring-[#1B5E20]" /></div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div><label className="mb-1 block font-bold text-slate-700">Nominal *</label><input type="number" min="1" value={amount} onChange={event => setAmount(event.target.value)} required placeholder="Contoh: 500000" className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono font-bold outline-none focus:ring-2 focus:ring-[#1B5E20]" /></div>
                <div><label className="mb-1 block font-bold text-slate-700">Lokasi *</label><select value={locationId} onChange={event => setLocationId(event.target.value)} required className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#1B5E20]">{locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}</select></div>
              </div>
              <div><label className="mb-1 block font-bold text-slate-700">Keterangan *</label><input value={description} onChange={event => setDescription(event.target.value)} required placeholder="Contoh: Pembelian konsentrat 10 karung" className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#1B5E20]" /></div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div><label className="mb-1 block font-bold text-slate-700">Metode Pembayaran</label><select value={paymentMethod} onChange={event => setPaymentMethod(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#1B5E20]"><option value="Transfer Bank">Transfer Bank</option><option value="Tunai">Tunai</option><option value="Giro">Giro</option></select></div>
                <div><label className="mb-1 block font-bold text-slate-700">Penerima</label><input value={payeePayer} onChange={event => setPayeePayer(event.target.value)} placeholder="Supplier atau penerima" className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#1B5E20]" /></div>
              </div>
              <div>
                <label className="mb-1 block font-bold text-slate-700">Pindai Nota (foto bukti)</label>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-[#1B5E20] bg-[#F8FAFC] px-3 py-2.5 text-xs font-bold text-[#1B5E20]">
                  <Camera className="h-4 w-4" />
                  {proofFiles.length > 0 ? `${proofFiles.length} file siap diunggah — ketuk untuk mengganti` : 'Ambil foto nota / pilih file (maks 5 MB)'}
                  <input type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" capture="environment" className="hidden" onChange={event => { setProofFiles([...(event.target.files ?? [])]); event.target.value=''; }} />
                </label>
                {proofFiles.length > 0 && <p className="mt-1 text-[10px] text-slate-400">{proofFiles.map(file => file.name).join(', ')}</p>}
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={() => setIsModalOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700">Batal</button><button type="submit" className="rounded-lg bg-[#123D18] px-5 py-2 font-bold text-white hover:bg-[#1B5E20]">{editingId ? 'Simpan Perubahan' : 'Simpan Pengeluaran'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
