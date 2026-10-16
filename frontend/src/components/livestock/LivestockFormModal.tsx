import React, { useState, useEffect } from 'react';
import { X, Camera, Upload, Check, Trash2, ImagePlus } from 'lucide-react';
import { storeService } from '../../services/storeService';
import {
  LivestockItem, LivestockType, GenderType, ConditionCategoryType,
  LivestockStatusType, HealthStatusType, BreedingStatusType
} from '../../types';
import { prepareImageForStorage } from '../../utils/image';

interface LivestockFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editItem?: LivestockItem | null;
}

export const LivestockFormModal: React.FC<LivestockFormModalProps> = ({
  isOpen,
  onClose,
  editItem
}) => {
  const [tagId, setTagId] = useState('');
  const [type, setType] = useState<LivestockType>('Sapi');
  const [breed, setBreed] = useState('Simmental');
  const [gender, setGender] = useState<GenderType>('Jantan');
  const [dob, setDob] = useState('2024-03-01');
  const [colorTraits, setColorTraits] = useState('');
  const [locationId, setLocationId] = useState('');
  const [ownershipStatus, setOwnershipStatus] = useState<LivestockItem['ownershipStatus']>('Milik Mandiri');
  const [source, setSource] = useState<LivestockItem['source']>('Pembelian');
  const [acquisitionPrice, setAcquisitionPrice] = useState('18000000');
  const [sellingPrice, setSellingPrice] = useState('22000000');
  const [priceChangeNote, setPriceChangeNote] = useState('');
  const [initialWeightKg, setInitialWeightKg] = useState('300');
  const [conditionCategory, setConditionCategory] = useState<ConditionCategoryType>('Baik');
  const [status, setStatus] = useState<LivestockStatusType>('Aktif');
  const [healthStatus, setHealthStatus] = useState<HealthStatusType>('Sehat');
  const [breedingStatus, setBreedingStatus] = useState<BreedingStatusType>('Belum Dikawinkan');
  const [motherTag, setMotherTag] = useState('');
  const [fatherTag, setFatherTag] = useState('');
  const [notes, setNotes] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);

  const locations = storeService.locations;

  useEffect(() => {
    if (editItem) {
      setTagId(editItem.tagId);
      setType(editItem.type);
      setBreed(editItem.breed);
      setGender(editItem.gender);
      setDob(editItem.dob);
      setColorTraits(editItem.colorTraits);
      setLocationId(editItem.locationId);
      setOwnershipStatus(editItem.ownershipStatus);
      setSource(editItem.source);
      setAcquisitionPrice(String(editItem.acquisitionPrice));
      setSellingPrice(String(editItem.sellingPrice ?? Math.round(editItem.acquisitionPrice * 1.2)));
      setPriceChangeNote('');
      setInitialWeightKg(String(editItem.initialWeightKg));
      setConditionCategory(editItem.conditionCategory);
      setStatus(editItem.status);
      setHealthStatus(editItem.healthStatus);
      setBreedingStatus(editItem.breedingStatus);
      setMotherTag(editItem.motherTag || '');
      setFatherTag(editItem.fatherTag || '');
      setNotes(editItem.notes || '');
      setPhotoUrl(editItem.photoUrl || '');
    } else {
      setTagId(`SP-${Math.floor(1000 + Math.random() * 9000)}`);
      setLocationId(locations[0]?.id || '');
      setAcquisitionPrice('18000000');
      setSellingPrice('22000000');
      setPriceChangeNote('');
      setPhotoUrl('');
    }
    setPhotoError(null);
  }, [editItem, isOpen]);

  if (!isOpen) return null;

  const processPhoto = async (file?: File) => {
    if (!file) return;

    setPhotoError(null);
    setIsProcessingPhoto(true);
    try {
      setPhotoUrl(await prepareImageForStorage(file));
    } catch (uploadError) {
      setPhotoError(uploadError instanceof Error ? uploadError.message : 'Gambar gagal diproses.');
    } finally {
      setIsProcessingPhoto(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    void processPhoto(file);
  };

  const handlePhotoDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    void processPhoto(e.dataTransfer.files?.[0]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!tagId.trim()) {
      setError('ID Ternak / Ear Tag wajib diisi.');
      return;
    }

    if (!locationId) {
      setError('Lokasi peternakan wajib dipilih.');
      return;
    }

    const priceNum = parseFloat(acquisitionPrice) || 0;
    const sellingPriceNum = parseFloat(sellingPrice) || 0;
    const weightNum = parseFloat(initialWeightKg) || 0;
    const hasPriceChange = Boolean(editItem) && (
      priceNum !== editItem?.acquisitionPrice
      || sellingPriceNum !== (editItem?.sellingPrice ?? 0)
    );

    if (weightNum <= 0) {
      setError('Bobot ternak harus lebih dari 0 kg.');
      return;
    }

    if (hasPriceChange && !priceChangeNote.trim()) {
      setError('Alasan perubahan harga wajib diisi agar riwayat harga dapat dipertanggungjawabkan.');
      return;
    }

    const exists = storeService.livestock.some(l =>
      l.id !== editItem?.id &&
      l.tagId.toUpperCase() === tagId.trim().toUpperCase() &&
      !l.deletedAt
    );
    if (exists) {
      setError(`Ear Tag "${tagId}" sudah terdaftar di sistem. Gunakan ID unik.`);
      return;
    }

    if (editItem) {
      storeService.updateLivestock(editItem.id, {
        tagId, type, breed, gender, dob, colorTraits, locationId,
        ownershipStatus, source, acquisitionPrice: priceNum, sellingPrice: sellingPriceNum, initialWeightKg: weightNum,
        conditionCategory, status, healthStatus, breedingStatus, motherTag, fatherTag,
        notes, photoUrl
      }, priceChangeNote);
    } else {
      storeService.addLivestock({
        tagId,
        qrCode: `QR-${tagId}`,
        photoUrl,
        type,
        breed,
        gender,
        dob,
        estimatedAgeMonths: 24,
        colorTraits,
        locationId,
        ownershipStatus,
        source,
        entryDate: new Date().toISOString().split('T')[0],
        acquisitionPrice: priceNum,
        sellingPrice: sellingPriceNum,
        initialWeightKg: weightNum,
        currentWeightKg: weightNum,
        healthStatus,
        breedingStatus,
        motherTag,
        fatherTag,
        conditionCategory,
        status,
        notes
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex animate-fade-in items-end justify-center bg-slate-900/60 p-0 backdrop-blur-xs sm:items-center sm:p-4">
      <div className="flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:max-h-[92vh] sm:rounded-2xl">
        
        {/* Header */}
        <div className="shrink-0 bg-[#123D18] p-4 text-white flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold">
              {editItem ? `Edit Data Ternak (${editItem.tagId})` : 'Tambah Ternak Baru'}
            </h3>
            <p className="text-xs text-[#F1F5F9]">Isi formulir pendaftaran ternak ke master database</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#F1F5F9] hover:text-white hover:bg-[#1B5E20] rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-lg">
              ⚠️ {error}
            </div>
          )}

          {/* Photo & Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Foto Ternak</label>
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={handlePhotoDrop}
                className="relative border-2 border-dashed border-slate-300 rounded-xl p-2 text-center bg-slate-50 hover:bg-slate-100 transition h-36 flex flex-col items-center justify-center overflow-hidden"
              >
                {photoUrl ? (
                  <img src={photoUrl} alt="Ternak" className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <div className="text-slate-400">
                    <ImagePlus className="w-8 h-8 mx-auto mb-1" />
                    <span className="text-[10px] block">Tarik foto ke sini</span>
                    <span className="text-[9px]">JPG, PNG, WebP · maks. 5 MB</span>
                  </div>
                )}
                {isProcessingPhoto && (
                  <div className="absolute inset-0 bg-slate-900/60 text-white flex items-center justify-center text-[10px] font-bold">Memproses gambar...</div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <label className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-[#123D18] text-white text-[10px] font-bold cursor-pointer hover:bg-[#1B5E20]">
                  <Upload className="w-3.5 h-3.5" /> Galeri
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoUpload} className="hidden" />
                </label>
                <label className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-slate-700 text-white text-[10px] font-bold cursor-pointer hover:bg-slate-800">
                  <Camera className="w-3.5 h-3.5" /> Kamera
                  <input type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} className="hidden" />
                </label>
              </div>
              {photoUrl && (
                <button
                  type="button"
                  onClick={() => setPhotoUrl('')}
                  className="w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border border-rose-200 text-rose-700 text-[10px] font-bold hover:bg-rose-50 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Hapus Foto
                </button>
              )}
              {photoError && <p className="text-[10px] font-semibold text-rose-600">{photoError}</p>}
            </div>

            <div className="sm:col-span-2 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ID Ternak / Ear Tag *</label>
                  <input
                    type="text"
                    value={tagId}
                    onChange={e => setTagId(e.target.value)}
                    required
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-[#1B5E20] focus:outline-none"
                    placeholder="e.g. SP-0030"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Jenis Ternak</label>
                  <select
                    value={type}
                    onChange={e => setType(e.target.value as LivestockType)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-[#1B5E20] focus:outline-none"
                  >
                    <option value="Sapi">Sapi</option>
                    <option value="Kerbau">Kerbau</option>
                    <option value="Kambing">Kambing</option>
                    <option value="Domba">Domba</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ras / Breed</label>
                  <input
                    type="text"
                    value={breed}
                    onChange={e => setBreed(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#1B5E20] focus:outline-none"
                    placeholder="Simmental, Limosin, BX, PO, Toraya"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Jenis Kelamin</label>
                  <select
                    value={gender}
                    onChange={e => setGender(e.target.value as GenderType)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-[#1B5E20] focus:outline-none"
                  >
                    <option value="Jantan">Jantan</option>
                    <option value="Betina">Betina</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Location & Weights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Lokasi Peternakan *</label>
              <select
                value={locationId}
                onChange={e => setLocationId(e.target.value)}
                required
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold focus:ring-2 focus:ring-[#1B5E20] focus:outline-none"
              >
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Bobot Awal (kg) *</label>
              <input
                type="number"
                value={initialWeightKg}
                onChange={e => setInitialWeightKg(e.target.value)}
                required
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold focus:ring-2 focus:ring-[#1B5E20] focus:outline-none"
                placeholder="300"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Harga Beli (Rp)</label>
              <input
                type="number"
                value={acquisitionPrice}
                onChange={e => setAcquisitionPrice(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#1B5E20] focus:outline-none"
                placeholder="18000000"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Harga Jual (Rp)</label>
              <input
                type="number"
                min="0"
                value={sellingPrice}
                onChange={e => setSellingPrice(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#1B5E20] focus:outline-none"
                placeholder="22000000"
              />
            </div>
          </div>

          {editItem && (
            <div className="p-3 rounded-xl border border-[#EED995] bg-[#FBF6E9]/70">
              <label className="block text-xs font-bold text-[#A97A14] mb-1">Alasan Perubahan Harga</label>
              <input
                type="text"
                value={priceChangeNote}
                onChange={e => setPriceChangeNote(e.target.value)}
                className="w-full px-3 py-2 border border-[#EED995] bg-white rounded-lg text-xs focus:ring-2 focus:ring-[#C9971C] focus:outline-none"
                placeholder="Contoh: penyesuaian harga pasar, tambahan biaya perawatan"
              />
              <p className="mt-1 text-[10px] text-[#A97A14]">Wajib diisi hanya jika harga beli atau harga jual diubah.</p>
            </div>
          )}

          {/* Status & Condition */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Kategori Kondisi</label>
              <select
                value={conditionCategory}
                onChange={e => setConditionCategory(e.target.value as ConditionCategoryType)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-[#1B5E20] focus:outline-none"
              >
                <option value="Baik">Baik (Sehat & Optimal)</option>
                <option value="Standar">Standar</option>
                <option value="Kurang Baik">Kurang Baik</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Status Kesehatan</label>
              <select
                value={healthStatus}
                onChange={e => setHealthStatus(e.target.value as HealthStatusType)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-[#1B5E20] focus:outline-none"
              >
                <option value="Sehat">Sehat</option>
                <option value="Perlu Pemantauan">Perlu Pemantauan</option>
                <option value="Sakit">Sakit</option>
                <option value="Isolasi">Isolasi</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Status Operasional</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as LivestockStatusType)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-[#1B5E20] focus:outline-none"
              >
                <option value="Aktif">Aktif</option>
                <option value="Sakit">Sakit</option>
                <option value="Isolasi">Isolasi</option>
                <option value="Dijual">Dijual</option>
                <option value="Mati">Mati</option>
              </select>
            </div>
          </div>

          {/* Parents & Notes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ID / Tag Induk Betina</label>
              <input
                type="text"
                value={motherTag}
                onChange={e => setMotherTag(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#1B5E20] focus:outline-none"
                placeholder="e.g. SP-0010"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ID / Tag Pejantan</label>
              <input
                type="text"
                value={fatherTag}
                onChange={e => setFatherTag(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#1B5E20] focus:outline-none"
                placeholder="e.g. Pejantan Limosin A1"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Ciri Fisik / Catatan Khusus</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#1B5E20] focus:outline-none"
              placeholder="Warna bulu, bercak, kondisi pusar, atau catatan khusus..."
            />
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-200 -mx-5 -mb-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-[#123D18] rounded-lg hover:bg-[#1B5E20] transition cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{editItem ? 'Simpan Perubahan' : 'Daftarkan Ternak'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
