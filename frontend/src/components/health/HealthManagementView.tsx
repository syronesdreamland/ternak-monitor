import React, { useState, useEffect } from 'react';
import { HeartPulse, Plus, Pencil, Trash2, X } from 'lucide-react';
import { storeService } from '../../services/storeService';
import { HealthRecord, HealthStatusType } from '../../types';
import { formatDate } from '../../utils/formatters';

export const HealthManagementView: React.FC = () => {
  const [healthRecords, setHealthRecords] = useState(storeService.healthRecords);
  const [livestock, setLivestock] = useState(storeService.getActiveLivestock());
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  // Form states
  const [selectedLivestockId, setSelectedLivestockId] = useState('');
  const [recordDate, setRecordDate] = useState(new Date().toISOString().split('T')[0]);
  const [condition, setCondition] = useState('Flu & Demam');
  const [symptoms, setSymptoms] = useState('Nafsu makan berkurang, bersin');
  const [actionTaken, setActionTaken] = useState('Injeksi vitamin & antipiretik');
  const [medicineName, setMedicineName] = useState('B-Complex & Vet-Flu');
  const [dosage, setDosage] = useState('10 ml');
  const [status, setStatus] = useState<HealthStatusType>('Sakit');
  const [officerName, setOfficerName] = useState(storeService.currentUser.displayName);
  const [vetName, setVetName] = useState('drh. Fitriani');
  const [followUpDate, setFollowUpDate] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const unsubscribe = storeService.subscribe(() => {
      setHealthRecords(storeService.healthRecords);
      setLivestock(storeService.getActiveLivestock());
    });
    return unsubscribe;
  }, []);

  const resetForm = () => {
    setSelectedLivestockId(livestock[0]?.id ?? '');
    setRecordDate(new Date().toISOString().split('T')[0]);
    setCondition('');
    setSymptoms('');
    setActionTaken('');
    setMedicineName('');
    setDosage('');
    setStatus('Sakit');
    setOfficerName(storeService.currentUser.displayName);
    setVetName('');
    setFollowUpDate('');
    setNotes('');
    setEditingRecordId(null);
  };

  const handleOpenModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleEdit = (record: HealthRecord) => {
    setEditingRecordId(record.id);
    setSelectedLivestockId(record.livestockId);
    setRecordDate(record.recordDate);
    setCondition(record.condition);
    setSymptoms(record.symptoms);
    setActionTaken(record.actionTaken);
    setMedicineName(record.medicineName ?? '');
    setDosage(record.dosage ?? '');
    setStatus(record.status);
    setOfficerName(record.officerName);
    setVetName(record.vetName ?? '');
    setFollowUpDate(record.followUpDate ?? '');
    setNotes(record.notes ?? '');
    setIsModalOpen(true);
  };

  const handleDelete = (record: HealthRecord) => {
    const confirmed = window.confirm(
      `Hapus rekam kesehatan ${record.tagId} dengan diagnosa "${record.condition}"?\n\nData yang dihapus tidak dapat dikembalikan.`
    );
    if (confirmed) storeService.deleteHealthRecord(record.id);
  };

  const handleSaveHealth = (e: React.FormEvent) => {
    e.preventDefault();
    const animal = livestock.find(l => l.id === selectedLivestockId);
    if (!animal) return;

    const recordData = {
      livestockId: animal.id,
      tagId: animal.tagId,
      recordDate,
      condition,
      symptoms,
      actionTaken,
      medicineName,
      dosage,
      officerName,
      vetName,
      followUpDate,
      status,
      notes
    };

    if (editingRecordId) {
      storeService.updateHealthRecord(editingRecordId, recordData);
    } else {
      storeService.addHealthRecord(recordData);
    }

    setIsModalOpen(false);
    setEditingRecordId(null);
  };

  const filteredLogs = healthRecords.filter(h => {
    if (!search.trim()) return true;
    return h.tagId.toLowerCase().includes(search.toLowerCase()) || h.condition.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-4 animate-fade-in pb-12">
      
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <HeartPulse className="w-5 h-5 text-rose-600" />
            <span>Manajemen Kesehatan, Obat & Vaksinasi</span>
          </h2>
          <p className="text-xs text-slate-500">
            Monitoring kondisi medis ternak, pemberian obat, jadwal dokter hewan, dan status karantina/isolasi
          </p>
        </div>

        <button
          onClick={handleOpenModal}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#1B5E20] hover:bg-[#123D18] text-white text-xs font-bold rounded-xl transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Lapor Rekam Kesehatan</span>
        </button>
      </div>

      {/* Logs Grid / List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredLogs.map(log => (
          <div key={log.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-slate-900 text-base">{log.tagId}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  log.status === 'Sakit' ? 'bg-rose-100 text-rose-800' :
                  log.status === 'Isolasi' ? 'bg-[#FBF6E9] text-[#A97A14]' : 'bg-[#F8FAFC] text-[#1B5E20]'
                }`}>
                  {log.status}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="mr-1 text-xs text-slate-400 font-medium">{formatDate(log.recordDate)}</span>
                <button
                  type="button"
                  onClick={() => handleEdit(log)}
                  title="Edit rekam kesehatan"
                  aria-label={`Edit rekam kesehatan ${log.tagId}`}
                  className="p-1.5 rounded-lg text-blue-700 hover:bg-blue-50 transition cursor-pointer"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(log)}
                  title="Hapus rekam kesehatan"
                  aria-label={`Hapus rekam kesehatan ${log.tagId}`}
                  className="p-1.5 rounded-lg text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <p><span className="font-bold text-slate-800">Diagnosa/Kondisi:</span> <span className="text-rose-700 font-semibold">{log.condition}</span></p>
              <p><span className="font-bold text-slate-800">Gejala Ditunjukkan:</span> {log.symptoms}</p>
              <p><span className="font-bold text-slate-800">Tindakan Medis:</span> {log.actionTaken}</p>
              {log.medicineName && (
                <p><span className="font-bold text-slate-800">Obat & Dosis:</span> {log.medicineName} ({log.dosage})</p>
              )}
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-600 flex items-center justify-between">
              <div>
                <span className="block font-semibold">Petugas: {log.officerName}</span>
                {log.vetName && <span className="text-slate-400">Dokter Vet: {log.vetName}</span>}
              </div>
              {log.followUpDate && (
                <div className="text-right">
                  <span className="text-[10px] text-[#A97A14] font-bold block">Jadwal Kontrol:</span>
                  <span className="font-bold text-slate-900">{formatDate(log.followUpDate)}</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {filteredLogs.length === 0 && (
          <div className="col-span-2 p-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
            Belum ada rekam medis atau pengobatan dicatat.
          </div>
        )}
      </div>

      {/* Input Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-xs sm:items-center sm:p-4">
          <div className="max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:max-h-[92vh] sm:rounded-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between bg-rose-900 p-4 text-white">
              <h3 className="text-base font-bold">
                {editingRecordId ? 'Edit Rekam Kesehatan & Obat' : 'Lapor Rekam Kesehatan & Obat'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-rose-800 rounded" aria-label="Tutup formulir">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveHealth} className="p-5 space-y-3 text-xs max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Pilih Ternak *</label>
                <select
                  value={selectedLivestockId}
                  onChange={e => setSelectedLivestockId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold focus:ring-2 focus:ring-rose-800 focus:outline-none"
                >
                  {livestock.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.tagId} · {l.type} ({l.breed}) [{l.locationName}]
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tanggal Rekam *</label>
                  <input
                    type="date"
                    value={recordDate}
                    onChange={e => setRecordDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status Kesehatan *</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as HealthStatusType)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold focus:ring-2 focus:ring-rose-800 focus:outline-none"
                  >
                    <option value="Sakit">Sakit</option>
                    <option value="Isolasi">Isolasi Karantina</option>
                    <option value="Perlu Pemantauan">Perlu Pemantauan</option>
                    <option value="Sehat">Sehat / Sembuh</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Petugas *</label>
                <input
                  type="text"
                  value={officerName}
                  onChange={e => setOfficerName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Diagnosa / Keluhan Sakit *</label>
                <input
                  type="text"
                  value={condition}
                  onChange={e => setCondition(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold focus:ring-2 focus:ring-rose-800 focus:outline-none"
                  placeholder="e.g. Flu, Cacingan, Infeksi Pusar, Demam"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Gejala Ditunjukkan</label>
                <input
                  type="text"
                  value={symptoms}
                  onChange={e => setSymptoms(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-800 focus:outline-none"
                  placeholder="e.g. Nafsu makan turun, lemas, bersin"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Obat / Vaksin Diberikan</label>
                  <input
                    type="text"
                    value={medicineName}
                    onChange={e => setMedicineName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-800 focus:outline-none"
                    placeholder="e.g. Flunixin, Vet-Flu"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Dosis / Aturan</label>
                  <input
                    type="text"
                    value={dosage}
                    onChange={e => setDosage(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-800 focus:outline-none"
                    placeholder="e.g. 10 ml injeksi"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tindakan Medis Dilakukan</label>
                <textarea
                  value={actionTaken}
                  onChange={e => setActionTaken(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-800 focus:outline-none"
                  placeholder="Injeksi obat, pembersihan kandang isolasi..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Dokter Hewan (Jika Ada)</label>
                  <input
                    type="text"
                    value={vetName}
                    onChange={e => setVetName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jadwal Kontrol Lanjutan</label>
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={e => setFollowUpDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-800 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Catatan Tambahan</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-800 focus:outline-none"
                  placeholder="Catatan pemantauan atau instruksi lanjutan..."
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
                  className="px-5 py-2 bg-rose-800 text-white font-bold rounded-lg hover:bg-rose-900"
                >
                  {editingRecordId ? 'Simpan Perubahan' : 'Simpan Laporan Kesehatan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
