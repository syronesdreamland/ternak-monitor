import type { UserRole } from '../types';

export type Actor = { uid: string; name: string; role: UserRole };
export type FundStatus = 'Draft' | 'Diajukan' | 'Diverifikasi Akuntan' | 'Disetujui Owner' | 'Dicairkan' | 'Selesai' | 'Perlu Revisi' | 'Ditolak' | 'Dibatalkan';
export type PaymentStatus = 'Belum Dibayar' | 'Menunggu Verifikasi' | 'Sebagian' | 'Lunas' | 'Ditolak';
export type LineItem = { description: string; quantity: number; unit: string; unitPrice: number };

export interface FundRequestDraft {
  category: string; location: string; purpose: string; neededDate: string; paymentMethod: string; notes: string; items: LineItem[];
}
export interface FundRequest extends FundRequestDraft {
  id: string; requestNo: string; requesterId: string; requesterName: string; requesterRole: UserRole; total: number;
  status: FundStatus; createdAt: string; verifiedBy?: string; approvedBy?: string; cancelledReason?: string;
}
export interface InvoiceDraft {
  kind: 'JUAL' | 'BELI' | 'DANA' | 'OPERASIONAL'; partyName: string; partyContact: string; issueDate: string; dueDate: string;
  taxPercent: number; discount: number; extraCost: number; notes: string; items: LineItem[];
}
export interface PaymentRecord {
  id: string; amount: number; method: string; paidAt: string; status: 'Menunggu Verifikasi' | 'Terverifikasi' | 'Ditolak';
  submittedBy: string; verifiedBy?: string; attachmentIds: string[]; rejectionReason?: string;
}
export interface Invoice extends InvoiceDraft {
  id: string; invoiceNo: string; subtotal: number; taxAmount: number; total: number; paidAmount: number; remainingAmount: number;
  paymentStatus: PaymentStatus; status: 'Aktif' | 'Dibatalkan'; payments: PaymentRecord[]; createdBy: string; createdAt: string; cancelledReason?: string;
}
export interface WorkflowAudit { id: string; at: string; actor: string; role: UserRole; action: string; targetId: string; detail?: string }
export interface WorkflowAlert { id: string; at: string; title: string; message: string; targetId: string }
interface WorkflowState { fundRequests: FundRequest[]; invoices: Invoice[]; audits: WorkflowAudit[]; alerts: WorkflowAlert[] }

const STORAGE_KEY = 'duta_agro_financial_documents_v1';
const emptyState = (): WorkflowState => ({ fundRequests: [], invoices: [], audits: [], alerts: [] });
const now = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const sumItems = (items: LineItem[]) => items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

const memoryFallback = new Map<string, string>();
const fallbackStorage: Storage = {
  get length() { return memoryFallback.size; },
  clear: () => memoryFallback.clear(),
  getItem: key => memoryFallback.get(key) ?? null,
  key: index => [...memoryFallback.keys()][index] ?? null,
  removeItem: key => memoryFallback.delete(key),
  setItem: (key, value) => { memoryFallback.set(key, String(value)); },
};
const defaultStorage = typeof localStorage === 'undefined' ? fallbackStorage : localStorage;

export class FinancialDocumentsStore {
  private state: WorkflowState;
  private listeners = new Set<() => void>();
  constructor(private storage: Storage = defaultStorage) {
    try {
      const stored = JSON.parse(storage.getItem(STORAGE_KEY) || 'null');
      // Produksi: mulai dari state kosong (tanpa seed demo).
      this.state = stored ? { ...emptyState(), ...stored } : emptyState();
    }
    catch { this.state = emptyState(); }
  }
  subscribe(listener: () => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  snapshot(): WorkflowState { return structuredClone(this.state); }
  getInvoice(invoiceId: string) { return this.state.invoices.find(item => item.id === invoiceId); }
  private save() { this.storage.setItem(STORAGE_KEY, JSON.stringify(this.state)); this.notifySync(); this.listeners.forEach(listener => listener()); }
  /** Kirim koleksi berubah ke dataSync (debounced push ke Supabase). */
  private notifySync() {
    import('./dataSync').then(({ dataSync }) => {
      dataSync.onCollectionChanged('findoc:fundRequests');
      dataSync.onCollectionChanged('findoc:invoices');
    }).catch(() => {});
  }
  /** Ganti koleksi (dipakai dataSync saat pull dari DB / realtime). Tanpa re-sync. */
  replaceCollection<K extends 'fundRequests' | 'invoices'>(key: K, items: WorkflowState[K]) {
    this.state[key] = items;
    try { this.storage.setItem(STORAGE_KEY, JSON.stringify(this.state)); } catch { /* ignore */ }
    this.listeners.forEach(listener => listener());
  }
  private audit(actor: Actor, action: string, targetId: string, detail?: string) {
    this.state.audits.unshift({ id: id('audit'), at: now(), actor: actor.name, role: actor.role, action, targetId, detail });
    this.state.alerts.unshift({ id: id('alert'), at: now(), title: action, message: detail ? `${actor.name}: ${detail}` : `Diproses oleh ${actor.name}`, targetId });
    this.state.alerts = this.state.alerts.slice(0, 50);
  }
  private requireRole(actor: Actor, roles: UserRole[], message: string) { if (!roles.includes(actor.role)) throw new Error(message); }

  createFundRequest(draft: FundRequestDraft, actor: Actor): FundRequest {
    this.requireRole(actor, ['OWNER', 'MANAGER', 'ACCOUNTANT', 'MITRA'], 'Role tidak boleh membuat pengajuan dana.');
    if (!draft.purpose.trim() || !draft.items.length) throw new Error('Keperluan dan rincian pengajuan wajib diisi.');
    const sequence = this.state.fundRequests.length + 1;
    const created: FundRequest = { ...draft, id: id('fund'), requestNo: `REQ-DANA/${draft.neededDate.slice(0, 4)}/${draft.neededDate.slice(5, 7)}/${String(sequence).padStart(4, '0')}`, requesterId: actor.uid, requesterName: actor.name, requesterRole: actor.role, total: sumItems(draft.items), status: 'Diajukan', createdAt: now() };
    this.state.fundRequests.unshift(created); this.audit(actor, 'Ajukan Dana', created.id, created.requestNo); this.save(); return created;
  }
  verifyFundRequest(requestId: string, actor: Actor) {
    this.requireRole(actor, ['ACCOUNTANT'], 'Hanya Akuntan yang dapat memverifikasi pengajuan.');
    const request = this.mustRequest(requestId); if (request.status !== 'Diajukan' && request.status !== 'Perlu Revisi') throw new Error('Pengajuan tidak dapat diverifikasi pada status ini.');
    request.status = 'Diverifikasi Akuntan'; request.verifiedBy = actor.name; this.audit(actor, 'Verifikasi Pengajuan', request.id); this.save(); return request;
  }
  approveFundRequest(requestId: string, actor: Actor) {
    this.requireRole(actor, ['OWNER'], 'Hanya Owner yang dapat memberikan persetujuan akhir.');
    const request = this.mustRequest(requestId);
    // Owner dapat menyetujui langsung dari 'Diajukan' (verifikasi Akuntan dilewati,
    // dipakai saat Akuntan tidak tersedia) ATAU dari 'Diverifikasi Akuntan' (alur normal).
    if (request.status !== 'Diajukan' && request.status !== 'Diverifikasi Akuntan') throw new Error('Pengajuan tidak dapat disetujui pada status ini.');
    if (request.status === 'Diajukan') request.verifiedBy = actor.name + ' (Owner menyetujui langsung)';
    request.status = 'Disetujui Owner'; request.approvedBy = actor.name; this.audit(actor, 'Setujui Pengajuan', request.id); this.save(); return request;
  }
  updateFundStatus(requestId: string, status: FundStatus, reason: string, actor: Actor) {
    const request = this.mustRequest(requestId);
    if (['Ditolak', 'Dibatalkan', 'Perlu Revisi'].includes(status) && !reason.trim()) throw new Error('Alasan wajib diisi.');
    if (status === 'Dicairkan') this.requireRole(actor, ['ACCOUNTANT'], 'Hanya Akuntan yang dapat mencatat pencairan.');
    else this.requireRole(actor, ['OWNER', 'ACCOUNTANT'], 'Role tidak berwenang mengubah status ini.');
    request.status = status; if (status === 'Dibatalkan') request.cancelledReason = reason; this.audit(actor, `Status Pengajuan: ${status}`, request.id, reason); this.save(); return request;
  }
  private mustRequest(requestId: string) { const request = this.state.fundRequests.find(item => item.id === requestId); if (!request) throw new Error('Pengajuan tidak ditemukan.'); return request; }

  createInvoice(draft: InvoiceDraft, actor: Actor): Invoice {
    this.requireRole(actor, ['OWNER', 'MANAGER', 'ACCOUNTANT'], 'Role tidak boleh membuat invoice.');
    const subtotal = sumItems(draft.items); const taxAmount = subtotal * Math.max(0, draft.taxPercent) / 100; const total = Math.max(0, subtotal + taxAmount + draft.extraCost - draft.discount);
    const sequence = this.state.invoices.filter(item => item.kind === draft.kind).length + 1;
    const invoice: Invoice = { ...draft, id: id('invoice'), invoiceNo: `INV-${draft.kind}/${draft.issueDate.slice(0, 4)}/${draft.issueDate.slice(5, 7)}/${String(sequence).padStart(4, '0')}`, subtotal, taxAmount, total, paidAmount: 0, remainingAmount: total, paymentStatus: 'Belum Dibayar', status: 'Aktif', payments: [], createdBy: actor.name, createdAt: now() };
    this.state.invoices.unshift(invoice); this.audit(actor, 'Buat Invoice', invoice.id, invoice.invoiceNo); this.save(); return invoice;
  }
  addPayment(invoiceId: string, amount: number, method: string, actor: Actor, attachmentIds: string[] = []) {
    const invoice = this.mustInvoice(invoiceId); if (invoice.status !== 'Aktif') throw new Error('Invoice sudah dibatalkan.');
    if (amount <= 0 || amount > invoice.remainingAmount) throw new Error('Nominal pembayaran tidak valid.');
    invoice.payments.push({ id: id('payment'), amount, method, paidAt: now(), status: 'Menunggu Verifikasi', submittedBy: actor.name, attachmentIds });
    invoice.paymentStatus = 'Menunggu Verifikasi'; this.audit(actor, 'Unggah Pembayaran', invoice.id, String(amount)); this.save(); return invoice;
  }
  verifyPayment(invoiceId: string, paymentId: string, actor: Actor) {
    this.requireRole(actor, ['ACCOUNTANT'], 'Hanya Akuntan yang dapat memverifikasi pembayaran.');
    const invoice = this.mustInvoice(invoiceId); const payment = invoice.payments.find(item => item.id === paymentId); if (!payment || payment.status !== 'Menunggu Verifikasi') throw new Error('Pembayaran tidak menunggu verifikasi.');
    payment.status = 'Terverifikasi'; payment.verifiedBy = actor.name; this.recalculatePayment(invoice); this.audit(actor, 'Verifikasi Pembayaran', invoice.id, payment.id); this.save(); return invoice;
  }
  rejectPayment(invoiceId: string, paymentId: string, reason: string, actor: Actor) {
    this.requireRole(actor, ['ACCOUNTANT'], 'Hanya Akuntan yang dapat menolak pembayaran.'); if (!reason.trim()) throw new Error('Alasan penolakan wajib diisi.');
    const invoice = this.mustInvoice(invoiceId); const payment = invoice.payments.find(item => item.id === paymentId); if (!payment) throw new Error('Pembayaran tidak ditemukan.');
    payment.status = 'Ditolak'; payment.rejectionReason = reason; this.recalculatePayment(invoice); this.audit(actor, 'Tolak Pembayaran', invoice.id, reason); this.save(); return invoice;
  }
  cancelInvoice(invoiceId: string, reason: string, actor: Actor) {
    this.requireRole(actor, ['OWNER'], 'Hanya Owner yang dapat membatalkan invoice.'); if (!reason.trim()) throw new Error('Alasan pembatalan wajib diisi.');
    const invoice = this.mustInvoice(invoiceId); invoice.status = 'Dibatalkan'; invoice.cancelledReason = reason; this.audit(actor, 'Batalkan Invoice', invoice.id, reason); this.save(); return invoice;
  }
  private mustInvoice(invoiceId: string) { const invoice = this.state.invoices.find(item => item.id === invoiceId); if (!invoice) throw new Error('Invoice tidak ditemukan.'); return invoice; }
  private recalculatePayment(invoice: Invoice) { invoice.paidAmount = invoice.payments.filter(item => item.status === 'Terverifikasi').reduce((sum, item) => sum + item.amount, 0); invoice.remainingAmount = Math.max(0, invoice.total - invoice.paidAmount); invoice.paymentStatus = invoice.remainingAmount === 0 ? 'Lunas' : invoice.paidAmount > 0 ? 'Sebagian' : invoice.payments.some(item => item.status === 'Menunggu Verifikasi') ? 'Menunggu Verifikasi' : 'Belum Dibayar'; }
  resetAll(actor: Actor) { this.requireRole(actor, ['OWNER'], 'Hanya Owner yang dapat mereset data.'); this.state = emptyState(); this.storage.removeItem(STORAGE_KEY); this.listeners.forEach(listener => listener()); }
}

export const financialDocumentsStore = new FinancialDocumentsStore();
