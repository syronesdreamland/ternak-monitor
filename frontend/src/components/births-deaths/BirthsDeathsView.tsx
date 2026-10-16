import React, { useState, useEffect } from 'react';
import { Baby, Skull, Pencil, Ban, X } from 'lucide-react';
import { storeService } from '../../services/storeService';
import { GenderType, DeathRecord } from '../../types';
import { formatDate } from '../../utils/formatters';

export const BirthsDeathsView: React.FC = () => {
  const [deaths, setDeaths] = useState(storeService.deathRecords);
  const [births, setBirths] = useState(storeService.birthRecords);
  const [livestock, setLivestock] = useState(storeService.getActiveLivestock());
  const [locations, setLocations] = useState(storeService.locations);

  // Modals
  const [isBirthModalOpen, setIsBirthModalOpen] = useState(false);
  const [isDeathModalOpen, setIsDeathModalOpen] = useState(false);

  // Birth Form
  const [motherId, setMotherId] = useState('');
  const [gender, setGender] = useState<GenderType>('Jantan');
  const [birthWeight, setBirthWeight] = useState('28');
  const [birthDate, setBirthDate] = useState(new Date().toISOString().split('T')[0]);
  const [locationId, setLocationId] = useState('');
  const [birthCondition, setBirthCondition] = useState('Sehat, menyusu lancar');

  // Death Form
  const [deadLivestockId, setDeadLivestockId] = useState('');
  const [deathDate, setDeathDate] = useState(new Date().toISOString().split('T')[0]);
  const [suspectedCause, setSuspectedCause] = useState('Kembung akut / Bloat');
  const [symptomsBefore, setSymptomsBefore] = useState('Perut kiri membesar, gelisah');
  const [handlingNote, setHandlingNote] = useState('Bangkai dikubur sesuai SOP kesehatan hewan');
  const [officerName, setOfficerName] = useState(storeService.currentUser.displayName);
  const [vetName, setVetName] = useState('drh. Fitriani');

  useEffect(() => {
    const unsubscribe = storeService.subscribe(() => {
      setDeaths(storeService.deathRecords);
      setBirths(storeService.birthRecords);
      setLivestock(storeService.getActiveLivestock());
      setLocations(storeService.locations);
    });
    return unsubscribe;
  }, []);

  const handleOpenBirth = () => {
    const females = livestock.filter(l => l.gender === 'Betina');
    if (females.length > 0) setMotherId(females[0].id);
    if (locations.length > 0) setLocationId(locations[0].id);
    setIsBirthModalOpen(true);
  };

  const handleOpenDeath = () => {
    if (livestock.length > 0) setDeadLivestockId(livestock[0].id);
    setIsDeathModalOpen(true);
  };

  const handleSaveBirth = (e: React.FormEvent) => {
    e.preventDefault();
    const mother = livestock.find(l => l.id === motherId);
    if (!mother) return;

    storeService.addBirthRecord({ motherId: mother.id, motherTag: mother.tagId, locationId: locationId || mother.locationId,
      gender, birthDate, birthWeightKg: parseFloat(birthWeight) || 25, condition: birthCondition });

    setIsBirthModalOpen(false);
  };

  const handleVoidBirth = (id: string, tag: string) => {
    const reason = window.prompt(`Alasan membatalkan kelahiran ${tag}:`);
    if (reason?.trim() && window.confirm('Batalkan catatan kelahiran dan arsipkan data anak?')) storeService.voidBirthRecord(id, reason);
  };

  const handleEditDeath = (record: DeathRecord) => {
    const cause = window.prompt(`Koreksi dugaan penyebab untuk ${record.tagId}:`, record.suspectedCause);
    if (cause?.trim()) storeService.updateDeathRecord(record.id, { suspectedCause: cause.trim() });
  };

  const handleVoidDeath = (record: DeathRecord) => {
    const reason = window.prompt(`Alasan membatalkan laporan kematian ${record.tagId}:`);
    if (reason?.trim() && window.confirm('Batalkan laporan dan pulihkan status ternak dari snapshot?')) storeService.voidDeathRecord(record.id, reason);
  };

  const handleSaveDeath = (e: React.FormEvent) => {
    e.preventDefault();
    const animal = livestock.find(l => l.id === deadLivestockId);
    if (!animal) return;

    storeService.addDeathRecord({
      livestockId: animal.id,
      tagId: animal.tagId,
      locationId: animal.locationId,
      deathDate,
      suspectedCause,
      symptomsBefore,
      handlingNote,
      officerName,
      vetName
    });

    setIsDeathModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Baby className="w-5 h-5 text-[#1B5E20]" />
            <span>Pencatatan Kelahiran & Kematian Ternak</span>
          </h2>
          <p className="text-xs text-slate-500">
            Pencatatan resmi anakan baru lahir dan pelaporan kematian ternak dengan pembaruan otomatis populasi
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenBirth}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#1B5E20] hover:bg-[#123D18] text-white font-bold text-xs rounded-xl transition cursor-pointer"
          >
            <Baby className="w-4 h-4" />
            <span>+ Lapor Kelahiran</span>
          </button>

          <button
            onClick={handleOpenDeath}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition cursor-pointer"
          >
            <Skull className="w-4 h-4 text-rose-400" />
            <span>+ Lapor Kematian</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 bg-[#ECF5ED] border-b border-[#D5EAD8] flex justify-between"><h3 className="text-xs font-bold">Riwayat Kelahiran</h3><span className="text-xs">{births.length} peristiwa</span></div>
        <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-slate-100"><tr><th className="p-3">Tanggal</th><th className="p-3">Induk</th><th className="p-3">Anak</th><th className="p-3">Bobot</th><th className="p-3">Status / Aksi</th></tr></thead>
          <tbody>{births.map(b => <tr key={b.id} className="border-t"><td className="p-3">{formatDate(b.birthDate)}</td><td className="p-3 font-mono">{b.motherTag}</td><td className="p-3 font-mono font-bold">{b.offspringTag}</td><td className="p-3">{b.birthWeightKg} kg</td><td className="p-3">{b.voidedAt ? <span className="text-rose-700 font-bold">Dibatalkan</span> : <button type="button" onClick={() => handleVoidBirth(b.id, b.offspringTag)} className="text-rose-700 font-bold">Batalkan & Arsipkan Anak</button>}</td></tr>)}</tbody>
        </table>{births.length === 0 && <p className="p-6 text-center text-slate-400 text-xs">Belum ada riwayat kelahiran.</p>}</div>
      </div>

      {/* Official Death Records List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
            <Skull className="w-4 h-4 text-slate-700" />
            <span>Arsip Resmi Laporan Kematian Ternak</span>
          </h3>
          <span className="text-xs font-semibold text-rose-700">
            Total {deaths.length} Kasus Kematian Recorded
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="p-3.5">Tanggal Mati</th>
                <th className="p-3.5">Ear Tag</th>
                <th className="p-3.5">Dugaan Penyebab</th>
                <th className="p-3.5">Gejala Sebelum Mati</th>
                <th className="p-3.5">Penanganan Bangkai</th>
                <th className="p-3.5">Petugas / Dokter</th><th className="p-3.5">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {deaths.map(d => (
                <tr key={d.id} className="hover:bg-rose-50/50 transition">
                  <td className="p-3.5 font-bold text-slate-900">{formatDate(d.deathDate)}</td>
                  <td className="p-3.5 font-mono font-bold text-rose-800 text-sm">{d.tagId}</td>
                  <td className="p-3.5 font-bold text-rose-700">{d.suspectedCause}</td>
                  <td className="p-3.5 text-slate-600">{d.symptomsBefore}</td>
                  <td className="p-3.5 text-slate-600">{d.handlingNote}</td>
                  <td className="p-3.5 text-slate-500">{d.officerName} {d.vetName ? `(${d.vetName})` : ''}</td>
                  <td className="p-3.5">{d.voidedAt ? <span className="text-rose-700 font-bold">Dibatalkan</span> : <div className="flex gap-2"><button type="button" onClick={() => handleEditDeath(d)} aria-label={`Edit kematian ${d.tagId}`} className="text-blue-700"><Pencil className="w-4 h-4" /></button><button type="button" onClick={() => handleVoidDeath(d)} aria-label={`Batalkan kematian ${d.tagId}`} className="text-rose-700"><Ban className="w-4 h-4" /></button></div>}</td>
                </tr>
              ))}
              {deaths.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Sistem bersih. Tidak ada rekam kematian ternak tercatat.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Birth Modal */}
      {isBirthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-xs sm:items-center sm:p-4">
          <div className="max-h-[94dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:max-h-[92vh] sm:rounded-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between bg-[#1B5E20] p-4 font-bold text-white">
              <h3>Lapor Kelahiran Anakan Ternak Baru</h3>
              <button onClick={() => setIsBirthModalOpen(false)} className="p-1 hover:bg-[#164D1C] rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBirth} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Pilih Induk Betina *</label>
                <select
                  value={motherId}
                  onChange={e => setMotherId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold focus:ring-2 focus:ring-[#1B5E20] focus:outline-none"
                >
                  {livestock.filter(l => l.gender === 'Betina').map(f => (
                    <option key={f.id} value={f.id}>{f.tagId} · {f.breed} ({f.locationName})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tanggal Lahir *</label>
                  <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} required className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jenis Kelamin Anak *</label>
                  <select
                    value={gender}
                    onChange={e => setGender(e.target.value as GenderType)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold focus:ring-2 focus:ring-[#1B5E20] focus:outline-none"
                  >
                    <option value="Jantan">Jantan</option>
                    <option value="Betina">Betina</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Bobot Lahir (kg) *</label>
                  <input
                    type="number"
                    value={birthWeight}
                    onChange={e => setBirthWeight(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold focus:ring-2 focus:ring-[#1B5E20] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Lokasi Kandang Kelahiran *</label>
                <select
                  value={locationId}
                  onChange={e => setLocationId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold focus:ring-2 focus:ring-[#1B5E20] focus:outline-none"
                >
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Kondisi Lahir & Catatan</label>
                <textarea
                  value={birthCondition}
                  onChange={e => setBirthCondition(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1B5E20] focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBirthModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1B5E20] hover:bg-[#123D18] text-white font-bold rounded-lg"
                >
                  Daftarkan Anakan Baru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Death Modal */}
      {isDeathModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-xs sm:items-center sm:p-4">
          <div className="max-h-[94dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:max-h-[92vh] sm:rounded-2xl">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between font-bold">
              <h3 className="flex items-center gap-2">
                <Skull className="w-5 h-5 text-rose-500" />
                <span>Pelaporan Resmi Kematian Ternak</span>
              </h3>
              <button onClick={() => setIsDeathModalOpen(false)} className="p-1 hover:bg-slate-800 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDeath} className="p-5 space-y-3 text-xs">
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 font-semibold rounded-lg text-[11px]">
                ⚠️ Mengisi laporan ini akan mengubah status ternak menjadi MATI dan mengeluarkannya dari populasi aktif.
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Pilih Ternak yang Mati *</label>
                <select
                  value={deadLivestockId}
                  onChange={e => setDeadLivestockId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold focus:ring-2 focus:ring-slate-900 focus:outline-none"
                >
                  {livestock.map(l => (
                    <option key={l.id} value={l.id}>{l.tagId} · {l.type} ({l.breed}) [{l.locationName}]</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tanggal Kematian *</label>
                <input
                  type="date"
                  value={deathDate}
                  onChange={e => setDeathDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Dugaan Penyebab Kematian *</label>
                <input
                  type="text"
                  value={suspectedCause}
                  onChange={e => setSuspectedCause(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  placeholder="e.g. Kembung akut, Gigitan ular, Demam tinggi, Kecelakaan"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Gejala Sebelum Mati</label>
                <input
                  type="text"
                  value={symptomsBefore}
                  onChange={e => setSymptomsBefore(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Penanganan Bangkai</label>
                <input
                  type="text"
                  value={handlingNote}
                  onChange={e => setHandlingNote(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Petugas Lapor</label>
                  <input
                    type="text"
                    value={officerName}
                    onChange={e => setOfficerName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Dokter Hewan Saksi</label>
                  <input
                    type="text"
                    value={vetName}
                    onChange={e => setVetName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDeathModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg"
                >
                  Simpan Laporan Kematian
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
