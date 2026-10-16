import React, { useState } from 'react';
import {
  X, Scale, HeartPulse, Dna, BadgeDollarSign, ShoppingCart, Image,
  Clock, Calendar, Award, Building2, User
} from 'lucide-react';
import { LivestockItem } from '../../types';
import { storeService } from '../../services/storeService';
import { formatRupiah, formatDate, formatAgeString } from '../../utils/formatters';

interface LivestockDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  livestock: LivestockItem | null;
}

export const LivestockDetailModal: React.FC<LivestockDetailModalProps> = ({
  isOpen,
  onClose,
  livestock
}) => {
  const [activeTab, setActiveTab] = useState<'ringkasan' | 'harga' | 'bobot' | 'kesehatan' | 'breeding' | 'lokasi' | 'aktivitas'>('ringkasan');

  if (!isOpen || !livestock) return null;

  // Fetch history for this animal
  const weightLogs = storeService.weightRecords.filter(w => w.livestockId === livestock.id || w.tagId === livestock.tagId);
  const healthLogs = storeService.healthRecords.filter(h => h.livestockId === livestock.id || h.tagId === livestock.tagId);
  const breedingLogs = storeService.breedingRecords.filter(b => b.motherId === livestock.id || b.motherTag === livestock.tagId);
  // Mutasi antar lokasi sudah dinonaktifkan dari antarmuka.
  const transferLogs: NonNullable<LivestockItem['locationHistory']> = [];
  const priceHistory = livestock.priceHistory?.length
    ? [...livestock.priceHistory].sort((a, b) => b.changedAt.localeCompare(a.changedAt))
    : [{
        id: `initial-${livestock.id}`,
        changedAt: livestock.createdAt,
        newPurchasePrice: livestock.acquisitionPrice,
        newSellingPrice: livestock.sellingPrice ?? 0,
        changedBy: 'Data lama sistem',
        note: 'Harga awal sebelum fitur riwayat tersedia'
      }];

  // Build combined chronological timeline for Aktivitas
  const timelineEvents: { date: string; title: string; desc: string; type: string }[] = [];

  timelineEvents.push({
    date: livestock.entryDate,
    title: 'Ternak Masuk Database',
    desc: `Sumber: ${livestock.source}. Bobot awal: ${livestock.initialWeightKg} kg. Lokasi: ${livestock.locationName}`,
    type: 'entry'
  });

  weightLogs.forEach(w => {
    timelineEvents.push({
      date: w.weighDate,
      title: `Penimbangan Bobot: ${w.weightKg} kg`,
      desc: `Pertambahan: ${w.gainKg >= 0 ? '+' : ''}${w.gainKg} kg. Petugas: ${w.officerName}. Catatan: ${w.notes || '-'}`,
      type: 'weight'
    });
  });

  healthLogs.forEach(h => {
    timelineEvents.push({
      date: h.recordDate,
      title: `Pemeriksaan Kesehatan: ${h.condition}`,
      desc: `Status: ${h.status}. Penanganan: ${h.actionTaken}. Obat: ${h.medicineName || '-'}`,
      type: 'health'
    });
  });

  transferLogs.forEach(t => {
    timelineEvents.push({
      date: t.date,
      title: `Transfer Lokasi: ${t.fromLocationName} ➔ ${t.toLocationName}`,
      desc: `Alasan: ${t.reason}. Penanggung jawab: ${t.officerName}`,
      type: 'transfer'
    });
  });

  timelineEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="fixed inset-0 z-50 flex animate-fade-in items-end justify-center bg-slate-900/60 p-0 backdrop-blur-xs sm:items-center sm:p-4">
      <div className="flex max-h-[94dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:max-h-[92vh] sm:rounded-2xl">
        
        {/* Header Profile Summary */}
        <div className="p-4 sm:p-6 bg-[#123D18] text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-[#123D18] border-2 border-[#1B5E20] shrink-0 shadow-md">
              {livestock.photoUrl ? (
                <img src={livestock.photoUrl} alt={livestock.tagId} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#CBD5E1] font-bold text-xl">
                  {livestock.tagId.substring(0, 2)}
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold font-mono tracking-tight text-[#E4C25E]">
                  {livestock.tagId}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  livestock.status === 'Aktif' ? 'bg-[#F8FAFC] text-[#123D18]' :
                  livestock.status === 'Sakit' ? 'bg-rose-100 text-rose-900' :
                  livestock.status === 'Isolasi' ? 'bg-[#FBF6E9] text-[#A97A14]' : 'bg-slate-200 text-slate-800'
                }`}>
                  {livestock.status}
                </span>
              </div>
              <p className="text-xs text-[#F8FAFC] font-medium">
                {livestock.type} · {livestock.breed} ({livestock.gender})
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[11px] text-[#F1F5F9]">
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" />
                  {livestock.locationName}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatAgeString(livestock.estimatedAgeMonths)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex sm:flex-col items-end justify-between w-full sm:w-auto border-t sm:border-0 border-[#1B5E20] pt-2 sm:pt-0">
            <div className="text-left sm:text-right">
              <span className="text-[10px] text-[#E2E8F0] font-semibold uppercase tracking-wider block">Bobot Terakhir</span>
              <span className="text-2xl font-bold text-[#E4C25E] font-mono">{livestock.currentWeightKg} <span className="text-xs font-normal text-[#F1F5F9]">kg</span></span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-[#F1F5F9] hover:text-white hover:bg-[#1B5E20] rounded-lg transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50 px-4 overflow-x-auto text-xs font-semibold text-slate-600">
          {[
            { id: 'ringkasan', label: 'Ringkasan', icon: <Award className="w-3.5 h-3.5" /> },
            { id: 'harga', label: `Riwayat Harga (${priceHistory.length})`, icon: <BadgeDollarSign className="w-3.5 h-3.5" /> },
            { id: 'bobot', label: `Bobot (${weightLogs.length})`, icon: <Scale className="w-3.5 h-3.5" /> },
            { id: 'kesehatan', label: `Kesehatan (${healthLogs.length})`, icon: <HeartPulse className="w-3.5 h-3.5" /> },
            { id: 'breeding', label: `Breeding (${breedingLogs.length})`, icon: <Dna className="w-3.5 h-3.5" /> },
            { id: 'aktivitas', label: `Timeline Kronologis`, icon: <Clock className="w-3.5 h-3.5" /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-3 border-b-2 transition cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-[#1B5E20] text-[#123D18] font-bold bg-white'
                  : 'border-transparent hover:text-slate-900 hover:bg-slate-100/50'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-5 overflow-y-auto flex-1 text-xs text-slate-800 space-y-4">
          
          {/* TAB 1: RINGKASAN */}
          {activeTab === 'ringkasan' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Kode QR ID</span>
                  <span className="font-mono font-bold text-slate-900">{livestock.qrCode}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Kepemilikan</span>
                  <span className="font-semibold text-slate-900">{livestock.ownershipStatus}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Sumber Ternak</span>
                  <span className="font-semibold text-slate-900">{livestock.source}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Tanggal Masuk</span>
                  <span className="font-semibold text-slate-900">{formatDate(livestock.entryDate)}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Harga Perolehan</span>
                  <span className="font-semibold text-[#1B5E20]">{formatRupiah(livestock.acquisitionPrice)}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Harga Jual</span>
                  <span className="font-semibold text-[#1B5E20]">{formatRupiah(livestock.sellingPrice ?? 0)}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Bobot Awal</span>
                  <span className="font-bold text-slate-900">{livestock.initialWeightKg} kg</span>
                </div>
              </div>

              <div className="p-4 bg-[#FFFFFF]/50 rounded-xl border border-[#F1F5F9] space-y-2">
                <h4 className="font-bold text-[#123D18] text-xs">Silsilah Indukan & Pejantan</h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold block">Induk Betina:</span>
                    <span className="font-bold text-slate-800">{livestock.motherTag || 'Tidak terdata'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold block">Pejantan:</span>
                    <span className="font-bold text-slate-800">{livestock.fatherTag || 'Tidak terdata'}</span>
                  </div>
                </div>
              </div>

              {livestock.notes && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Ciri Fisik / Catatan</span>
                  <p className="text-slate-700 leading-relaxed mt-0.5">{livestock.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* PRICE HISTORY */}
          {activeTab === 'harga' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                  <span className="text-[10px] uppercase font-bold text-blue-700 block">Harga Beli Saat Ini</span>
                  <span className="text-base font-bold font-mono text-blue-900">{formatRupiah(livestock.acquisitionPrice)}</span>
                </div>
                <div className="p-3 rounded-xl bg-[#FFFFFF] border border-[#F1F5F9]">
                  <span className="text-[10px] uppercase font-bold text-[#1B5E20] block">Harga Jual Saat Ini</span>
                  <span className="text-base font-bold font-mono text-[#123D18]">{formatRupiah(livestock.sellingPrice ?? 0)}</span>
                </div>
                <div className="p-3 rounded-xl bg-[#FBF6E9] border border-[#EED995]">
                  <span className="text-[10px] uppercase font-bold text-[#A97A14] block">Estimasi Margin</span>
                  <span className="text-base font-bold font-mono text-[#A97A14]">{formatRupiah((livestock.sellingPrice ?? 0) - livestock.acquisitionPrice)}</span>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-x-auto">
                <table className="w-full min-w-[720px] text-left">
                  <thead className="bg-slate-100 text-[10px] font-bold text-slate-600 uppercase">
                    <tr>
                      <th className="p-2.5">Tanggal</th>
                      <th className="p-2.5">Harga Beli</th>
                      <th className="p-2.5">Harga Jual</th>
                      <th className="p-2.5">Diubah Oleh</th>
                      <th className="p-2.5">Alasan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {priceHistory.map(history => (
                      <tr key={history.id} className="hover:bg-slate-50">
                        <td className="p-2.5 whitespace-nowrap font-semibold">{formatDate(history.changedAt)}</td>
                        <td className="p-2.5 whitespace-nowrap">
                          {history.oldPurchasePrice !== undefined && (
                            <span className="block text-[10px] text-slate-400 line-through">{formatRupiah(history.oldPurchasePrice)}</span>
                          )}
                          <span className="font-bold font-mono text-blue-800">{formatRupiah(history.newPurchasePrice)}</span>
                        </td>
                        <td className="p-2.5 whitespace-nowrap">
                          {history.oldSellingPrice !== undefined && (
                            <span className="block text-[10px] text-slate-400 line-through">{formatRupiah(history.oldSellingPrice)}</span>
                          )}
                          <span className="font-bold font-mono text-[#1B5E20]">{formatRupiah(history.newSellingPrice)}</span>
                        </td>
                        <td className="p-2.5 font-semibold">{history.changedBy}</td>
                        <td className="p-2.5 text-slate-600">{history.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: BOBOT */}
          {activeTab === 'bobot' && (
            <div className="space-y-3">
              <div className="p-3 bg-[#FFFFFF] rounded-xl border border-[#F1F5F9] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-[#1B5E20] font-bold uppercase block">Total Pertambahan Bobot</span>
                  <span className="text-lg font-bold text-[#123D18]">
                    +{livestock.currentWeightKg - livestock.initialWeightKg} kg
                  </span>
                </div>
                <span className="text-xs font-semibold text-[#1B5E20]">
                  Dari Bobot Awal {livestock.initialWeightKg} kg ➔ {livestock.currentWeightKg} kg
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 text-[10px] font-bold text-slate-600 uppercase">
                    <tr>
                      <th className="p-2.5">Tanggal</th>
                      <th className="p-2.5">Bobot</th>
                      <th className="p-2.5">Pertambahan</th>
                      <th className="p-2.5">Petugas</th>
                      <th className="p-2.5">Catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {weightLogs.map(w => (
                      <tr key={w.id} className="hover:bg-slate-50">
                        <td className="p-2.5 font-medium text-slate-900">{formatDate(w.weighDate)}</td>
                        <td className="p-2.5 font-bold font-mono text-slate-900">{w.weightKg} kg</td>
                        <td className={`p-2.5 font-bold ${w.gainKg >= 0 ? 'text-[#1B5E20]' : 'text-rose-600'}`}>
                          {w.gainKg >= 0 ? `+${w.gainKg}` : w.gainKg} kg
                        </td>
                        <td className="p-2.5 text-slate-600">{w.officerName}</td>
                        <td className="p-2.5 text-slate-500">{w.notes || '-'}</td>
                      </tr>
                    ))}
                    {weightLogs.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-slate-400">Belum ada riwayat penimbangan bobot tambahan.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: KESEHATAN */}
          {activeTab === 'kesehatan' && (
            <div className="space-y-3">
              {healthLogs.map(h => (
                <div key={h.id} className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs">{h.condition}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                      {h.status}
                    </span>
                  </div>
                  <p className="text-slate-600 text-xs"><span className="font-semibold text-slate-700">Gejala:</span> {h.symptoms}</p>
                  <p className="text-slate-600 text-xs"><span className="font-semibold text-slate-700">Tindakan:</span> {h.actionTaken}</p>
                  {h.medicineName && (
                    <p className="text-slate-600 text-xs"><span className="font-semibold text-slate-700">Obat & Dosis:</span> {h.medicineName} ({h.dosage})</p>
                  )}
                  <div className="pt-1.5 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100">
                    <span>Petugas: {h.officerName} | Dokter Vet: {h.vetName || '-'}</span>
                    <span>Tanggal: {formatDate(h.recordDate)}</span>
                  </div>
                </div>
              ))}
              {healthLogs.length === 0 && (
                <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                  💚 Tidak ada riwayat penyakit atau gangguan kesehatan. Ternak dalam kondisi sehat prima.
                </div>
              )}
            </div>
          )}

          {/* TAB 4: BREEDING */}
          {activeTab === 'breeding' && (
            <div className="space-y-3">
              {breedingLogs.map(b => (
                <div key={b.id} className="p-3.5 bg-[#FBF6E9]/50 rounded-xl border border-[#EED995] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#A97A14] text-xs">Perkawinan ({b.method})</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#F8FAFC] text-[#1B5E20]">
                      {b.pregStatus}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Tanggal Kawin:</span>
                      <span className="font-semibold">{formatDate(b.matingDate)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Estimasi Lahir:</span>
                      <span className="font-semibold text-[#A97A14]">{formatDate(b.estBirthDate)}</span>
                    </div>
                  </div>
                  {b.notes && <p className="text-xs text-slate-600">{b.notes}</p>}
                </div>
              ))}
              {breedingLogs.length === 0 && (
                <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                  Belum ada rekam perkawinan atau kebuntingan untuk ternak ini.
                </div>
              )}
            </div>
          )}

          {/* TAB 5: LOKASI */}
          {activeTab === 'lokasi' && (
            <div className="space-y-3">
              {transferLogs.map((t, i) => (
                <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 text-xs">{t.fromLocationName} ➔ {t.toLocationName}</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">Alasan: {t.reason}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">{formatDate(t.date)}</span>
                </div>
              ))}
              {transferLogs.length === 0 && (
                <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                  Ternak belum pernah mengalami perpindahan mutasi lokasi kandang.
                </div>
              )}
            </div>
          )}

          {/* TAB 6: CHRONOLOGICAL TIMELINE */}
          {activeTab === 'aktivitas' && (
            <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {timelineEvents.map((evt, idx) => (
                <div key={idx} className="relative group">
                  <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-[#1B5E20] border-2 border-white shadow-xs" />
                  <div className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 transition">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs">{evt.title}</span>
                      <span className="text-[10px] font-semibold text-slate-400">{formatDate(evt.date)}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{evt.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
