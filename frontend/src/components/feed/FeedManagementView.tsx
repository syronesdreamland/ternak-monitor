import React, { useState, useEffect } from 'react';
import { Wheat, Plus, AlertTriangle, Pencil, Archive, ArrowDownToLine, ArrowUpFromLine, X } from 'lucide-react';
import { storeService } from '../../services/storeService';
import { FeedInventory } from '../../types';
import { formatRupiah } from '../../utils/formatters';

export const FeedManagementView: React.FC = () => {
  const [feed, setFeed] = useState(storeService.getActiveFeedInventory());
  const [locations, setLocations] = useState(storeService.locations);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFeedId, setEditingFeedId] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Form
  const [locationId, setLocationId] = useState('');
  const [feedType, setFeedType] = useState('Konsentrat Gemuk');
  const [stockIn, setStockIn] = useState('1500');
  const [stockOut, setStockOut] = useState('0');
  const [unit, setUnit] = useState('kg');
  const [minStock, setMinStock] = useState('800');
  const [unitPrice, setUnitPrice] = useState('3800');
  const [supplier, setSupplier] = useState('PT Feedmill Nusantara');

  useEffect(() => {
    const unsubscribe = storeService.subscribe(() => {
      setFeed(storeService.getActiveFeedInventory());
      setLocations(storeService.locations);
    });
    return unsubscribe;
  }, []);

  const handleOpenModal = () => {
    setEditingFeedId(null);
    setError('');
    if (locations.length > 0) setLocationId(locations[0].id);
    setFeedType('');
    setStockIn('0');
    setStockOut('0');
    setUnit('kg');
    setMinStock('500');
    setUnitPrice('0');
    setSupplier('');
    setIsModalOpen(true);
  };

  const handleEditFeed = (item: FeedInventory) => {
    setEditingFeedId(item.id);
    setError('');
    setLocationId(item.locationId);
    setFeedType(item.feedType);
    setStockIn(String(item.stockIn ?? item.stockQty + (item.stockOut ?? 0)));
    setStockOut(String(item.stockOut ?? 0));
    setUnit(item.unit);
    setMinStock(String(item.minStock));
    setUnitPrice(String(item.unitPrice));
    setSupplier(item.supplier);
    setIsModalOpen(true);
  };

  const handleSaveFeed = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const loc = locations.find(l => l.id === locationId) || locations[0];
    if (!loc) return;
    const incoming = parseFloat(stockIn) || 0;
    const outgoing = parseFloat(stockOut) || 0;
    if (incoming < 0 || outgoing < 0) {
      setError('Jumlah masuk dan keluar tidak boleh negatif.');
      return;
    }
    if (outgoing > incoming) {
      setError('Jumlah keluar tidak boleh melebihi jumlah masuk.');
      return;
    }

    const feedData = {
      locationId: loc.id,
      locationName: loc.name,
      feedType,
      stockQty: incoming - outgoing,
      stockIn: incoming,
      stockOut: outgoing,
      unit,
      minStock: parseFloat(minStock) || 500,
      unitPrice: parseFloat(unitPrice) || 0,
      supplier
    };
    if (editingFeedId) {
      storeService.updateFeedInventory(editingFeedId, feedData);
    } else {
      storeService.addFeedInventory(feedData);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-4 animate-fade-in pb-12">
      
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Wheat className="w-5 h-5 text-[#C9971C]" />
            <span>Stok & Stok Opname Pakan Peternakan</span>
          </h2>
          <p className="text-xs text-slate-500">
            Monitoring persediaan konsentrat, silase, rumput gajah, serta peringatan stok di bawah minimum
          </p>
        </div>

        <button
          onClick={handleOpenModal}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#123D18] hover:bg-[#1B5E20] text-white text-xs font-bold rounded-xl transition cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Tambah Stok Pakan</span>
        </button>
      </div>

      {/* Feed Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {feed.map(f => {
          const isLow = f.stockQty <= f.minStock;
          return (
            <div key={f.id} className={`p-5 rounded-2xl border shadow-2xs space-y-3 bg-white ${
              isLow ? 'border-[#EED995] ring-1 ring-[#EED995]/50' : 'border-slate-200'
            }`}>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{f.feedType}</h3>
                  <span className="text-[10px] text-slate-400 font-semibold">{f.locationName}</span>
                </div>
                <div className="flex items-center gap-1">
                {isLow ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FBF6E9] text-[#A97A14] flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Stok Rendah
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F8FAFC] text-[#123D18]">
                    Aman
                  </span>
                )}
                  <button
                    type="button"
                    onClick={() => handleEditFeed(f)}
                    title="Edit stok pakan"
                    aria-label={`Edit stok ${f.feedType}`}
                    className="p-1.5 text-blue-700 hover:bg-blue-50 rounded-lg cursor-pointer"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => window.confirm(`Arsipkan stok ${f.feedType}? Riwayat tetap disimpan.`) && storeService.archiveFeedInventory(f.id)}
                    title="Arsipkan stok pakan"
                    aria-label={`Arsipkan stok ${f.feedType}`}
                    className="p-1.5 text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer"
                  >
                    <Archive className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <span className="text-3xl font-bold font-mono text-slate-900">{f.stockQty}</span>
                <span className="text-xs font-bold text-slate-500 ml-1">{f.unit}</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">Batas minimum: {f.minStock} {f.unit}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-600 space-y-0.5">
                <div className="grid grid-cols-2 gap-2 pb-2 mb-2 border-b border-slate-200">
                  <span className="flex items-center gap-1 text-[#1B5E20] font-bold"><ArrowDownToLine className="w-3 h-3" /> Masuk: {f.stockIn ?? f.stockQty} {f.unit}</span>
                  <span className="flex items-center gap-1 text-rose-600 font-bold"><ArrowUpFromLine className="w-3 h-3" /> Keluar: {f.stockOut ?? 0} {f.unit}</span>
                </div>
                <p><span className="font-semibold">Harga Satuan:</span> {formatRupiah(f.unitPrice)}/{f.unit}</p>
                <p><span className="font-semibold">Pemasok:</span> {f.supplier}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-xs sm:items-center sm:p-4">
          <div className="max-h-[94dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:max-h-[92vh] sm:rounded-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between bg-[#123D18] p-4 font-bold text-white">
              <h3>{editingFeedId ? 'Edit Stok Pakan' : 'Input Stok Pakan Baru'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-[#1B5E20] rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFeed} className="p-5 space-y-3 text-xs">
              {error && <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-semibold">{error}</div>}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Lokasi Kandang *</label>
                <select
                  value={locationId}
                  onChange={e => setLocationId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold focus:ring-2 focus:ring-[#1B5E20] focus:outline-none"
                >
                  {locations.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Jenis Pakan *</label>
                <input
                  type="text"
                  value={feedType}
                  onChange={e => setFeedType(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold focus:ring-2 focus:ring-[#1B5E20] focus:outline-none"
                  placeholder="e.g. Konsentrat Gemuk, Silase, Mineral Block"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jumlah Masuk *</label>
                  <input
                    type="number"
                    min="0"
                    value={stockIn}
                    onChange={e => setStockIn(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold focus:ring-2 focus:ring-[#1B5E20] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jumlah Keluar *</label>
                  <input
                    type="number"
                    min="0"
                    value={stockOut}
                    onChange={e => setStockOut(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold focus:ring-2 focus:ring-[#1B5E20] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Satuan *</label>
                <input
                  type="text"
                  value={unit}
                  onChange={e => setUnit(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1B5E20] focus:outline-none"
                  placeholder="kg, ton, karung"
                />
                <p className="mt-1 text-[10px] text-slate-500">Sisa stok otomatis: {(parseFloat(stockIn) || 0) - (parseFloat(stockOut) || 0)} {unit}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Batas Minimum Alert *</label>
                  <input
                    type="number"
                    value={minStock}
                    onChange={e => setMinStock(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1B5E20] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Harga Satuan (Rp)</label>
                  <input
                    type="number"
                    value={unitPrice}
                    onChange={e => setUnitPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1B5E20] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Pemasok / Suplier</label>
                <input
                  type="text"
                  value={supplier}
                  onChange={e => setSupplier(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1B5E20] focus:outline-none"
                />
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
                  {editingFeedId ? 'Simpan Perubahan' : 'Simpan Pakan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
