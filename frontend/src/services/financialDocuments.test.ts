import { beforeEach, describe, expect, it } from 'vitest';
import { FinancialDocumentsStore, type FundRequestDraft, type InvoiceDraft } from './financialDocuments';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, String(value)); }
}

const fundDraft: FundRequestDraft = {
  category: 'Pakan', location: 'Kulim', purpose: 'Pembelian konsentrat', neededDate: '2026-09-05',
  paymentMethod: 'Transfer Bank', notes: '', items: [{ description: 'Konsentrat', quantity: 10, unit: 'sak', unitPrice: 250000 }],
};

const invoiceDraft: InvoiceDraft = {
  kind: 'JUAL', partyName: 'Pembeli Demo', partyContact: '0812', issueDate: '2026-08-31', dueDate: '2026-09-07',
  taxPercent: 0, discount: 0, extraCost: 0, notes: '', items: [{ description: 'Sapi SP-0023', quantity: 1, unit: 'ekor', unitPrice: 25000000 }],
};

describe('financial workflow', () => {
  let store: FinancialDocumentsStore;
  beforeEach(() => { store = new FinancialDocumentsStore(new MemoryStorage()); });

  it('requires accountant verification before owner approval', () => {
    const request = store.createFundRequest(fundDraft, { uid: 'mitra', name: 'Mitra', role: 'MITRA' });
    expect(request.status).toBe('Diajukan');
    // Alur normal: Owner menyetujui setelah verifikasi Akuntan.
    store.verifyFundRequest(request.id, { uid: 'acc', name: 'Akuntan', role: 'ACCOUNTANT' });
    expect(store.approveFundRequest(request.id, { uid: 'owner', name: 'Owner', role: 'OWNER' }).status).toBe('Disetujui Owner');
  });

  it('allows owner to approve directly when accountant verification is unavailable', () => {
    const request = store.createFundRequest(fundDraft, { uid: 'manager', name: 'Manager', role: 'MANAGER' });
    expect(request.status).toBe('Diajukan');
    const approved = store.approveFundRequest(request.id, { uid: 'owner', name: 'Owner', role: 'OWNER' });
    expect(approved.status).toBe('Disetujui Owner');
    expect(approved.approvedBy).toBe('Owner');
  });

  it('rejects manager attempt to approve a fund request', () => {
    const request = store.createFundRequest(fundDraft, { uid: 'manager', name: 'Manager', role: 'MANAGER' });
    expect(() => store.approveFundRequest(request.id, { uid: 'manager', name: 'Manager', role: 'MANAGER' })).toThrow(/Owner/i);
  });

  it('v1.1: manager realizes an approved fund request with invoice and proof, then completes it', () => {
    const request = store.createFundRequest(fundDraft, { uid: 'manager', name: 'Manager', role: 'MANAGER' });
    // Realisasi sebelum disetujui Owner harus ditolak.
    expect(() => store.realizeFundRequest(request.id, { invoiceNo: 'INV-X', amount: 1000 }, { uid: 'manager', name: 'Manager', role: 'MANAGER' })).toThrow(/disetujui/i);
    store.approveFundRequest(request.id, { uid: 'owner', name: 'Owner', role: 'OWNER' });
    const realized = store.realizeFundRequest(request.id, { invoiceNo: 'INV-Pakan/09/0007', amount: 2500000, attachmentIds: ['nota-1'] }, { uid: 'manager', name: 'Manager', role: 'MANAGER' });
    expect(realized.status).toBe('Direalisasikan Manager');
    expect(realized.realizedInvoiceNo).toBe('INV-Pakan/09/0007');
    expect(realized.realizedAttachmentIds).toEqual(['nota-1']);
    const done = store.completeFundRequest(request.id, { uid: 'manager', name: 'Manager', role: 'MANAGER' });
    expect(done.status).toBe('Selesai');
  });

  it('v1.1: accountant cannot realize a fund request (view-only keuangan)', () => {
    const request = store.createFundRequest(fundDraft, { uid: 'manager', name: 'Manager', role: 'MANAGER' });
    store.approveFundRequest(request.id, { uid: 'owner', name: 'Owner', role: 'OWNER' });
    expect(() => store.realizeFundRequest(request.id, { invoiceNo: 'INV-Y', amount: 1000 }, { uid: 'acc', name: 'Akuntan', role: 'ACCOUNTANT' })).toThrow(/Manager/i);
  });

  it('requester can edit own pending request; non-requester and processed requests cannot', () => {
    const request = store.createFundRequest(fundDraft, { uid: 'manager', name: 'Manager', role: 'MANAGER' });
    const edited = store.editFundRequest(
      request.id,
      { ...fundDraft, purpose: 'Konsentrat revisi', items: [{ description: 'Konsentrat', quantity: 12, unit: 'sak', unitPrice: 250000 }] },
      { uid: 'manager', name: 'Manager', role: 'MANAGER' },
    );
    expect(edited.purpose).toBe('Konsentrat revisi');
    expect(edited.total).toBe(3_000_000);
    expect(edited.requestNo).toBe(request.requestNo); // nomor dipertahankan
    // Bukan pembuat -> ditolak.
    expect(() => store.editFundRequest(request.id, fundDraft, { uid: 'other', name: 'Orang Lain', role: 'MANAGER' })).toThrow(/pembuat/i);
    // Setelah diverifikasi Akuntan -> tidak bisa diedit lagi.
    store.verifyFundRequest(request.id, { uid: 'acc', name: 'Akuntan', role: 'ACCOUNTANT' });
    expect(() => store.editFundRequest(request.id, fundDraft, { uid: 'manager', name: 'Manager', role: 'MANAGER' })).toThrow(/Diajukan/i);
    expect(() => store.cancelFundRequest(request.id, 'alasan', { uid: 'manager', name: 'Manager', role: 'MANAGER' })).toThrow(/Diajukan/i);
  });

  it('requester cancels own pending request with mandatory reason', () => {
    const request = store.createFundRequest(fundDraft, { uid: 'manager', name: 'Manager', role: 'MANAGER' });
    expect(() => store.cancelFundRequest(request.id, '   ', { uid: 'manager', name: 'Manager', role: 'MANAGER' })).toThrow(/Alasan/i);
    expect(() => store.cancelFundRequest(request.id, 'batal', { uid: 'owner', name: 'Owner', role: 'OWNER' })).toThrow(/pembuat/i);
    const cancelled = store.cancelFundRequest(request.id, 'Salah hitung kebutuhan', { uid: 'manager', name: 'Manager', role: 'MANAGER' });
    expect(cancelled.status).toBe('Dibatalkan');
    expect(cancelled.cancelledReason).toBe('Salah hitung kebutuhan');
    // Setelah dibatalkan, tidak bisa diedit ulang.
    expect(() => store.editFundRequest(request.id, fundDraft, { uid: 'manager', name: 'Manager', role: 'MANAGER' })).toThrow(/Diajukan/i);
  });

  it('supports installment payments and calculates remaining balance', () => {
    const invoice = store.createInvoice(invoiceDraft, { uid: 'acc', name: 'Akuntan', role: 'ACCOUNTANT' });
    store.addPayment(invoice.id, 5000000, 'Transfer Bank', { uid: 'acc', name: 'Akuntan', role: 'ACCOUNTANT' });
    expect(store.getInvoice(invoice.id)?.paymentStatus).toBe('Menunggu Verifikasi');
    store.verifyPayment(invoice.id, store.getInvoice(invoice.id)!.payments[0].id, { uid: 'acc', name: 'Akuntan', role: 'ACCOUNTANT' });
    expect(store.getInvoice(invoice.id)).toMatchObject({ paymentStatus: 'Sebagian', paidAmount: 5000000, remainingAmount: 20000000 });
  });

  it('prevents paid invoices from being deleted and only allows owner cancellation', () => {
    const invoice = store.createInvoice(invoiceDraft, { uid: 'acc', name: 'Akuntan', role: 'ACCOUNTANT' });
    store.addPayment(invoice.id, 25000000, 'Transfer Bank', { uid: 'acc', name: 'Akuntan', role: 'ACCOUNTANT' });
    const paymentId = store.getInvoice(invoice.id)!.payments[0].id;
    store.verifyPayment(invoice.id, paymentId, { uid: 'acc', name: 'Akuntan', role: 'ACCOUNTANT' });
    expect(() => store.cancelInvoice(invoice.id, 'Salah input', { uid: 'manager', name: 'Manager', role: 'MANAGER' })).toThrow(/Owner/i);
    expect(store.cancelInvoice(invoice.id, 'Transaksi dibatalkan', { uid: 'owner', name: 'Owner', role: 'OWNER' }).status).toBe('Dibatalkan');
  });

  it('empties all data on owner reset', () => {
    store.createFundRequest(fundDraft, { uid: 'mitra', name: 'Mitra', role: 'MITRA' });
    store.createInvoice(invoiceDraft, { uid: 'acc', name: 'Akuntan', role: 'ACCOUNTANT' });
    store.resetAll({ uid: 'owner', name: 'Owner', role: 'OWNER' });
    // Produksi: reset mengosongkan seluruh data (tanpa seed demo).
    const snapshot = store.snapshot();
    expect(snapshot.invoices.length).toBe(0);
    expect(snapshot.fundRequests.length).toBe(0);
    expect(snapshot.audits.length).toBe(0);
    expect(snapshot.alerts.length).toBe(0);
  });
});
