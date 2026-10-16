import React, { useState, useEffect } from 'react';
import { Scale, Plus, Search, TrendingUp, TrendingDown, Pencil, Trash2, X } from 'lucide-react';
import { storeService } from '../../services/storeService';
import { WeightRecord } from '../../types';
import { formatDate } from '../../utils/formatters';

export const WeightMonitoringView: React.FC = () => {
  const [weightRecords, setWeightRecords] = useState(storeService.weightRecords);
  const [livestock, setLivestock] = useState(storeService.getActiveLivestock());
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  // Form states
  const [selectedLivestockId, setSelectedLivestockId] = useState('');
  const [weighDate, setWeighDate] = useState(new Date().toISOString().split('T')[0]);
  const [newWeightKg, setNewWeightKg] = useState('');
  const [officerName, setOfficerName] = useState(storeService.currentUser.displayName);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const unsubscribe = storeService.subscribe(() => {
      setWeightRecords(storeService.weightRecords);
      setLivestock(storeService.getActiveLivestock());
    });
    return unsubscribe;
  }, []);

  const handleOpenModal = () => {
    setEditingRecordId(null);
    if (livestock.length > 0) {
      setSelectedLivestockId(livestock[0].id);
    }
    setWeighDate(new Date().toISOString().split('T')[0]);
    setNewWeightKg('');
    setOfficerName(storeService.currentUser.displayName);
    setNotes('');
    setIsModalOpen(true);
  };

  const handleEditRecord = (record: WeightRecord) => {
    setEditingRecordId(record.id);
    setSelectedLivestockId(record.livestockId);
    setWeighDate(record.weighDate);
    setNewWeightKg(String(record.weightKg));
    setOfficerName(record.officerName);
    setNotes(record.notes ?? '');
    setIsModalOpen(true);
  };

  const handleDeleteRecord = (record: WeightRecord) => {
    const confirmed = window.confirm(
      `Hapus rekaman penimbangan ${record.tagId} sebesar ${record.weightKg} kg pada ${formatDate(record.weighDate)}?\n\nBobot terakhir ternak akan dihitung ulang otomatis.`
    );
    if (confirmed) storeService.deleteWeightRecord(record.id);
  };

  const handleSaveWeight = (e: React.FormEvent) => {
    e.preventDefault();
    const animal = livestock.find(l => l.id === selectedLivestockId);
    if (!animal) return;

    const weightNum = parseFloat(newWeightKg);
    if (isNaN(weightNum) || weightNum <= 0) return;

    const prevWeight = animal.currentWeightKg || animal.initialWeightKg;
    const gain = weightNum - prevWeight;

    const recordData = {
      livestockId: animal.id,
      tagId: animal.tagId,
      weighDate,
      weightKg: weightNum,
      previousWeightKg: prevWeight,
      gainKg: gain,
      officerName,
      notes
    };

    if (editingRecordId) {
      storeService.updateWeightRecord(editingRecordId, recordData);
    } else {
      storeService.addWeightRecord(recordData);
    }

    setIsModalOpen(false);
    setEditingRecordId(null);
    setNewWeightKg('');
    setNotes('');
  };

  const filteredLogs = weightRecords.filter(w => {
    if (!search.trim()) return true;
    return w.tagId.toLowerCase().includes(search.toLowerCase()) || w.officerName.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-4 animate-fade-in pb-12">
      
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Scale className="w-5 h-5 text-[#1B5E20]" />
            <span>Monitoring Penimbangan Bobot Ternak</span>
          </h2>
          <p className="text-xs text-slate-500">
            Catat perkembangan bobot, evaluasi pertambahan harian (ADG), dan deteksi dini penurunan bobot
          </p>
        </div>

        <button
          onClick={handleOpenModal}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#123D18] hover:bg-[#1B5E20] text-white text-xs font-bold rounded-xl transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Input Penimbangan</span>
        </button>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari Ear Tag..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-[#1B5E20] focus:outline-none"
            />
          </div>
          <span className="text-xs font-bold text-slate-500">Total {filteredLogs.length} Rekaman</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="p-3.5">Tanggal</th>
                <th className="p-3.5">Ear Tag</th>
                <th className="p-3.5">Bobot Sebelumnya</th>
                <th className="p-3.5">Bobot Baru</th>
                <th className="p-3.5">Pertambahan (Gain)</th>
                <th className="p-3.5">Petugas Penimbang</th>
                <th className="p-3.5">Catatan</th>
                <th className="p-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredLogs.map(w => (
                <tr key={w.id} className="hover:bg-slate-50 transition">
                  <td className="p-3.5 font-semibold text-slate-900">{formatDate(w.weighDate)}</td>
                  <td className="p-3.5 font-mono font-bold text-slate-900">{w.tagId}</td>
                  <td className="p-3.5 text-slate-600 font-mono">{w.previousWeightKg} kg</td>
                  <td className="p-3.5 text-slate-900 font-mono font-bold text-sm">{w.weightKg} kg</td>
                  <td className="p-3.5 font-bold">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] ${
                      w.gainKg >= 0 ? 'bg-[#F8FAFC] text-[#123D18]' : 'bg-rose-100 text-rose-900 animate-pulse'
                    }`}>
                      {w.gainKg >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      {w.gainKg >= 0 ? `+${w.gainKg}` : w.gainKg} kg
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-600">{w.officerName}</td>
                  <td className="p-3.5 text-slate-500">{w.notes || '-'}</td>
                  <td className="p-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => handleEditRecord(w)}
                        title="Edit penimbangan"
                        aria-label={`Edit penimbangan ${w.tagId}`}
                        className="p-1.5 rounded-lg text-blue-700 hover:bg-blue-50 transition cursor-pointer"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRecord(w)}
                        title="Hapus penimbangan"
                        aria-label={`Hapus penimbangan ${w.tagId}`}
                        className="p-1.5 rounded-lg text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    Belum ada riwayat penimbangan bobot tercatat.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Input Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-xs sm:items-center sm:p-4">
          <div className="max-h-[94dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:max-h-[92vh] sm:rounded-2xl">
            <div className="p-4 bg-[#123D18] text-white flex items-center justify-between">
              <h3 className="text-base font-bold">
                {editingRecordId ? 'Edit Rekaman Penimbangan' : 'Catat Penimbangan Bobot Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-[#1B5E20] rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveWeight} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Pilih Ternak *</label>
                <select
                  value={selectedLivestockId}
                  onChange={e => setSelectedLivestockId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold focus:ring-2 focus:ring-[#1B5E20] focus:outline-none"
                >
                  {livestock.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.tagId} · {l.type} ({l.breed}) [Bobot lama: {l.currentWeightKg} kg]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tanggal Timbang *</label>
                <input
                  type="date"
                  value={weighDate}
                  onChange={e => setWeighDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1B5E20] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Bobot Hasil Timbang Baru (kg) *</label>
                <input
                  type="number"
                  step="0.1"
                  value={newWeightKg}
                  onChange={e => setNewWeightKg(e.target.value)}
                  required
                  placeholder="e.g. 345"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-sm focus:ring-2 focus:ring-[#1B5E20] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Petugas Penimbang</label>
                <input
                  type="text"
                  value={officerName}
                  onChange={e => setOfficerName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1B5E20] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Catatan</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1B5E20] focus:outline-none"
                  placeholder="Nafsu makan, suplemen tambahan..."
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
                  {editingRecordId ? 'Simpan Perubahan' : 'Simpan Penimbangan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
