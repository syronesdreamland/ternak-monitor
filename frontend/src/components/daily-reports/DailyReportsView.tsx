import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Plus, Pencil, Archive, X } from 'lucide-react';
import { storeService } from '../../services/storeService';
import { DailyReport } from '../../types';
import { formatDate } from '../../utils/formatters';

export const DailyReportsView: React.FC = () => {
  const [reports, setReports] = useState(storeService.dailyReports.filter(report => !report.archivedAt));
  const [locations, setLocations] = useState(storeService.locations);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [reportStatus, setReportStatus] = useState<'Draft' | 'Dikirim'>('Draft');

  // Form
  const [locationId, setLocationId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [popInitial, setPopInitial] = useState('78');
  const [popPurchase, setPopPurchase] = useState('0');
  const [popBirth, setPopBirth] = useState('0');
  const [popTransferIn, setPopTransferIn] = useState('0');
  const [popSales, setPopSales] = useState('1');
  const [popDeath, setPopDeath] = useState('0');
  const [popTransferOut, setPopTransferOut] = useState('0');

  const [healthyCount, setHealthyCount] = useState('76');
  const [sickCount, setSickCount] = useState('1');
  const [isolationCount, setIsolationCount] = useState('0');

  const [activitiesText, setActivitiesText] = useState('Pemberian pakan konsentrat pagi & sore. Sanitasi kandang A1.');
  const [officerNotes, setOfficerNotes] = useState('Kondisi kandang aman dan kondusif.');

  useEffect(() => {
    const unsubscribe = storeService.subscribe(() => {
      setReports(storeService.dailyReports.filter(report => !report.archivedAt));
      setLocations(storeService.locations);
    });
    return unsubscribe;
  }, []);

  // Calculate popFinal dynamically
  const initNum = parseInt(popInitial) || 0;
  const purNum = parseInt(popPurchase) || 0;
  const birNum = parseInt(popBirth) || 0;
  const tInNum = parseInt(popTransferIn) || 0;
  const salNum = parseInt(popSales) || 0;
  const deaNum = parseInt(popDeath) || 0;
  const tOutNum = parseInt(popTransferOut) || 0;

  const popFinalCalculated = (initNum + purNum + birNum + tInNum) - (salNum + deaNum + tOutNum);

  const handleOpenModal = () => {
    setEditingReportId(null);
    setReportStatus('Draft');
    if (locations.length > 0) setLocationId(locations[0].id);
    setIsModalOpen(true);
  };

  const handleEdit = (report: DailyReport) => {
    setEditingReportId(report.id); setLocationId(report.locationId); setDate(report.date);
    setPopInitial(String(report.popInitial)); setPopPurchase(String(report.popPurchase)); setPopBirth(String(report.popBirth)); setPopTransferIn(String(report.popTransferIn));
    setPopSales(String(report.popSales)); setPopDeath(String(report.popDeath)); setPopTransferOut(String(report.popTransferOut));
    setHealthyCount(String(report.healthyCount)); setSickCount(String(report.sickCount)); setIsolationCount(String(report.isolationCount));
    setActivitiesText(report.activitiesText); setOfficerNotes(report.officerNotes ?? '');
    setReportStatus(report.reportStatus === 'Draft' ? 'Draft' : 'Dikirim'); setIsModalOpen(true);
  };

  const handleSaveReport = (e: React.FormEvent) => {
    e.preventDefault();
    const loc = locations.find(l => l.id === locationId) || locations[0];

    const reportData = {
      date,
      locationId: loc.id,
      locationName: loc.name,
      popInitial: initNum,
      popPurchase: purNum,
      popBirth: birNum,
      popTransferIn: tInNum,
      popSales: salNum,
      popDeath: deaNum,
      popTransferOut: tOutNum,
      healthyCount: parseInt(healthyCount) || 0,
      sickCount: parseInt(sickCount) || 0,
      isolationCount: parseInt(isolationCount) || 0,
      inTreatmentCount: parseInt(sickCount) || 0,
      activitiesText,
      expensesList: [],
      photos: [],
      officerNotes,
      reportStatus,
      createdBy: storeService.currentUser.displayName,
      submittedAt: new Date().toISOString()
    };
    if (editingReportId) storeService.updateDailyReport(editingReportId, reportData);
    else storeService.addDailyReport(reportData);

    setIsModalOpen(false);
  };

  const handleApprove = (reportId: string) => {
    storeService.updateDailyReportStatus(reportId, 'Disetujui', storeService.currentUser.displayName);
  };

  return (
    <div className="space-y-4 animate-fade-in pb-12">
      
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-[#1B5E20]" />
            <span>Laporan Harian Operasional Kandang (Daily Farm Report)</span>
          </h2>
          <p className="text-xs text-slate-500">
            Formulir laporan harian petugas kandang dengan kalkulasi rumus rekonsiliasi populasi otomatis
          </p>
        </div>

        <button
          onClick={handleOpenModal}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#123D18] hover:bg-[#1B5E20] text-white text-xs font-bold rounded-xl transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Buat Laporan Harian</span>
        </button>
      </div>

      {/* Reports List */}
      <div className="space-y-4">
        {reports.map(rpt => (
          <div key={rpt.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <span className="text-base font-bold text-slate-900">{rpt.locationName}</span>
                <span className="text-xs text-slate-500 font-medium ml-2">📅 Tanggal: {formatDate(rpt.date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${
                  rpt.reportStatus === 'Disetujui' ? 'bg-[#F8FAFC] text-[#123D18]' : 'bg-blue-100 text-blue-900'
                }`}>
                  Status: {rpt.reportStatus}
                </span>

                {storeService.currentUser.role === 'OWNER' && rpt.reportStatus !== 'Disetujui' && (
                  <button
                    onClick={() => handleApprove(rpt.id)}
                    className="px-3 py-1 bg-[#1B5E20] hover:bg-[#123D18] text-white text-xs font-bold rounded-lg transition cursor-pointer"
                  >
                    ✓ Setujui Laporan
                  </button>
                )}
                {rpt.reportStatus !== 'Disetujui' && <>
                  <button type="button" onClick={() => handleEdit(rpt)} aria-label={`Edit laporan ${rpt.locationName}`} className="p-1.5 text-blue-700 hover:bg-blue-50 rounded"><Pencil className="w-4 h-4" /></button>
                  <button type="button" onClick={() => window.confirm('Arsipkan laporan ini?') && storeService.archiveDailyReport(rpt.id)} aria-label={`Arsipkan laporan ${rpt.locationName}`} className="p-1.5 text-rose-700 hover:bg-rose-50 rounded"><Archive className="w-4 h-4" /></button>
                </>}
              </div>
            </div>

            {/* Formula Math Box */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono space-y-2">
              <span className="font-sans font-bold text-slate-700 block uppercase text-[10px]">
                🧮 Rekonsiliasi Matematika Populasi Kandang:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-800 font-bold">
                <div>Awal: <span className="text-slate-900">{rpt.popInitial}</span></div>
                <div>+ Masuk (Beli/Lahir/Tf): <span className="text-[#1B5E20]">+{rpt.popPurchase + rpt.popBirth + rpt.popTransferIn}</span></div>
                <div>- Keluar (Jual/Mati/Tf): <span className="text-rose-600">-{rpt.popSales + rpt.popDeath + rpt.popTransferOut}</span></div>
                <div className="text-[#123D18] font-bold">
                  = Populasi Akhir: <span className="text-base font-bold">{rpt.popFinal} ekor</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-700">
              <div>
                <span className="font-bold text-slate-900 block">Kondisi Kesehatan:</span>
                <p>Sehat: <span className="font-bold text-[#1B5E20]">{rpt.healthyCount}</span> | Sakit: <span className="font-bold text-rose-600">{rpt.sickCount}</span> | Isolasi: {rpt.isolationCount}</p>
              </div>
              <div>
                <span className="font-bold text-slate-900 block">Aktivitas & Catatan Petugas:</span>
                <p className="text-slate-600">{rpt.activitiesText}</p>
                {rpt.officerNotes && <p className="text-slate-500 mt-1">Catatan: {rpt.officerNotes}</p>}
              </div>
            </div>

            <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-100 flex items-center justify-between">
              <span>Dilaporkan oleh: <strong className="text-slate-600">{rpt.createdBy}</strong></span>
              {rpt.reviewedBy && <span>Disetujui oleh: <strong className="text-[#1B5E20]">{rpt.reviewedBy}</strong> ({formatDate(rpt.reviewedAt)})</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Input Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-xs sm:items-center sm:p-4">
          <div className="max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:max-h-[92vh] sm:rounded-2xl">
            <div className="sticky top-0 z-10 bg-[#123D18] p-4 text-white flex items-center justify-between font-bold">
              <h3>{editingReportId ? 'Edit Laporan Harian' : 'Form Laporan Harian Kandang'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-[#1B5E20] rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReport} className="space-y-3 p-5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Lokasi Peternakan *</label>
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
                  <label className="block font-bold text-slate-700 mb-1">Tanggal Laporan *</label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1B5E20] focus:outline-none"
                  />
                </div>
              </div>

              {/* Formula inputs */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-900 block">Mutasi & Perubahan Populasi:</span>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-semibold">Populasi Awal</label>
                    <input
                      type="number"
                      value={popInitial}
                      onChange={e => setPopInitial(e.target.value)}
                      className="w-full p-1.5 border border-slate-300 rounded font-mono font-bold text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#1B5E20] font-semibold">+ Pembelian</label>
                    <input
                      type="number"
                      value={popPurchase}
                      onChange={e => setPopPurchase(e.target.value)}
                      className="w-full p-1.5 border border-slate-300 rounded font-mono font-bold text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#1B5E20] font-semibold">+ Kelahiran</label>
                    <input
                      type="number"
                      value={popBirth}
                      onChange={e => setPopBirth(e.target.value)}
                      className="w-full p-1.5 border border-slate-300 rounded font-mono font-bold text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#1B5E20] font-semibold">+ Transfer In</label>
                    <input
                      type="number"
                      value={popTransferIn}
                      onChange={e => setPopTransferIn(e.target.value)}
                      className="w-full p-1.5 border border-slate-300 rounded font-mono font-bold text-center"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200">
                  <div>
                    <label className="block text-[10px] text-rose-600 font-semibold">- Penjualan</label>
                    <input
                      type="number"
                      value={popSales}
                      onChange={e => setPopSales(e.target.value)}
                      className="w-full p-1.5 border border-slate-300 rounded font-mono font-bold text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-rose-600 font-semibold">- Kematian</label>
                    <input
                      type="number"
                      value={popDeath}
                      onChange={e => setPopDeath(e.target.value)}
                      className="w-full p-1.5 border border-slate-300 rounded font-mono font-bold text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-rose-600 font-semibold">- Transfer Out</label>
                    <input
                      type="number"
                      value={popTransferOut}
                      onChange={e => setPopTransferOut(e.target.value)}
                      className="w-full p-1.5 border border-slate-300 rounded font-mono font-bold text-center"
                    />
                  </div>
                </div>

                <div className="p-2 bg-[#F8FAFC]/80 rounded text-center text-xs font-bold text-[#123D18] font-mono">
                  HASIL KALKULASI POPULASI AKHIR: {popFinalCalculated} EKOR
                </div>
              </div>

              {/* Health Breakdown */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Sehat</label>
                  <input
                    type="number"
                    value={healthyCount}
                    onChange={e => setHealthyCount(e.target.value)}
                    className="w-full p-1.5 border border-slate-300 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Sakit</label>
                  <input
                    type="number"
                    value={sickCount}
                    onChange={e => setSickCount(e.target.value)}
                    className="w-full p-1.5 border border-slate-300 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Isolasi</label>
                  <input
                    type="number"
                    value={isolationCount}
                    onChange={e => setIsolationCount(e.target.value)}
                    className="w-full p-1.5 border border-slate-300 rounded font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Uraian Aktivitas Kandang</label>
                <textarea
                  value={activitiesText}
                  onChange={e => setActivitiesText(e.target.value)}
                  rows={2}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1B5E20]"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Catatan Petugas</label>
                <textarea value={officerNotes} onChange={e => setOfficerNotes(e.target.value)} rows={2} className="w-full p-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Simpan Sebagai</label>
                <select value={reportStatus} onChange={e => setReportStatus(e.target.value as 'Draft' | 'Dikirim')} className="w-full p-2 border border-slate-300 rounded-lg"><option value="Draft">Draft</option><option value="Dikirim">Kirim untuk diperiksa</option></select>
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
                  {editingReportId ? 'Simpan Perubahan' : reportStatus === 'Draft' ? 'Simpan Draft' : 'Kirim Laporan Harian'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
