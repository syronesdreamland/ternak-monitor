import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, FileDown, FileText, Plus, Printer, Receipt, ShieldCheck, Upload, WalletCards, XCircle, Paperclip } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { financialDocumentsStore, type Actor, type FundRequestDraft, type InvoiceDraft, type LineItem } from '../../services/financialDocuments';
import { saveAttachments, parseAttachmentId, getAttachment } from '../../services/r2Storage';
import { storeService } from '../../services/storeService';
import { formatRupiah } from '../../utils/formatters';

const today = () => new Date().toISOString().slice(0, 10);
const emptyLine = (): LineItem => ({ description: '', quantity: 1, unit: 'unit', unitPrice: 0 });
const actor = (): Actor => ({ uid: storeService.currentUser.uid, name: storeService.currentUser.displayName, role: storeService.currentUser.role });
const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char] ?? char));

export const FinancialDocumentsView: React.FC<{ initialTab?: 'funding' | 'invoices' }> = ({ initialTab = 'funding' }) => {
  const [tab, setTab] = useState(initialTab);
  const [version, setVersion] = useState(0);
  const [message, setMessage] = useState('');
  const [showFundForm, setShowFundForm] = useState(false);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const state = useMemo(() => financialDocumentsStore.snapshot(), [version]);
  const role = storeService.currentUser.role;
  const visibleFundRequests = role === 'MITRA' ? state.fundRequests.filter(item => item.requesterId === storeService.currentUser.uid) : state.fundRequests;
  useEffect(() => financialDocumentsStore.subscribe(() => setVersion(value => value + 1)), []);
  useEffect(() => setTab(initialTab), [initialTab]);

  const [fund, setFund] = useState<FundRequestDraft>({ category: 'Pakan', location: 'Kulim', purpose: '', neededDate: today(), paymentMethod: 'Transfer Bank', notes: '', items: [emptyLine()] });
  const [invoice, setInvoice] = useState<InvoiceDraft>({ kind: 'JUAL', partyName: '', partyContact: '', issueDate: today(), dueDate: today(), taxPercent: 0, discount: 0, extraCost: 0, notes: '', items: [emptyLine()] });

  const run = (operation: () => unknown, success: string) => { try { operation(); setMessage(success); } catch (error) { setMessage(error instanceof Error ? error.message : 'Operasi gagal.'); } };
  const updateLine = (kind: 'fund' | 'invoice', index: number, patch: Partial<LineItem>) => {
    if (kind === 'fund') setFund(value => ({ ...value, items: value.items.map((item, i) => i === index ? { ...item, ...patch } : item) }));
    else setInvoice(value => ({ ...value, items: value.items.map((item, i) => i === index ? { ...item, ...patch } : item) }));
  };
  const addLine = (kind: 'fund' | 'invoice') => {
    if (kind === 'fund') setFund(value => ({ ...value, items: [...value.items, emptyLine()] }));
    else setInvoice(value => ({ ...value, items: [...value.items, emptyLine()] }));
  };
  const removeLine = (kind: 'fund' | 'invoice', index: number) => {
    if (kind === 'fund') setFund(value => ({ ...value, items: value.items.length > 1 ? value.items.filter((_, i) => i !== index) : value.items }));
    else setInvoice(value => ({ ...value, items: value.items.length > 1 ? value.items.filter((_, i) => i !== index) : value.items }));
  };

  const exportPdf = (invoiceId: string) => {
    const item = financialDocumentsStore.getInvoice(invoiceId); if (!item) return;
    const pdf = new jsPDF(); pdf.setFontSize(18); pdf.text('PT.DUTA AGRI NUSANTARA', 18, 20); pdf.setFontSize(11);
    pdf.text(`Invoice: ${item.invoiceNo}`, 18, 32); pdf.text(`Pelanggan/Vendor: ${item.partyName}`, 18, 40); pdf.text(`Tanggal: ${item.issueDate} | Jatuh tempo: ${item.dueDate}`, 18, 48);
    let y = 62; item.items.forEach((line, index) => { pdf.text(`${index + 1}. ${line.description} · ${line.quantity} ${line.unit} x ${formatRupiah(line.unitPrice)}`, 18, y); y += 8; });
    pdf.text(`Subtotal: ${formatRupiah(item.subtotal)}`, 18, y + 6); pdf.text(`Pajak: ${formatRupiah(item.taxAmount)}`, 18, y + 14); pdf.setFontSize(14); pdf.text(`TOTAL: ${formatRupiah(item.total)}`, 18, y + 26); pdf.setFontSize(11); pdf.text(`Dibayar: ${formatRupiah(item.paidAmount)} | Sisa: ${formatRupiah(item.remainingAmount)}`, 18, y + 36);
    pdf.save(`${item.invoiceNo.replaceAll('/', '-')}.pdf`);
  };

  const printInvoice = (invoiceId: string) => {
    const item = financialDocumentsStore.getInvoice(invoiceId); if (!item) return;
    const popup = window.open('', '_blank'); if (!popup) return; popup.opener = null;
    popup.document.write(`<title>${escapeHtml(item.invoiceNo)}</title><style>body{font-family:Arial;padding:40px;color:#0F172A}h1{color:#1B5E20}table{width:100%;border-collapse:collapse}td,th{padding:8px;border-bottom:1px solid #ddd;text-align:left}.total{font-size:20px;font-weight:bold}</style><h1>PT.DUTA AGRI NUSANTARA</h1><h2>${escapeHtml(item.invoiceNo)}</h2><p>${escapeHtml(item.partyName)} · ${escapeHtml(item.partyContact)}</p><p>Tanggal ${escapeHtml(item.issueDate)} · Jatuh tempo ${escapeHtml(item.dueDate)}</p><table><tr><th>Rincian</th><th>Qty</th><th>Harga</th></tr>${item.items.map(line => `<tr><td>${escapeHtml(line.description)}</td><td>${line.quantity} ${escapeHtml(line.unit)}</td><td>${formatRupiah(line.unitPrice)}</td></tr>`).join('')}</table><p class="total">Total ${formatRupiah(item.total)}</p><p>Dibayar ${formatRupiah(item.paidAmount)} · Sisa ${formatRupiah(item.remainingAmount)}</p>`); popup.document.close(); popup.print();
  };

  /** Unduh/buka satu lampiran bukti pembayaran (R2 public URL atau IndexedDB demo). */
  const downloadAttachment = async (paymentAttachmentId: string) => {
    try {
      const attachment = await getAttachment(paymentAttachmentId);
      if (!attachment) { setMessage('Lampiran tidak ditemukan.'); return; }
      const link = document.createElement('a');
      if (attachment.url) {
        link.href = attachment.url;
        link.target = '_blank';
        link.rel = 'noopener';
      } else if (attachment.blob) {
        link.href = URL.createObjectURL(attachment.blob);
      } else {
        setMessage('Lampiran tidak dapat dibuka.');
        return;
      }
      link.download = attachment.name || 'bukti-pembayaran';
      document.body.appendChild(link);
      link.click();
      link.remove();
      if (attachment.blob) setTimeout(() => URL.revokeObjectURL(link.href), 5000);
    } catch {
      setMessage('Gagal membuka lampiran.');
    }
  };

  /** Panel bukti pembayaran sebuah invoice: daftar file + tombol unduh. */
  const PaymentAttachments: React.FC<{ invoiceId: string }> = ({ invoiceId }) => {
    const invoice = financialDocumentsStore.getInvoice(invoiceId);
    const files = (invoice?.payments ?? []).flatMap(payment => payment.attachmentIds.map((attachmentId, index) => ({
      paymentId: payment.id, status: payment.status, submittedBy: payment.submittedBy,
      attachmentId, label: `Bukti ${index + 1}`, name: parseAttachmentId(attachmentId).name ?? 'lampiran',
    })));
    if (files.length === 0) return null;
    return <div className="mt-3 space-y-1.5 rounded-xl bg-slate-50 p-2.5">{files.map(file => (
      <div key={file.attachmentId.slice(-24) + file.paymentId} className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-[11px] font-bold text-slate-600"><Paperclip className="mr-1 inline h-3.5 w-3.5" />{escapeHtml(file.name)} <span className="font-normal text-slate-400">· diunggah {escapeHtml(file.submittedBy)}</span></span>
        <button onClick={() => downloadAttachment(file.attachmentId)} className="shrink-0 rounded-lg bg-white px-2.5 py-1.5 text-[10px] font-bold text-[#1B5E20] ring-1 ring-slate-200 hover:bg-slate-50"><FileDown className="mr-1 inline h-3.5 w-3.5" />Unduh</button>
      </div>
    ))}</div>;
  };

  return <div className="space-y-5 pb-16">
    <div className="rounded-3xl bg-[#1B5E20] p-5 text-white shadow-lg sm:p-7"><p className="ranch-label ranch-label--on-dark">Keuangan terkontrol</p><h2 className="mt-2 text-2xl font-bold text-white!">Pengajuan Dana, Invoice &amp; Pembayaran</h2><p className="mt-2 text-sm text-white/85!">Alur persetujuan, cicilan, bukti pembayaran, dan audit dalam satu ruang kerja.</p></div>
    <div className="flex gap-2 rounded-2xl border bg-white p-2"><button onClick={() => setTab('funding')} className={`flex-1 rounded-xl px-4 py-3 text-xs font-bold ${tab === 'funding' ? 'bg-[#1B5E20] text-white' : 'text-slate-500'}`}><WalletCards className="mr-2 inline h-4 w-4"/>Pengajuan Dana</button><button onClick={() => setTab('invoices')} className={`flex-1 rounded-xl px-4 py-3 text-xs font-bold ${tab === 'invoices' ? 'bg-[#1B5E20] text-white' : 'text-slate-500'}`}><Receipt className="mr-2 inline h-4 w-4"/>Invoice & Pembayaran</button></div>
    {message && <div role="status" className="rounded-xl border border-[#EED995] bg-[#FBF6E9] p-3 text-xs font-bold text-[#A97A14]">{message}</div>}

    {tab === 'funding' && <>
      <div className="flex items-center justify-between"><div><h3 className="font-bold text-slate-950">Daftar Pengajuan</h3><p className="text-xs text-slate-500">Akuntan verifikasi, Owner menyetujui final.</p></div><button onClick={() => setShowFundForm(true)} className="ranch-action-primary"><Plus className="h-4 w-4"/>Buat Pengajuan</button></div>
      <div className="grid gap-3">{visibleFundRequests.map(item => <article key={item.id} className="rounded-2xl border bg-white p-4 shadow-sm"><div className="flex flex-wrap justify-between gap-3"><div><p className="text-xs font-bold text-[#1B5E20]">{item.requestNo}</p><h4 className="mt-1 font-bold">{item.purpose}</h4><p className="text-xs text-slate-500">{item.requesterName} · {item.category} · {item.location}</p></div><div className="text-right"><p className="text-lg font-bold">{formatRupiah(item.total)}</p><span className="rounded-full bg-[#FBF6E9] px-2 py-1 text-[10px] font-bold text-[#A97A14]">{item.status}</span></div></div><div className="mt-3 flex flex-wrap gap-2">{role === 'ACCOUNTANT' && item.status === 'Diajukan' && <button onClick={() => run(() => financialDocumentsStore.verifyFundRequest(item.id, actor()), 'Pengajuan diverifikasi.')} className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-800"><ShieldCheck className="mr-1 inline h-4 w-4"/>Verifikasi</button>}{role === 'OWNER' && (item.status === 'Diverifikasi Akuntan' || item.status === 'Diajukan') && <button onClick={() => run(() => financialDocumentsStore.approveFundRequest(item.id, actor()), item.status === 'Diajukan' ? 'Pengajuan disetujui langsung oleh Owner.' : 'Pengajuan disetujui.')} className="rounded-lg bg-[#FFFFFF] px-3 py-2 text-xs font-bold text-[#1B5E20]"><CheckCircle2 className="mr-1 inline h-4 w-4"/>Setujui{item.status === 'Diajukan' ? ' (langsung)' : ''}</button>}{role === 'ACCOUNTANT' && item.status === 'Disetujui Owner' && <button onClick={() => run(() => financialDocumentsStore.updateFundStatus(item.id, 'Dicairkan', '', actor()), 'Pencairan dicatat.')} className="rounded-lg bg-[#FBF6E9] px-3 py-2 text-xs font-bold text-[#A97A14]">Catat Dicairkan</button>}</div></article>)}{visibleFundRequests.length === 0 && <Empty text="Belum ada pengajuan dana."/>}</div>
    </>}

    {tab === 'invoices' && <>
      <div className="flex items-center justify-between"><div><h3 className="font-bold text-slate-950">Invoice & Bukti Pembayaran</h3><p className="text-xs text-slate-500">Mendukung pajak opsional, DP, cicilan, print, dan PDF.</p></div>{role !== 'MITRA' && <button onClick={() => setShowInvoiceForm(true)} className="ranch-action-primary"><Plus className="h-4 w-4"/>Buat Invoice</button>}</div>
      <div className="grid gap-3">{state.invoices.map(item => <article key={item.id} className="rounded-2xl border bg-white p-4 shadow-sm"><div className="flex flex-wrap justify-between gap-3"><div><p className="text-xs font-bold text-[#1B5E20]">{item.invoiceNo}</p><h4 className="mt-1 font-bold">{item.partyName}</h4><p className="text-xs text-slate-500">Jatuh tempo {item.dueDate} · {item.paymentStatus}</p></div><div className="text-right"><p className="text-lg font-bold">{formatRupiah(item.total)}</p><p className="text-xs text-slate-500">Sisa {formatRupiah(item.remainingAmount)}</p></div></div><div className="mt-3 flex flex-wrap gap-2"><button onClick={() => printInvoice(item.id)} className="rounded-lg border px-3 py-2 text-xs font-bold"><Printer className="mr-1 inline h-4 w-4"/>Print</button><button onClick={() => exportPdf(item.id)} className="rounded-lg border px-3 py-2 text-xs font-bold"><FileDown className="mr-1 inline h-4 w-4"/>PDF</button>{item.status === 'Aktif' && item.remainingAmount > 0 && <PaymentButton invoiceId={item.id} remaining={item.remainingAmount} onMessage={setMessage}/>} {role === 'ACCOUNTANT' && item.payments.filter(payment => payment.status === 'Menunggu Verifikasi').map(payment => <button key={payment.id} onClick={() => run(() => financialDocumentsStore.verifyPayment(item.id, payment.id, actor()), 'Pembayaran terverifikasi.')} className="rounded-lg bg-[#FFFFFF] px-3 py-2 text-xs font-bold text-[#1B5E20]"><CheckCircle2 className="mr-1 inline h-4 w-4"/>Verifikasi {formatRupiah(payment.amount)}</button>)}{role === 'OWNER' && <button onClick={() => { const reason = prompt('Alasan pembatalan invoice:'); if (reason) run(() => financialDocumentsStore.cancelInvoice(item.id, reason, actor()), 'Invoice dibatalkan.'); }} className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700"><XCircle className="mr-1 inline h-4 w-4"/>Batalkan</button>}</div><PaymentAttachments invoiceId={item.id} /></article>)}{state.invoices.length === 0 && <Empty text="Belum ada invoice."/>}</div>
    </>}

    {role !== 'MITRA' && state.alerts.length > 0 && <section className="rounded-2xl border bg-white p-4"><h3 className="mb-3 text-sm font-bold">Notifikasi & Aktivitas Terbaru</h3><div className="space-y-2">{state.alerts.slice(0, 6).map(alert => <div key={alert.id} className="rounded-xl bg-slate-50 px-3 py-2"><p className="text-xs font-bold text-slate-800">{alert.title}</p><p className="text-[11px] text-slate-500">{alert.message} · {new Date(alert.at).toLocaleString('id-ID')}</p></div>)}</div></section>}

    {showFundForm && <Modal title="Pengajuan Dana Baru" onClose={() => setShowFundForm(false)}><Select label="Kategori" value={fund.category} onChange={value => setFund({...fund, category:value})} options={['Pakan','Pembelian Ternak','Kesehatan/Obat','Perawatan Kandang','Transportasi','Tenaga Kerja','Operasional Lainnya']}/><Input label="Lokasi/Kandang" value={fund.location} onChange={value => setFund({...fund,location:value})}/><Input label="Keperluan" value={fund.purpose} onChange={value => setFund({...fund,purpose:value})}/><Input label="Tanggal Dana Dibutuhkan" type="date" value={fund.neededDate} onChange={value => setFund({...fund,neededDate:value})}/>{fund.items.map((line, i) => <LineEditor key={i} index={i} item={line} onRemove={() => removeLine('fund', i)} onChange={patch => updateLine('fund', i, patch)} canRemove={fund.items.length > 1} />)}<button type="button" onClick={() => addLine('fund')} className="rounded-xl border border-dashed border-[#1B5E20] px-3 py-2 text-xs font-bold text-[#1B5E20] hover:bg-[#FFFFFF]">+ Tambah Rincian</button><button onClick={() => { run(() => financialDocumentsStore.createFundRequest(fund, actor()), 'Pengajuan berhasil dikirim.'); setShowFundForm(false); }} className="ranch-action-primary w-full justify-center">Kirim Pengajuan</button></Modal>}
    {showInvoiceForm && <Modal title="Invoice Baru" onClose={() => setShowInvoiceForm(false)}><Select label="Jenis" value={invoice.kind} onChange={value => setInvoice({...invoice,kind:value as InvoiceDraft['kind']})} options={['JUAL','BELI','DANA','OPERASIONAL']}/><Input label="Pelanggan/Vendor" value={invoice.partyName} onChange={value => setInvoice({...invoice,partyName:value})}/><Input label="Kontak" value={invoice.partyContact} onChange={value => setInvoice({...invoice,partyContact:value})}/><div className="grid grid-cols-2 gap-3"><Input label="Tanggal" type="date" value={invoice.issueDate} onChange={value => setInvoice({...invoice,issueDate:value})}/><Input label="Jatuh Tempo" type="date" value={invoice.dueDate} onChange={value => setInvoice({...invoice,dueDate:value})}/></div>{invoice.items.map((line, i) => <LineEditor key={i} index={i} item={line} onRemove={() => removeLine('invoice', i)} onChange={patch => updateLine('invoice', i, patch)} canRemove={invoice.items.length > 1} />)}<button type="button" onClick={() => addLine('invoice')} className="rounded-xl border border-dashed border-[#1B5E20] px-3 py-2 text-xs font-bold text-[#1B5E20] hover:bg-[#FFFFFF]">+ Tambah Rincian</button><Input label="Pajak Opsional (%)" type="number" value={String(invoice.taxPercent)} onChange={value => setInvoice({...invoice,taxPercent:Number(value)})}/><button onClick={() => { run(() => financialDocumentsStore.createInvoice(invoice, actor()), 'Invoice berhasil dibuat.'); setShowInvoiceForm(false); }} className="ranch-action-primary w-full justify-center">Simpan Invoice</button></Modal>}
  </div>;
};

const PaymentButton: React.FC<{invoiceId:string;remaining:number;onMessage:(value:string)=>void}> = ({invoiceId,remaining,onMessage}) => { const [busy,setBusy]=useState(false); return <label className="cursor-pointer rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-800"><Upload className="mr-1 inline h-4 w-4"/>{busy?'Mengunggah...':'Bayar / Upload Bukti'}<input type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={async event => { const files=[...(event.target.files??[])]; if(!files.length)return; const amount=Number(prompt(`Nominal pembayaran (maks. ${remaining}):`,String(remaining))); if(!amount)return; try{setBusy(true);const ids=await saveAttachments(files);financialDocumentsStore.addPayment(invoiceId,amount,'Transfer Bank',actor(),ids);onMessage('Bukti pembayaran tersimpan dan menunggu verifikasi Akuntan.');}catch(error){onMessage(error instanceof Error?error.message:'Upload gagal.');}finally{setBusy(false);event.target.value='';}}}/></label> };
const Empty=({text}:{text:string})=><div className="rounded-2xl border border-dashed bg-white p-10 text-center text-sm text-slate-400"><FileText className="mx-auto mb-2 h-7 w-7"/>{text}</div>;
const Modal:React.FC<{title:string;onClose:()=>void;children:React.ReactNode}>=({title,onClose,children})=><div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl"><div className="mb-4 flex items-center justify-between"><h3 className="text-lg font-bold">{title}</h3><button onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100"><XCircle className="h-5 w-5"/></button></div><div className="space-y-3">{children}</div></div></div>;
const Input=({label,value,onChange,type='text'}:{label:string;value:string;onChange:(value:string)=>void;type?:string})=><label className="block text-xs font-bold text-slate-700">{label}<input type={type} value={value} onChange={event=>onChange(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-[#1B5E20]"/></label>;
const Select=({label,value,onChange,options}:{label:string;value:string;onChange:(value:string)=>void;options:string[]})=><label className="block text-xs font-bold text-slate-700">{label}<select value={value} onChange={event=>onChange(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5">{options.map(option=><option key={option}>{option}</option>)}</select></label>;
const LineEditor=({index,item,onRemove,canRemove,onChange}:{index:number;item:LineItem;onRemove:()=>void;canRemove:boolean;onChange:(patch:Partial<LineItem>)=>void})=><div className="space-y-2 rounded-xl bg-slate-50 p-3"><div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Rincian #{index+1}</span>{canRemove && <button type="button" onClick={onRemove} className="rounded-lg px-2 py-1 text-[10px] font-bold text-rose-600 hover:bg-rose-50">Hapus</button>}</div><div className="grid grid-cols-2 gap-3"><Input label="Rincian" value={item.description} onChange={value=>onChange({description:value})}/><Input label="Satuan" value={item.unit} onChange={value=>onChange({unit:value})}/><Input label="Jumlah" type="number" value={String(item.quantity)} onChange={value=>onChange({quantity:Number(value)})}/><Input label="Harga Satuan" type="number" value={String(item.unitPrice)} onChange={value=>onChange({unitPrice:Number(value)})}/></div></div>;
