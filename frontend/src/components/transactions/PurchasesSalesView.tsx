import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Store, Scale, MapPin, Upload, Trash2, Ban, X } from 'lucide-react';
import { storeService } from '../../services/storeService';
import { SalesRecord } from '../../types';
import { formatRupiah, formatDate } from '../../utils/formatters';
import { prepareImageForStorage } from '../../utils/image';
import { canCreate, canDelete } from '../../services/permissions';

interface PurchasesSalesViewProps {
  onOpenAddLivestock: () => void;
}

export const PurchasesSalesView: React.FC<PurchasesSalesViewProps> = ({ onOpenAddLivestock }) => {
  const [salesRecords, setSalesRecords] = useState(storeService.salesRecords);
  const [livestock, setLivestock] = useState(storeService.getActiveLivestock());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [processingPhotoId, setProcessingPhotoId] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState('');
  const canCreateSales = canCreate(storeService.currentUser.role, 'transactions');
  const canDeleteSales = canDelete(storeService.currentUser.role, 'transactions');

  // Form
  const [invoiceNo, setInvoiceNo] = useState(`TRX-SALES-${Date.now().toString().slice(-6)}`);
  const [buyerName, setBuyerName] = useState('H. Suwandi (Pekanbaru)');
  const [buyerPhone, setBuyerPhone] = useState('081299887766');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [priceTotal, setPriceTotal] = useState('22000000');
  const [paymentStatus, setPaymentStatus] = useState<'Lunas' | 'DP' | 'Belum Bayar'>('Lunas');
  const [paymentMethod, setPaymentMethod] = useState('Transfer Bank');

  useEffect(() => {
    const unsubscribe = storeService.subscribe(() => {
      setSalesRecords(storeService.salesRecords);
      setLivestock(storeService.getActiveLivestock());
    });
    return unsubscribe;
  }, []);

  const handleOpenModal = (livestockId?: string) => {
    setInvoiceNo(`TRX-SALES-${Math.floor(100000 + Math.random() * 900000)}`);
    const selected = livestock.find(item => item.id === livestockId) ?? livestock[0];
    if (selected) {
      setSelectedTagIds([selected.id]);
      setPriceTotal(String(selected.sellingPrice ?? Math.round(selected.acquisitionPrice * 1.2)));
    }
    setIsModalOpen(true);
  };

  const handleSelectLivestock = (livestockId: string) => {
    const selected = livestock.find(item => item.id === livestockId);
    setSelectedTagIds([livestockId]);
    if (selected) {
      setPriceTotal(String(selected.sellingPrice ?? Math.round(selected.acquisitionPrice * 1.2)));
    }
  };

  const handleCatalogPhotoUpload = async (livestockId: string, file?: File) => {
    if (!file) return;
    setPhotoError('');
    setProcessingPhotoId(livestockId);
    try {
      const photoUrl = await prepareImageForStorage(file);
      storeService.updateLivestock(livestockId, { photoUrl });
    } catch (uploadError) {
      setPhotoError(uploadError instanceof Error ? uploadError.message : 'Foto katalog gagal diproses.');
    } finally {
      setProcessingPhotoId(null);
    }
  };

  const handleRemoveCatalogPhoto = (livestockId: string, tagId: string) => {
    if (window.confirm(`Hapus foto katalog ternak ${tagId}?`)) {
      storeService.updateLivestock(livestockId, { photoUrl: undefined });
    }
  };

  const handleSaveSales = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTagIds.length === 0) return;

    const selectedLivestock = livestock.filter(item => selectedTagIds.includes(item.id));
    const primaryLivestock = selectedLivestock[0];
    if (!primaryLivestock) return;
    const total = parseFloat(priceTotal) || 0;

    storeService.addSalesTransaction({
      invoiceNo,
      date: new Date().toISOString().split('T')[0],
      buyerName,
      buyerPhone,
      livestockIds: selectedTagIds,
      weightTotalKg: selectedLivestock.reduce((sum, item) => sum + item.currentWeightKg, 0),
      priceTotal: total,
      acquisitionCostTotal: selectedLivestock.reduce((sum, item) => sum + item.acquisitionPrice, 0),
      paymentMethod,
      paymentStatus,
      locationId: primaryLivestock.locationId,
      locationName: primaryLivestock.locationName ?? '-',
      salesRep: storeService.currentUser.displayName,
      transactionStatus: 'Selesai',
      createdBy: storeService.currentUser.displayName
    });

    setIsModalOpen(false);
  };

  const handleVoidSale = (sale: SalesRecord) => {
    const reason = window.prompt(`Alasan pembatalan penjualan ${sale.invoiceNo}:`);
    if (reason?.trim() && window.confirm('Batalkan penjualan, pulihkan ternak, dan balikkan pemasukan kas terkait?')) {
      storeService.voidSalesTransaction(sale.id, reason);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in pb-12">
      
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-[#1B5E20]" />
            <span>POS Penjualan & Katalog Ternak</span>
          </h2>
          <p className="text-xs text-slate-500">
            Pilih ternak dari katalog, gunakan harga jual database, lalu buat invoice dan catat pemasukan otomatis
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={onOpenAddLivestock}
            className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-[#FFFFFF] text-[#123D18] border border-[#F1F5F9] text-xs font-bold rounded-xl transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Tambah Ternak Katalog
          </button>
          <button
            onClick={() => handleOpenModal()}
            disabled={livestock.length === 0 || !canCreateSales}
            title={canCreateSales ? undefined : 'Hanya Manager/Developer yang dapat membuat transaksi penjualan.'}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#123D18] hover:bg-[#1B5E20] disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Buat Transaksi Penjualan</span>
          </button>
        </div>
      </div>

      {photoError && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">{photoError}</div>
      )}

      {/* Livestock Sales Catalog */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
            <Store className="w-4 h-4 text-[#1B5E20]" /> Katalog Ternak Siap Dijual
          </h3>
          <span className="text-xs font-bold text-[#1B5E20]">{livestock.length} ekor tersedia</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
          {livestock.map(item => {
            const salePrice = item.sellingPrice ?? Math.round(item.acquisitionPrice * 1.2);
            return (
              <div key={item.id} className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                <div className="h-40 bg-slate-100 relative group">
                  {item.photoUrl ? (
                    <img src={item.photoUrl} alt={item.tagId} className="w-full h-full object-cover" />
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 font-bold">Foto {item.type}</div>
                  )}
                  {processingPhotoId === item.id && (
                    <div className="absolute inset-0 bg-slate-900/60 text-white flex items-center justify-center text-xs font-bold">Memproses foto...</div>
                  )}
                  <div className="absolute inset-x-2 bottom-2 flex gap-1.5">
                    <label className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-white/95 text-[#123D18] text-[10px] font-bold shadow cursor-pointer hover:bg-white">
                      <Upload className="w-3.5 h-3.5" /> {item.photoUrl ? 'Ganti Foto' : 'Unggah Foto'}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          e.target.value = '';
                          void handleCatalogPhotoUpload(item.id, file);
                        }}
                      />
                    </label>
                    {item.photoUrl && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCatalogPhoto(item.id, item.tagId)}
                        title="Hapus foto katalog"
                        className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-white/95 text-rose-700 text-[10px] font-bold shadow cursor-pointer hover:bg-white"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Hapus
                      </button>
                    )}
                  </div>
                </div>
                <div className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-mono font-bold text-slate-900">{item.tagId}</div>
                      <div className="text-[11px] text-slate-500">{item.type} {item.breed}</div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F8FAFC] text-[#1B5E20] font-bold">{item.healthStatus}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1"><Scale className="w-3 h-3" />{item.currentWeightKg} kg</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{item.locationName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Harga jual</span>
                    <span className="text-base font-bold font-mono text-[#1B5E20]">{formatRupiah(salePrice)}</span>
                  </div>
                  {canCreateSales && (
                  <button
                    type="button"
                    onClick={() => handleOpenModal(item.id)}
                    className="w-full px-3 py-2 bg-[#123D18] hover:bg-[#1B5E20] text-white rounded-lg text-xs font-bold cursor-pointer"
                  >
                    Pilih & Jual
                  </button>
                  )}
                </div>
              </div>
            );
          })}
          {livestock.length === 0 && (
            <div className="sm:col-span-2 lg:col-span-3 py-8 text-center text-xs text-slate-400">
              <p>Tidak ada ternak aktif yang tersedia untuk dijual.</p>
              <button
                type="button"
                onClick={onOpenAddLivestock}
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#123D18] text-white font-bold cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Tambah Ternak dan Foto
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sales Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900">Daftar Transaksi Penjualan</h3>
          <span className="text-xs font-bold text-[#1B5E20]">Total {salesRecords.length} Invoice</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="p-3.5">Invoice No</th>
                <th className="p-3.5">Tanggal</th>
                <th className="p-3.5">Pembeli</th>
                <th className="p-3.5">Lokasi Kandang</th>
                <th className="p-3.5">Total Harga</th>
                <th className="p-3.5 text-center">Status Pembayaran</th>
                <th className="p-3.5">Metode</th>
                <th className="p-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {salesRecords.map(s => (
                <tr key={s.id} className="hover:bg-slate-50 transition">
                  <td className="p-3.5 font-mono font-bold text-slate-900">{s.invoiceNo}</td>
                  <td className="p-3.5 text-slate-600">{formatDate(s.date)}</td>
                  <td className="p-3.5 font-bold text-slate-800">
                    <div>{s.buyerName}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{s.buyerPhone}</div>
                  </td>
                  <td className="p-3.5 text-slate-600">{s.locationName}</td>
                  <td className="p-3.5 font-mono font-bold text-[#1B5E20] text-sm">{formatRupiah(s.priceTotal)}</td>
                  <td className="p-3.5 text-center">
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                      s.paymentStatus === 'Lunas' ? 'bg-[#F8FAFC] text-[#123D18]' :
                      s.paymentStatus === 'DP' ? 'bg-[#FBF6E9] text-[#A97A14]' : 'bg-rose-100 text-rose-900'
                    }`}>
                      {s.paymentStatus}
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-500">{s.paymentMethod}</td>
                  <td className="p-3.5 text-center">
                    {s.transactionStatus === 'Batal' ? (
                      <span className="text-rose-700 font-bold">Dibatalkan</span>
                    ) : canDeleteSales ? (
                      <button type="button" onClick={() => handleVoidSale(s)} aria-label={`Batalkan penjualan ${s.invoiceNo}`} className="inline-flex items-center gap-1 px-2 py-1 text-rose-700 hover:bg-rose-50 rounded font-bold">
                        <Ban className="w-3.5 h-3.5" /> Batalkan
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {salesRecords.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    Belum ada invoice penjualan recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="p-4 bg-[#123D18] text-white flex items-center justify-between font-bold">
              <h3>Input Transaksi Penjualan</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-[#1B5E20] rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSales} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nomor Invoice *</label>
                <input
                  type="text"
                  value={invoiceNo}
                  onChange={e => setInvoiceNo(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold focus:ring-2 focus:ring-[#1B5E20] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nama Pembeli *</label>
                  <input
                    type="text"
                    value={buyerName}
                    onChange={e => setBuyerName(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1B5E20] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">HP Pembeli</label>
                  <input
                    type="text"
                    value={buyerPhone}
                    onChange={e => setBuyerPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1B5E20] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Pilih Ternak yang Dijual *</label>
                <select
                  value={selectedTagIds[0] || ''}
                  onChange={e => handleSelectLivestock(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold focus:ring-2 focus:ring-[#1B5E20] focus:outline-none"
                >
                  {livestock.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.tagId} · {l.type} ({l.breed}) [Bobot: {l.currentWeightKg} kg]
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Total Harga Penjualan (Rp) *</label>
                  <input
                    type="number"
                    value={priceTotal}
                    onChange={e => setPriceTotal(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-sm focus:ring-2 focus:ring-[#1B5E20] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status Pembayaran *</label>
                  <select
                    value={paymentStatus}
                    onChange={e => setPaymentStatus(e.target.value as 'Lunas' | 'Belum Bayar')}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold focus:ring-2 focus:ring-[#1B5E20] focus:outline-none"
                  >
                    <option value="Lunas">Lunas</option>
                    <option value="DP" disabled>DP (belum didukung · nominal DP belum dimodelkan)</option>
                    <option value="Belum Bayar">Belum Bayar / Utang</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Metode Pembayaran</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1B5E20] focus:outline-none"
                >
                  <option value="Transfer Bank">Transfer Bank</option>
                  <option value="Tunai">Tunai / Cash</option>
                  <option value="Giro">Giro</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#123D18] text-white font-bold rounded-lg hover:bg-[#1B5E20]"
                >
                  Simpan Transaksi & Auto Buku Kas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
