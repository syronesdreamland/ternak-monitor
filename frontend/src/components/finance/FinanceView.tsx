import React, { useEffect, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Pencil, Plus, Trash2, Wallet, X } from 'lucide-react';
import { storeService } from '../../services/storeService';
import { FinancialCategoryType, FinancialTransaction } from '../../types';
import { formatDate, formatRupiah } from '../../utils/formatters';
import { FinancePeriodGranularity, summarizeFinancePeriod } from '../../services/financeSummary';
import { canCreate, canEditModule } from '../../services/permissions';

const categoryOptions: Array<{ value: FinancialCategoryType; label: string }> = [
  { value: 'Penjualan Ternak', label: 'Penjualan Sapi' },
  { value: 'Pembelian Ternak', label: 'Pembelian Sapi' },
  { value: 'Pakan', label: 'Pakan' },
  { value: 'Obat & Vitamin', label: 'Obat & Vitamin' },
  { value: 'Tenaga Kerja', label: 'Tenaga Kerja' },
  { value: 'Transportasi', label: 'Transportasi' },
  { value: 'Operasional Lainnya', label: 'Operasional Lainnya' },
];

const categorySummaries: Array<{
  category: FinancialCategoryType;
  label: string;
  direction: 'income' | 'expense';
}> = [
  { category: 'Penjualan Ternak', label: 'Penjualan Sapi', direction: 'income' },
  { category: 'Pembelian Ternak', label: 'Pembelian Sapi', direction: 'expense' },
  { category: 'Pakan', label: 'Pakan', direction: 'expense' },
  { category: 'Obat & Vitamin', label: 'Obat & Vitamin', direction: 'expense' },
  { category: 'Tenaga Kerja', label: 'Tenaga Kerja', direction: 'expense' },
  { category: 'Transportasi', label: 'Transportasi', direction: 'expense' },
  { category: 'Operasional Lainnya', label: 'Operasional Lainnya', direction: 'expense' },
];

function getCategoryLabel(category: string) {
  return categoryOptions.find(option => option.value === category)?.label ?? category;
}

export const FinanceView: React.FC = () => {
  const [transactions, setTransactions] = useState(storeService.financialTransactions);
  const [locations, setLocations] = useState(storeService.locations);
  const [currentUser, setCurrentUser] = useState(storeService.currentUser);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const today = new Date();
  const currentMonth = today.toISOString().slice(0, 7);
  const currentYear = String(today.getUTCFullYear());
  const [granularity, setGranularity] = useState<FinancePeriodGranularity>('month');
  const [selectedPeriod, setSelectedPeriod] = useState(currentMonth);

  const [invoiceNo, setInvoiceNo] = useState(`TRX-${Date.now().toString().slice(-6)}`);
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<FinancialCategoryType>('Pakan');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [locationId, setLocationId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Transfer Bank');
  const [payeePayer, setPayeePayer] = useState('');

  useEffect(() => storeService.subscribe(() => {
    setTransactions(storeService.financialTransactions);
    setLocations(storeService.locations);
    setCurrentUser(storeService.currentUser);
  }), []);

  const periodTransactions = transactions.filter(transaction => transaction.date.startsWith(selectedPeriod));
  const periodLabel = granularity === 'year'
    ? selectedPeriod
    : new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' })
      .format(new Date(`${selectedPeriod}-01T00:00:00Z`));
  const summary = summarizeFinancePeriod({
    transactions,
    sales: storeService.salesRecords,
    period: selectedPeriod,
    granularity,
  });
  const { income: totalIncome, expenses: totalExpense, grossProfit, netProfit } = summary;
  const isOwner = currentUser.role === 'OWNER';
  const canWriteFinance = canCreate(currentUser.role, 'finance') && canEditModule(currentUser.role, 'finance');
  const transactionType: 'income' | 'expense' = category === 'Penjualan Ternak' ? 'income' : 'expense';

  const handleOpenModal = (initialCategory: FinancialCategoryType = 'Pakan') => {
    const today = new Date().toISOString().split('T')[0];
    setEditingTransactionId(null);
    setInvoiceNo(`TRX-${Math.floor(100000 + Math.random() * 900000)}`);
    const defaultDate = granularity === 'year'
      ? `${selectedPeriod}-01-01`
      : (selectedPeriod === currentMonth ? today : `${selectedPeriod}-01`);
    setTransactionDate(defaultDate);
    setCategory(initialCategory);
    setDescription('');
    setAmount('');
    setPaymentMethod('Transfer Bank');
    setPayeePayer('');
    setLocationId(locations[0]?.id ?? '');
    setIsModalOpen(true);
  };

  const handleEditTransaction = (transaction: FinancialTransaction) => {
    setEditingTransactionId(transaction.id);
    setInvoiceNo(transaction.invoiceNo);
    setTransactionDate(transaction.date);
    setCategory(transaction.category as FinancialCategoryType);
    setDescription(transaction.description);
    setAmount(String(transaction.amount));
    setLocationId(transaction.locationId);
    setPaymentMethod(transaction.paymentMethod);
    setPayeePayer(transaction.payeePayer);
    setIsModalOpen(true);
  };

  const handleDeleteTransaction = (transaction: FinancialTransaction) => {
    if (!isOwner || storeService.currentUser.role !== 'OWNER') {
      window.alert('Hanya Owner yang dapat menghapus transaksi buku kas.');
      return;
    }
    const linkedSalesNote = transaction.category === 'Penjualan Ternak'
      ? '\n\nInvoice pada daftar penjualan tidak ikut dihapus.'
      : '';
    const confirmed = window.confirm(
      `Hapus transaksi ${transaction.invoiceNo} sebesar ${formatRupiah(transaction.amount)}?${linkedSalesNote}\n\nData yang dihapus tidak dapat dikembalikan.`
    );
    if (confirmed) storeService.deleteFinancialTransaction(transaction.id);
  };

  const handleSaveTransaction = (event: React.FormEvent) => {
    event.preventDefault();
    const location = locations.find(item => item.id === locationId) ?? locations[0];
    if (!location) return;

    const transactionData = {
      invoiceNo,
      date: transactionDate,
      type: transactionType,
      category,
      description,
      locationId: location.id,
      locationName: location.name,
      amount: Number(amount) || 0,
      paymentMethod,
      payeePayer,
      createdBy: storeService.currentUser.displayName,
    };

    if (editingTransactionId) {
      storeService.updateFinancialTransaction(editingTransactionId, transactionData);
    } else {
      storeService.addFinancialTransaction(transactionData);
    }
    setSelectedPeriod(transactionDate.slice(0, 7));
    setIsModalOpen(false);
    setEditingTransactionId(null);
  };

  return (
    <div className="space-y-3 pb-24 animate-fade-in sm:space-y-4 md:pb-12">
      <header className="ranch-panel rounded-2xl border p-4 sm:p-5">
        <div>
          <h2 className="ranch-heading flex items-center gap-2 text-lg font-bold">
            <Wallet className="h-5 w-5 text-[#1B5E20]" />
            <span>Laporan Laba Rugi</span>
          </h2>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500 sm:text-xs">{canWriteFinance ? 'Catat pemasukan penjualan sapi dan seluruh pengeluaran operasional peternakan.' : 'Ringkasan pemasukan, pengeluaran, dan laba. Pencatatan dilakukan oleh Owner/Akuntan.'}</p>
        </div>
      </header>

      <section className="ranch-panel flex flex-col gap-3 rounded-2xl border p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#1B5E20]">Ringkasan {granularity === 'month' ? 'bulanan' : 'tahunan'}</p>
          <h3 className="mt-1 text-base font-bold capitalize text-slate-900">Periode {periodLabel}</h3>
          <p className="mt-0.5 text-[10px] text-slate-500">Angka ringkasan dan daftar transaksi mengikuti periode yang dipilih.</p>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 lg:flex lg:w-auto lg:items-center">
          <label className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="text-[10px] font-bold text-slate-500">Mode</span>
            <select
              value={granularity}
              onChange={event => {
                const next = event.target.value as FinancePeriodGranularity;
                setGranularity(next);
                setSelectedPeriod(next === 'month' ? currentMonth : currentYear);
              }}
              className="bg-transparent text-xs font-bold text-slate-800 outline-none"
              aria-label="Pilih jenis periode laporan"
            >
              <option value="month">Bulanan</option>
              <option value="year">Tahunan</option>
            </select>
          </label>
          <label className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="text-[10px] font-bold text-slate-500">Periode</span>
            <input
              type={granularity === 'month' ? 'month' : 'number'}
              min="2020"
              max="2100"
              value={selectedPeriod}
              onChange={event => setSelectedPeriod(event.target.value || (granularity === 'month' ? currentMonth : currentYear))}
              className="w-24 bg-transparent text-xs font-bold text-slate-800 outline-none"
              aria-label={`Pilih periode ringkasan ${granularity === 'month' ? 'bulanan' : 'tahunan'}`}
            />
          </label>
          {canWriteFinance && (
          <button
            type="button"
            onClick={() => handleOpenModal('Penjualan Ternak')}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-[#123D18] px-3.5 py-2.5 text-xs font-bold text-white transition hover:bg-[#1B5E20]"
          >
            <Plus className="h-4 w-4" /> <span><span className="hidden sm:inline">Catat </span>Penjualan</span>
          </button>
          )}
          {canWriteFinance && (
          <button
            type="button"
            onClick={() => handleOpenModal('Pakan')}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3.5 py-2.5 text-xs font-bold text-rose-700 transition hover:bg-rose-50"
          >
            <Plus className="h-4 w-4" /> <span><span className="hidden sm:inline">Catat </span>Pengeluaran</span>
          </button>
          )}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
        <article className="rounded-2xl border border-[#F1F5F9] bg-white p-4 shadow-2xs sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Pemasukan</span>
            <ArrowUpRight className="h-4 w-4 text-[#1B5E20]" />
          </div>
          <strong className="mt-2 block font-mono text-lg font-bold text-[#1B5E20]">{formatRupiah(totalIncome)}</strong>
          <p className="mt-1 text-[10px] text-slate-400">Kas masuk pada periode</p>
        </article>

        <article className="rounded-2xl border border-rose-200 bg-white p-4 shadow-2xs sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Pengeluaran</span>
            <ArrowDownRight className="h-4 w-4 text-rose-600" />
          </div>
          <strong className="mt-2 block font-mono text-lg font-bold text-rose-600">{formatRupiah(totalExpense)}</strong>
          <p className="mt-1 text-[10px] text-slate-400">HPP dan biaya operasional</p>
        </article>

        <article className={`rounded-2xl border bg-white p-4 shadow-2xs sm:p-5 ${grossProfit >= 0 ? 'border-[#F1F5F9]' : 'border-rose-200'}`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Laba Kotor</span>
            <span className={`rounded-full px-2 py-1 text-[9px] font-bold ${grossProfit >= 0 ? 'bg-[#FFFFFF] text-[#1B5E20]' : 'bg-rose-50 text-rose-700'}`}>{grossProfit >= 0 ? 'LABA' : 'RUGI'}</span>
          </div>
          <strong className={`mt-2 block font-mono text-lg font-bold ${grossProfit >= 0 ? 'text-[#1B5E20]' : 'text-rose-600'}`}>{formatRupiah(grossProfit)}</strong>
          <p className="mt-1 text-[10px] text-slate-400">Penjualan dikurangi HPP ternak</p>
        </article>

        <article className={`rounded-2xl border bg-white p-4 shadow-2xs sm:p-5 ${netProfit >= 0 ? 'border-[#F1F5F9]' : 'border-rose-200'}`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Laba Bersih</span>
            <span className={`rounded-full px-2 py-1 text-[9px] font-bold ${netProfit >= 0 ? 'bg-[#FFFFFF] text-[#1B5E20]' : 'bg-rose-50 text-rose-700'}`}>{netProfit >= 0 ? 'LABA' : 'RUGI'}</span>
          </div>
          <strong className={`mt-2 block font-mono text-lg font-bold ${netProfit >= 0 ? 'text-[#1B5E20]' : 'text-rose-600'}`}>{formatRupiah(netProfit)}</strong>
          <p className="mt-1 text-[10px] text-slate-400">Laba kotor dikurangi operasional</p>
        </article>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
        <div className="border-b border-slate-100 px-4 py-3.5 sm:px-5 sm:py-4">
          <h3 className="text-sm font-bold text-slate-900">Ringkasan per Kategori</h3>
          <p className="mt-0.5 text-[10px] text-slate-500">Penjualan sapi adalah pemasukan; kategori lainnya merupakan pengeluaran.</p>
        </div>
        <div className="grid grid-flow-col auto-cols-[minmax(145px,1fr)] gap-px overflow-x-auto bg-slate-200 sm:grid-flow-row sm:grid-cols-3 sm:auto-cols-auto xl:grid-cols-7">
          {categorySummaries.map(item => {
            const categoryTotal = periodTransactions
              .filter(transaction => transaction.category === item.category && transaction.type === item.direction)
              .reduce((total, transaction) => total + transaction.amount, 0);
            const isIncome = item.direction === 'income';
            return (
              <div key={item.category} className="bg-white p-3.5 sm:p-4">
                <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">{isIncome ? 'Pemasukan' : 'Pengeluaran'}</span>
                <span className="mt-1 block text-xs font-bold text-slate-800">{item.label}</span>
                <span className={`mt-2 block font-mono text-sm font-bold ${isIncome ? 'text-[#1B5E20]' : 'text-rose-600'}`}>
                  {isIncome ? '+' : '-'}{formatRupiah(categoryTotal)}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3.5 sm:px-5 sm:py-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Rincian Transaksi</h3>
            <p className="mt-0.5 text-[10px] text-slate-500">Riwayat pemasukan dan pengeluaran</p>
          </div>
          <span className="text-right text-[10px] font-bold capitalize text-slate-500 sm:text-xs">{periodTransactions.length} Transaksi<span className="hidden sm:inline"> · {periodLabel}</span></span>
        </div>

        <div className="divide-y divide-slate-100 md:hidden">
          {periodTransactions.map(transaction => {
            const isIncome = transaction.type === 'income';
            return (
              <article key={transaction.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className={`inline-flex rounded-md px-2 py-1 text-[9px] font-bold ${isIncome ? 'bg-[#FFFFFF] text-[#1B5E20]' : 'bg-rose-50 text-rose-700'}`}>
                      {getCategoryLabel(transaction.category)}
                    </span>
                    <p className="mt-2 line-clamp-2 text-xs font-bold leading-relaxed text-slate-800">{transaction.description}</p>
                  </div>
                  <strong className={`shrink-0 whitespace-nowrap font-mono text-sm font-bold ${isIncome ? 'text-[#1B5E20]' : 'text-rose-600'}`}>
                    {isIncome ? '+' : '-'}{formatRupiah(transaction.amount)}
                  </strong>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-slate-500">
                  <span className="truncate font-mono font-bold text-slate-700">{transaction.invoiceNo}</span>
                  <span className="truncate text-right">{transaction.locationName}</span>
                  <span className="truncate">{formatDate(transaction.date)}</span>
                  <span className="truncate text-right">{transaction.paymentMethod}</span>
                </div>

                <div className="mt-3 flex justify-end gap-2 border-t border-slate-100 pt-2.5">
                  {canWriteFinance && (
                  <button type="button" onClick={() => handleEditTransaction(transaction)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-blue-50 px-3 text-[10px] font-bold text-blue-700" aria-label={`Edit transaksi ${transaction.invoiceNo}`}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  )}
                  {isOwner && (
                    <button type="button" onClick={() => handleDeleteTransaction(transaction)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-rose-50 px-3 text-[10px] font-bold text-rose-700" aria-label={`Hapus transaksi ${transaction.invoiceNo}`}>
                      <Trash2 className="h-3.5 w-3.5" /> Hapus
                    </button>
                  )}
                </div>
              </article>
            );
          })}
          {periodTransactions.length === 0 && (
            <div className="p-10 text-center text-xs text-slate-400">Belum ada transaksi pada periode {periodLabel}.</div>
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="p-3.5">Tanggal</th>
                <th className="p-3.5">Invoice / Ref</th>
                <th className="p-3.5">Kategori</th>
                <th className="p-3.5">Keterangan</th>
                <th className="p-3.5">Lokasi</th>
                <th className="p-3.5 text-right">Jumlah</th>
                <th className="p-3.5">Metode</th>
                <th className="p-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {periodTransactions.map(transaction => (
                <tr key={transaction.id} className="transition hover:bg-slate-50">
                  <td className="whitespace-nowrap p-3.5 text-slate-600">{formatDate(transaction.date)}</td>
                  <td className="p-3.5 font-mono font-bold text-slate-900">{transaction.invoiceNo}</td>
                  <td className="p-3.5">
                    <span className="whitespace-nowrap rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700">{getCategoryLabel(transaction.category)}</span>
                  </td>
                  <td className="min-w-52 p-3.5 font-semibold text-slate-700">{transaction.description}</td>
                  <td className="whitespace-nowrap p-3.5 text-slate-600">{transaction.locationName}</td>
                  <td className={`whitespace-nowrap p-3.5 text-right font-mono text-sm font-bold ${transaction.type === 'income' ? 'text-[#1B5E20]' : 'text-rose-600'}`}>
                    {transaction.type === 'income' ? '+' : '-'}{formatRupiah(transaction.amount)}
                  </td>
                  <td className="whitespace-nowrap p-3.5 text-slate-500">{transaction.paymentMethod}</td>
                  <td className="p-3.5">
                    <div className="flex items-center justify-end gap-1">
                      {canWriteFinance && (
                      <button type="button" onClick={() => handleEditTransaction(transaction)} title="Edit transaksi" aria-label={`Edit transaksi ${transaction.invoiceNo}`} className="rounded-lg p-1.5 text-blue-700 transition hover:bg-blue-50">
                        <Pencil className="h-4 w-4" />
                      </button>
                      )}
                      {isOwner && (
                        <button type="button" onClick={() => handleDeleteTransaction(transaction)} title="Hapus transaksi (khusus Owner)" aria-label={`Hapus transaksi ${transaction.invoiceNo}`} className="rounded-lg p-1.5 text-rose-700 transition hover:bg-rose-50">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {periodTransactions.length === 0 && (
                <tr><td colSpan={8} className="p-10 text-center text-slate-400">Belum ada transaksi pada periode {periodLabel}.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-xs sm:items-center sm:p-4">
          <div className="max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:max-h-[92vh] sm:rounded-2xl">
            <div className="sticky top-0 flex items-center justify-between bg-[#123D18] p-4 font-bold text-white">
              <h3>{editingTransactionId ? 'Edit Transaksi' : 'Catat Transaksi'}</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="rounded p-1 hover:bg-[#1B5E20]" aria-label="Tutup form">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className="space-y-3 p-4 text-xs sm:space-y-4 sm:p-5">
              <div>
                <label className="mb-1 block font-bold text-slate-700">Kategori *</label>
                <select value={category} onChange={event => setCategory(event.target.value as FinancialCategoryType)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-bold outline-none focus:ring-2 focus:ring-[#1B5E20]">
                  {categoryOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <div className={`mt-2 rounded-lg px-3 py-2 text-[10px] font-semibold ${transactionType === 'income' ? 'bg-[#FFFFFF] text-[#1B5E20]' : 'bg-rose-50 text-rose-700'}`}>
                  {transactionType === 'income' ? 'Dicatat sebagai PEMASUKAN.' : 'Dicatat sebagai PENGELUARAN.'}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block font-bold text-slate-700">Nomor Invoice / Referensi *</label>
                  <input value={invoiceNo} onChange={event => setInvoiceNo(event.target.value)} required className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono outline-none focus:ring-2 focus:ring-[#1B5E20]" />
                </div>
                <div>
                  <label className="mb-1 block font-bold text-slate-700">Tanggal *</label>
                  <input type="date" value={transactionDate} onChange={event => setTransactionDate(event.target.value)} required className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#1B5E20]" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block font-bold text-slate-700">Nominal *</label>
                  <input type="number" min="1" value={amount} onChange={event => setAmount(event.target.value)} required placeholder="Contoh: 500000" className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono font-bold outline-none focus:ring-2 focus:ring-[#1B5E20]" />
                </div>
                <div>
                  <label className="mb-1 block font-bold text-slate-700">Lokasi Kandang *</label>
                  <select value={locationId} onChange={event => setLocationId(event.target.value)} required className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#1B5E20]">
                    {locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700">Keterangan *</label>
                <input value={description} onChange={event => setDescription(event.target.value)} required placeholder="Jelaskan transaksi secara singkat" className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#1B5E20]" />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block font-bold text-slate-700">Metode Pembayaran</label>
                  <select value={paymentMethod} onChange={event => setPaymentMethod(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#1B5E20]">
                    <option value="Transfer Bank">Transfer Bank</option>
                    <option value="Tunai">Tunai</option>
                    <option value="Giro">Giro</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block font-bold text-slate-700">Penerima / Pembayar</label>
                  <input value={payeePayer} onChange={event => setPayeePayer(event.target.value)} placeholder="Nama pihak terkait" className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#1B5E20]" />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700">Batal</button>
                <button type="submit" className="rounded-lg bg-[#123D18] px-5 py-2 font-bold text-white hover:bg-[#1B5E20]">{editingTransactionId ? 'Simpan Perubahan' : 'Simpan Transaksi'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
