import React, { useState, useEffect } from 'react';
import {
  Plus, Upload, Download, Search, Filter, Eye, Edit3, Trash2,
  Building2, Scale, HeartPulse, Grid, List, Check
} from 'lucide-react';
import { storeService } from '../../services/storeService';
import { LivestockItem, LivestockType, GenderType, HealthStatusType } from '../../types';
import { formatAgeString, exportToExcel, exportToPDF } from '../../utils/formatters';

interface LivestockDatabaseViewProps {
  onOpenAddModal: () => void;
  onOpenEditModal: (item: LivestockItem) => void;
  onOpenImportModal: () => void;
  onOpenDetailModal: (item: LivestockItem) => void;
  globalSearchQuery?: string;
}

export const LivestockDatabaseView: React.FC<LivestockDatabaseViewProps> = ({
  onOpenAddModal,
  onOpenEditModal,
  onOpenImportModal,
  onOpenDetailModal,
  globalSearchQuery = ''
}) => {
  const [livestock, setLivestock] = useState(storeService.livestock);
  const [locations, setLocations] = useState(storeService.locations);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Filters
  const [search, setSearch] = useState(globalSearchQuery);
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [genderFilter, setGenderFilter] = useState<string>('ALL');
  const [healthFilter, setHealthFilter] = useState<string>('ALL');
  const [locFilter, setLocFilter] = useState<string>('ALL');

  useEffect(() => {
    setSearch(globalSearchQuery);
  }, [globalSearchQuery]);

  useEffect(() => {
    const unsubscribe = storeService.subscribe(() => {
      setLivestock(storeService.livestock);
      setLocations(storeService.locations);
    });
    return unsubscribe;
  }, []);

  const filteredItems = livestock.filter(item => {
    if (item.deletedAt) return false;
    if (item.status === 'Mati' || item.status === 'Dijual') return false;

    // Search matches Ear Tag, QR, Breed, Location
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTag = item.tagId.toLowerCase().includes(q);
      const matchQr = item.qrCode.toLowerCase().includes(q);
      const matchBreed = item.breed.toLowerCase().includes(q);
      const matchLoc = (item.locationName ?? '').toLowerCase().includes(q);
      if (!matchTag && !matchQr && !matchBreed && !matchLoc) return false;
    }

    if (typeFilter !== 'ALL' && item.type !== typeFilter) return false;
    if (genderFilter !== 'ALL' && item.gender !== genderFilter) return false;
    if (healthFilter !== 'ALL' && item.healthStatus !== healthFilter) return false;
    if (locFilter !== 'ALL' && item.locationId !== locFilter) return false;

    return true;
  });

  const handleDelete = (item: LivestockItem) => {
    if (window.confirm(`Yakin ingin mengarsip/menghapus ternak dengan Ear Tag ${item.tagId}?`)) {
      const reason = prompt('Masukkan alasan pengarsipan (e.g. Terjual di luar sistem / Afkir):', 'Pengarsipan Manual');
      if (reason) {
        storeService.softDeleteLivestock(item.id, reason);
      }
    }
  };

  const handleExportExcel = () => {
    const exportData = filteredItems.map(l => ({
      'Ear Tag': l.tagId,
      'Kode QR': l.qrCode,
      'Jenis': l.type,
      'Ras/Breed': l.breed,
      'Jenis Kelamin': l.gender,
      'Lokasi': l.locationName,
      'Bobot Awal (kg)': l.initialWeightKg,
      'Bobot Saat Ini (kg)': l.currentWeightKg,
      'Harga Beli': l.acquisitionPrice,
      'Harga Jual': l.sellingPrice ?? 0,
      'Status Kesehatan': l.healthStatus,
      'Kategori Kondisi': l.conditionCategory,
      'Tanggal Masuk': l.entryDate
    }));
    exportToExcel(exportData, `Master_Database_Ternak_${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportPDF = () => {
    const headers = ['Ear Tag', 'Jenis/Ras', 'Kelamin', 'Lokasi', 'Bobot (kg)', 'Status Sehat', 'Kondisi'];
    const rows = filteredItems.map(l => [
      l.tagId,
      `${l.type} (${l.breed})`,
      l.gender,
      l.locationName,
      `${l.currentWeightKg} kg`,
      l.healthStatus,
      l.conditionCategory
    ]);
    exportToPDF('Laporan Master Database Ternak', headers, rows, `Database_Ternak_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="space-y-4 animate-fade-in pb-12">
      
      {/* Top Controls Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Database & Master Data Ternak</h2>
          <p className="text-xs text-slate-500">
            Total terdaftar: <span className="font-bold text-slate-800">{filteredItems.length} ekor</span> dari seluruh lokasi
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#123D18] hover:bg-[#1B5E20] text-white font-bold rounded-xl text-xs transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Tambah Ternak</span>
          </button>

          <button
            onClick={onOpenImportModal}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#FFFFFF] hover:bg-[#F8FAFC] text-[#123D18] font-semibold border border-[#F1F5F9] rounded-xl text-xs transition cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Import CSV/Excel</span>
          </button>

          <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
            <button
              onClick={handleExportExcel}
              className="px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition cursor-pointer border-r border-slate-200"
            >
              Excel
            </button>
            <button
              onClick={handleExportPDF}
              className="px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition cursor-pointer"
            >
              PDF
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5 text-xs">
          {/* Search Input */}
          <div className="relative md:col-span-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari Ear Tag / QR..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#1B5E20] focus:outline-none"
            />
          </div>

          {/* Location Filter */}
          <select
            value={locFilter}
            onChange={e => setLocFilter(e.target.value)}
            aria-label="Filter berdasarkan lokasi peternakan"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#1B5E20] focus:outline-none cursor-pointer"
          >
            <option value="ALL">📍 Semua Lokasi</option>
            {locations.map(l => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            aria-label="Filter berdasarkan jenis ternak"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#1B5E20] focus:outline-none cursor-pointer"
          >
            <option value="ALL">🐄 Semua Jenis (Sapi/Kerbau)</option>
            <option value="Sapi">Sapi</option>
            <option value="Kerbau">Kerbau</option>
          </select>

          {/* Gender Filter */}
          <select
            value={genderFilter}
            onChange={e => setGenderFilter(e.target.value)}
            aria-label="Filter berdasarkan jenis kelamin ternak"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#1B5E20] focus:outline-none cursor-pointer"
          >
            <option value="ALL">♂♀ Semua Kelamin</option>
            <option value="Jantan">Jantan</option>
            <option value="Betina">Betina</option>
          </select>

          {/* Health Filter */}
          <select
            value={healthFilter}
            onChange={e => setHealthFilter(e.target.value)}
            aria-label="Filter berdasarkan status kesehatan ternak"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#1B5E20] focus:outline-none cursor-pointer"
          >
            <option value="ALL">💚 Semua Kesehatan</option>
            <option value="Sehat">Sehat</option>
            <option value="Sakit">Sakit</option>
            <option value="Isolasi">Isolasi</option>
          </select>
        </div>
      </div>

      {/* Main Content View: Table or Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        
        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="p-3.5">Ear Tag / QR</th>
                <th className="p-3.5">Jenis & Ras</th>
                <th className="p-3.5">Kelamin</th>
                <th className="p-3.5">Umur</th>
                <th className="p-3.5">Lokasi & Kandang</th>
                <th className="p-3.5">Bobot</th>
                <th className="p-3.5">Harga Beli / Jual</th>
                <th className="p-3.5 text-center">Status Kesehatan</th>
                <th className="p-3.5 text-center">Kategori</th>
                <th className="p-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredItems.map(item => (
                <tr key={item.id} className="hover:bg-slate-50 transition">
                  <td className="p-3.5 font-bold">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-[#123D18] text-[#E4C25E] font-bold flex items-center justify-center text-xs overflow-hidden shrink-0">
                        {item.photoUrl ? (
                          <img src={item.photoUrl} alt={item.tagId} className="w-full h-full object-cover" />
                        ) : (
                          item.tagId.substring(0, 2)
                        )}
                      </div>
                      <div>
                        <span className="font-mono font-bold text-slate-900 text-sm block">{item.tagId}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{item.qrCode}</span>
                      </div>
                    </div>
                  </td>

                  <td className="p-3.5">
                    <span className="font-bold text-slate-800">{item.type}</span>
                    <span className="text-slate-500 text-[11px] block">{item.breed}</span>
                  </td>

                  <td className="p-3.5 whitespace-nowrap">
                    <span className="text-[10px] text-slate-400 block">Beli: {item.acquisitionPrice.toLocaleString('id-ID')}</span>
                    <span className="text-[11px] font-bold text-[#1B5E20] block">Jual: {(item.sellingPrice ?? 0).toLocaleString('id-ID')}</span>
                  </td>

                  <td className="p-3.5 text-slate-700">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      item.gender === 'Jantan' ? 'bg-blue-50 text-blue-800 border border-blue-200' : 'bg-pink-50 text-pink-800 border border-pink-200'
                    }`}>
                      {item.gender}
                    </span>
                  </td>

                  <td className="p-3.5 text-slate-600">
                    {formatAgeString(item.estimatedAgeMonths)}
                  </td>

                  <td className="p-3.5 text-slate-700 font-semibold">
                    <div className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-[#1B5E20]" />
                      <span>{item.locationName}</span>
                    </div>
                    {item.penName && <span className="text-[10px] text-slate-400 block">{item.penName}</span>}
                  </td>

                  <td className="p-3.5">
                    <span className="font-mono font-bold text-slate-900 text-sm">{item.currentWeightKg} kg</span>
                    <span className="text-[10px] text-slate-400 block">Awal: {item.initialWeightKg} kg</span>
                  </td>

                  <td className="p-3.5 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      item.healthStatus === 'Sehat' ? 'bg-[#F8FAFC] text-[#123D18]' :
                      item.healthStatus === 'Sakit' ? 'bg-rose-100 text-rose-900' : 'bg-[#FBF6E9] text-[#A97A14]'
                    }`}>
                      {item.healthStatus}
                    </span>
                  </td>

                  <td className="p-3.5 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                      {item.conditionCategory}
                    </span>
                  </td>

                  <td className="p-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onOpenDetailModal(item)}
                        className="p-1.5 text-slate-600 hover:text-[#1B5E20] hover:bg-[#FFFFFF] rounded-lg transition cursor-pointer"
                        title="Lihat Profile Detail"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onOpenEditModal(item)}
                        className="p-1.5 text-slate-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                        title="Edit Data"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="Arsip / Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    Tidak ditemukan data ternak sesuai filter. Silakan ubah pencarian atau tambah ternak baru.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
};
