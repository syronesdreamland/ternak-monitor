import React, { useState, useEffect } from 'react';
import { Dna, Plus, Search, Calendar, Baby, Check, X } from 'lucide-react';
import { storeService } from '../../services/storeService';
import { BreedingRecord } from '../../types';
import { formatDate } from '../../utils/formatters';

export const BreedingReproductionView: React.FC = () => {
  const [records, setRecords] = useState(storeService.breedingRecords);
  const [females, setFemales] = useState(storeService.getActiveLivestock().filter(l => l.gender === 'Betina'));
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form
  const [motherId, setMotherId] = useState('');
  const [matingDate, setMatingDate] = useState(new Date().toISOString().split('T')[0]);
  const [method, setMethod] = useState<BreedingRecord['method']>('Inseminasi Buatan (IB)');
  const [fatherTag, setFatherTag] = useState('Pejantan Limosin A1');
  const [pregStatus, setPregStatus] = useState<BreedingRecord['pregStatus']>('Positif');
  const [estBirthDate, setEstBirthDate] = useState('2026-10-15');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const unsubscribe = storeService.subscribe(() => {
      setRecords(storeService.breedingRecords);
      setFemales(storeService.getActiveLivestock().filter(l => l.gender === 'Betina'));
    });
    return unsubscribe;
  }, []);

  const handleOpenModal = () => {
    if (females.length > 0) setMotherId(females[0].id);
    setIsModalOpen(true);
  };

  const handleSaveBreeding = (e: React.FormEvent) => {
    e.preventDefault();
    const mother = females.find(f => f.id === motherId);
    if (!mother) return;

    storeService.addBreedingRecord({
      motherId: mother.id,
      motherTag: mother.tagId,
      fatherTag,
      matingDate,
      method,
      pregCheckDate: matingDate,
      pregCheckResult: 'Positif Bunting (USG)',
      pregStatus,
      estBirthDate,
      offspringCount: 1,
      notes
    });
    storeService.updateLivestock(mother.id, {
      breedingStatus: pregStatus === 'Positif' ? 'Bunting' : 'Belum Dikawinkan'
    });

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-4 animate-fade-in pb-12">
      
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Dna className="w-5 h-5 text-[#1B5E20]" />
            <span>Breeding, Perkawinan & Kebuntingan</span>
          </h2>
          <p className="text-xs text-slate-500">
            Pencatatan Inseminasi Buatan (IB), pemeriksaan USG, status kebuntingan, dan estimasi kelahiran anakan
          </p>
        </div>

        <button
          onClick={handleOpenModal}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#123D18] hover:bg-[#1B5E20] text-white text-xs font-bold rounded-xl transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Catat Perkawinan / IB</span>
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {records.map(rec => (
          <div key={rec.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="font-mono font-bold text-[#A97A14] text-base">Induk: {rec.motherTag}</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F8FAFC] text-[#1B5E20]">
                {rec.pregStatus}
              </span>
            </div>

            <div className="space-y-1 text-xs">
              <p><span className="font-semibold text-slate-700">Metode Perkawinan:</span> {rec.method}</p>
              <p><span className="font-semibold text-slate-700">Pejantan / Semen:</span> {rec.fatherTag}</p>
              <p><span className="font-semibold text-slate-700">Tanggal Kawin:</span> {formatDate(rec.matingDate)}</p>
              <p><span className="font-semibold text-[#A97A14]">Estimasi Lahir:</span> <span className="font-bold text-[#A97A14]">{formatDate(rec.estBirthDate)}</span></p>
              {rec.notes && <p className="text-slate-500 italic mt-1">{rec.notes}</p>}
            </div>
          </div>
        ))}
        {records.length === 0 && (
          <div className="col-span-2 p-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
            Belum ada rekam breeding atau kebuntingan.
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-xs sm:items-center sm:p-4">
          <div className="max-h-[94dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:max-h-[92vh] sm:rounded-2xl">
            <div className="p-4 bg-[#123D18] text-white flex items-center justify-between">
              <h3 className="text-base font-bold">Catat Perkawinan & Kebuntingan</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-[#1B5E20] rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBreeding} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Pilih Induk Betina *</label>
                <select
                  value={motherId}
                  onChange={e => setMotherId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold focus:ring-2 focus:ring-[#1B5E20] focus:outline-none"
                >
                  {females.map(f => (
                    <option key={f.id} value={f.id}>{f.tagId} · {f.type} ({f.breed})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tanggal Perkawinan *</label>
                  <input
                    type="date"
                    value={matingDate}
                    onChange={e => setMatingDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1B5E20] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Metode *</label>
                  <select
                    value={method}
                    onChange={e => setMethod(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1B5E20] focus:outline-none"
                  >
                    <option value="Inseminasi Buatan (IB)">Inseminasi Buatan (IB)</option>
                    <option value="Alami">Kawin Alami</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Kode / Nama Pejantan (Semen IB)</label>
                <input
                  type="text"
                  value={fatherTag}
                  onChange={e => setFatherTag(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1B5E20] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status Kebuntingan</label>
                  <select
                    value={pregStatus}
                    onChange={e => setPregStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold focus:ring-2 focus:ring-[#1B5E20] focus:outline-none"
                  >
                    <option value="Positif">Positif Bunting</option>
                    <option value="Belum Diketahui">Belum Diketahui / USG</option>
                    <option value="Negatif">Negatif</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Estimasi Lahir</label>
                  <input
                    type="date"
                    value={estBirthDate}
                    onChange={e => setEstBirthDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1B5E20] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Catatan</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
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
                  Simpan Perkawinan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
