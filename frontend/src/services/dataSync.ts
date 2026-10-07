/**
 * dataSync — sinkronisasi data terpusat localStorage -> Supabase Postgres.
 *
 * Model:
 *  - PULL (saat login/restore): tabel DB yang berisi data MENANG, menggantikan
 *    array lokal per-key. Tabel DB kosong -> data lokal dipertahankan di memori.
 *  - PUSH (event-driven): setiap `saveStorage(STORAGE_KEYS.X, ...)` memicu push
 *    debounced per-key. Push = diff vs snapshot terakhir: upsert row baru/berubah,
 *    delete row yang hilang (kecuali livestock: soft-delete via deleted_at).
 *
 * RLS database menegakkan peran (lihat supabase/schema.sql). Push memakai JWT
 * user yang sedang login, jadi insert/update/delete otomatis mengikuti policy.
 *
 * Key yang TIDAK disinkron: USERS, SETTINGS, CURRENT_USER (masih lokal).
 */

import { supabase, hasSupabase } from './supabase';
import { storeService, STORAGE_KEYS, syncState } from './storeService';
import type {
  LocationItem, PenItem, LivestockItem, WeightRecord, HealthRecord,
  BreedingRecord, BirthRecord, DeathRecord, TransferRecord, SalesRecord,
  FeedInventory, FinancialTransaction, DailyReport, NotificationItem, AuditLogItem,
} from '../types';
import { agroStore, type AgroState } from './agroStore';
import { financialDocumentsStore } from './financialDocuments';

// ---------------------------------------------------------------------------
// Definisi tabel: key localStorage -> tabel DB + kolom whitelist (snake_case).
// ---------------------------------------------------------------------------

type TableDef<T> = {
  table: string;
  columns: string[]; // kolom DB (snake_case) yang dikirim/diterima
  toRow: (item: T) => Record<string, unknown>;
  fromRow: (row: Record<string, unknown>) => T;
  // Filter opsional saat pull, mis. untuk memisahkan row legacy vs dokumen
  // JSONB yang berbagi tabel yang sama (approval_requests).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pullFilter?: (q: any) => any;
};

const DATE_NULL = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);

// Helper generik: kamelCase -> snake_case untuk objek datar.
function camelToSnake(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = k.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());
    out[key] = v === undefined ? null : v;
  }
  return out;
}

// Helper generik: snake_case -> camelCase.
function snakeToCamel<T>(row: Record<string, unknown>, map: Record<string, keyof T>): T {
  const out = {} as T;
  for (const [snake, camel] of Object.entries(map)) {
    const v = row[snake];
    (out[camel] as unknown) = v === null ? undefined : v;
  }
  return out;
}

// ---------------------------------------------------------------------------
// LOCATIONS
// ---------------------------------------------------------------------------
const LOCATIONS_DEF: TableDef<LocationItem> = {
  table: 'locations',
  columns: ['id', 'name', 'address', 'pic_name', 'pic_phone', 'livestock_types', 'pen_count', 'status', 'notes', 'created_at'],
  toRow: (x) => camelToSnake({
    id: x.id, name: x.name, address: x.address, picName: x.picName, picPhone: x.picPhone,
    livestockTypes: x.livestockTypes ?? [], penCount: x.penCount ?? 0, status: x.status,
    notes: x.notes, createdAt: x.createdAt,
  }),
  fromRow: (r) => ({
    id: String(r.id), name: String(r.name ?? ''), address: String(r.address ?? ''),
    picName: String(r.pic_name ?? ''), picPhone: String(r.pic_phone ?? ''),
    livestockTypes: Array.isArray(r.livestock_types) ? (r.livestock_types as string[]) : [],
    penCount: Number(r.pen_count ?? 0), status: (r.status === 'Nonaktif' ? 'Nonaktif' : 'Aktif'),
    notes: (r.notes as string) ?? undefined,
    createdAt: String(r.created_at ?? new Date().toISOString()),
  }),
};

// ---------------------------------------------------------------------------
// PENS
// ---------------------------------------------------------------------------
const PENS_DEF: TableDef<PenItem> = {
  table: 'pens',
  columns: ['id', 'location_id', 'name', 'capacity', 'current_count', 'notes'],
  toRow: (x) => ({ id: x.id, location_id: x.locationId, name: x.name, capacity: x.capacity, current_count: x.currentCount ?? null, notes: x.notes ?? null }),
  fromRow: (r) => ({
    id: String(r.id), locationId: String(r.location_id ?? ''), name: String(r.name ?? ''),
    capacity: Number(r.capacity ?? 0), currentCount: r.current_count == null ? undefined : Number(r.current_count),
    notes: (r.notes as string) ?? undefined,
  }),
};

// ---------------------------------------------------------------------------
// LIVESTOCK
// ---------------------------------------------------------------------------
const LIVESTOCK_DEF: TableDef<LivestockItem> = {
  table: 'livestock',
  columns: [
    'id', 'tag_id', 'qr_code', 'photo_url', 'type', 'breed', 'gender', 'dob',
    'estimated_age_months', 'color_traits', 'location_id', 'pen_id',
    'ownership_status', 'source', 'entry_date', 'acquisition_price', 'selling_price',
    'price_history', 'initial_weight_kg', 'current_weight_kg', 'health_status',
    'breeding_status', 'mother_id', 'mother_tag', 'father_id', 'father_tag',
    'condition_category', 'status', 'notes', 'location_name', 'location_history',
    'created_at',
    'updated_at', 'deleted_at', 'deleted_by',
  ],
  toRow: (x) => camelToSnake({
    id: x.id, tagId: x.tagId, qrCode: x.qrCode, photoUrl: x.photoUrl, type: x.type,
    breed: x.breed, gender: x.gender, dob: DATE_NULL(x.dob), estimatedAgeMonths: x.estimatedAgeMonths,
    colorTraits: x.colorTraits, locationId: x.locationId, penId: x.penId,
    ownershipStatus: x.ownershipStatus, source: x.source, entryDate: DATE_NULL(x.entryDate),
    acquisitionPrice: x.acquisitionPrice ?? 0, sellingPrice: x.sellingPrice ?? null,
    priceHistory: x.priceHistory ?? [], initialWeightKg: x.initialWeightKg ?? 0,
    currentWeightKg: x.currentWeightKg ?? 0, healthStatus: x.healthStatus,
    breedingStatus: x.breedingStatus, motherId: x.motherId ?? null, motherTag: x.motherTag ?? null,
    fatherId: x.fatherId ?? null, fatherTag: x.fatherTag ?? null,
    conditionCategory: x.conditionCategory, status: x.status, notes: x.notes ?? null,
    locationName: x.locationName ?? null,
    locationHistory: x.locationHistory ?? [], createdAt: x.createdAt, updatedAt: x.updatedAt,
    deletedAt: x.deletedAt ?? null, deletedBy: x.deletedBy ?? null,
  }),
  fromRow: (r) => ({
    id: String(r.id), tagId: String(r.tag_id ?? ''), qrCode: String(r.qr_code ?? ''),
    photoUrl: (r.photo_url as string) ?? undefined, type: r.type as LivestockItem['type'],
    breed: String(r.breed ?? ''), gender: r.gender as LivestockItem['gender'],
    dob: (r.dob as string) ?? '', estimatedAgeMonths: Number(r.estimated_age_months ?? 0),
    colorTraits: String(r.color_traits ?? ''), locationId: String(r.location_id ?? ''),
    locationName: (r.location_name as string) ?? undefined,
    penId: (r.pen_id as string) ?? undefined,
    ownershipStatus: r.ownership_status as LivestockItem['ownershipStatus'],
    source: r.source as LivestockItem['source'],
    entryDate: (r.entry_date as string) ?? '',
    acquisitionPrice: Number(r.acquisition_price ?? 0),
    sellingPrice: r.selling_price == null ? undefined : Number(r.selling_price),
    priceHistory: Array.isArray(r.price_history) ? (r.price_history as LivestockItem['priceHistory']) : [],
    initialWeightKg: Number(r.initial_weight_kg ?? 0),
    currentWeightKg: Number(r.current_weight_kg ?? 0),
    healthStatus: r.health_status as LivestockItem['healthStatus'],
    breedingStatus: r.breeding_status as LivestockItem['breedingStatus'],
    motherId: (r.mother_id as string) ?? undefined, motherTag: (r.mother_tag as string) ?? undefined,
    fatherId: (r.father_id as string) ?? undefined, fatherTag: (r.father_tag as string) ?? undefined,
    conditionCategory: r.condition_category as LivestockItem['conditionCategory'],
    status: r.status as LivestockItem['status'],
    notes: (r.notes as string) ?? undefined,
    locationHistory: Array.isArray(r.location_history) ? (r.location_history as LivestockItem['locationHistory']) : [],
    createdAt: String(r.created_at ?? ''), updatedAt: String(r.updated_at ?? ''),
    deletedAt: (r.deleted_at as string) ?? undefined, deletedBy: (r.deleted_by as string) ?? undefined,
  }),
};

// ---------------------------------------------------------------------------
// WEIGHT / HEALTH / BREEDING / BIRTH / DEATH / TRANSFER
// ---------------------------------------------------------------------------
const WEIGHT_DEF: TableDef<WeightRecord> = {
  table: 'weight_records',
  columns: ['id', 'livestock_id', 'tag_id', 'weigh_date', 'weight_kg', 'previous_weight_kg', 'gain_kg', 'officer_name', 'photo_url', 'notes', 'created_at'],
  toRow: (x) => camelToSnake({ ...x }),
  fromRow: (r) => snakeToCamel<WeightRecord>(r, {
    id: 'id', livestockId: 'livestockId', tagId: 'tagId', weighDate: 'weighDate',
    weightKg: 'weightKg', previousWeightKg: 'previousWeightKg', gainKg: 'gainKg',
    officerName: 'officerName', photoUrl: 'photoUrl', notes: 'notes', createdAt: 'createdAt',
  }),
};

const HEALTH_DEF: TableDef<HealthRecord> = {
  table: 'health_records',
  columns: ['id', 'livestock_id', 'tag_id', 'record_date', 'condition', 'symptoms', 'action_taken', 'medicine_name', 'dosage', 'officer_name', 'vet_name', 'follow_up_date', 'photo_url', 'status', 'notes', 'created_at'],
  toRow: (x) => camelToSnake({ ...x }),
  fromRow: (r) => snakeToCamel<HealthRecord>(r, {
    id: 'id', livestockId: 'livestockId', tagId: 'tagId', recordDate: 'recordDate',
    condition: 'condition', symptoms: 'symptoms', actionTaken: 'actionTaken',
    medicineName: 'medicineName', dosage: 'dosage', officerName: 'officerName',
    vetName: 'vetName', followUpDate: 'followUpDate', photoUrl: 'photoUrl',
    status: 'status', notes: 'notes', createdAt: 'createdAt',
  }),
};

const BREEDING_DEF: TableDef<BreedingRecord> = {
  table: 'breeding_records',
  columns: ['id', 'mother_id', 'mother_tag', 'father_id', 'father_tag', 'mating_date', 'method', 'preg_check_date', 'preg_check_result', 'preg_status', 'est_birth_date', 'actual_birth_date', 'offspring_count', 'notes', 'created_at'],
  toRow: (x) => camelToSnake({ ...x }),
  fromRow: (r) => snakeToCamel<BreedingRecord>(r, {
    id: 'id', motherId: 'motherId', motherTag: 'motherTag', fatherId: 'fatherId',
    fatherTag: 'fatherTag', matingDate: 'matingDate', method: 'method',
    pregCheckDate: 'pregCheckDate', pregCheckResult: 'pregCheckResult', pregStatus: 'pregStatus',
    estBirthDate: 'estBirthDate', actualBirthDate: 'actualBirthDate',
    offspringCount: 'offspringCount', notes: 'notes', createdAt: 'createdAt',
  }),
};

const BIRTHS_DEF: TableDef<BirthRecord> = {
  table: 'birth_records',
  columns: ['id', 'mother_id', 'mother_tag', 'offspring_id', 'offspring_tag', 'location_id', 'birth_date', 'gender', 'birth_weight_kg', 'condition', 'photo_url', 'voided_at', 'voided_by', 'void_reason', 'created_at'],
  toRow: (x) => camelToSnake({ ...x }),
  fromRow: (r) => snakeToCamel<BirthRecord>(r, {
    id: 'id', motherId: 'motherId', motherTag: 'motherTag', offspringId: 'offspringId',
    offspringTag: 'offspringTag', locationId: 'locationId', birthDate: 'birthDate',
    gender: 'gender', birthWeightKg: 'birthWeightKg', condition: 'condition',
    photoUrl: 'photoUrl', voidedAt: 'voidedAt', voidedBy: 'voidedBy', voidReason: 'voidReason',
    createdAt: 'createdAt',
  }),
};

const DEATHS_DEF: TableDef<DeathRecord> = {
  table: 'death_records',
  columns: ['id', 'livestock_id', 'tag_id', 'death_date', 'death_time', 'location_id', 'location_name', 'suspected_cause', 'symptoms_before', 'handling_note', 'chronology', 'last_condition', 'officer_name', 'vet_name', 'photo_url', 'doc_url', 'confirmed_by', 'previous_livestock_state', 'voided_at', 'voided_by', 'void_reason', 'created_at'],
  toRow: (x) => camelToSnake({ ...x }),
  fromRow: (r) => snakeToCamel<DeathRecord>(r, {
    id: 'id', livestockId: 'livestockId', tagId: 'tagId', deathDate: 'deathDate',
    deathTime: 'deathTime', locationId: 'locationId', locationName: 'locationName', suspectedCause: 'suspectedCause',
    symptomsBefore: 'symptomsBefore', handlingNote: 'handlingNote', chronology: 'chronology',
    lastCondition: 'lastCondition', officerName: 'officerName', vetName: 'vetName',
    photoUrl: 'photoUrl', docUrl: 'docUrl', confirmedBy: 'confirmedBy',
    previousLivestockState: 'previousLivestockState', voidedAt: 'voidedAt', voidedBy: 'voidedBy',
    voidReason: 'voidReason', createdAt: 'createdAt',
  }),
};

const TRANSFERS_DEF: TableDef<TransferRecord> = {
  table: 'transfer_records',
  columns: ['id', 'livestock_id', 'tag_id', 'origin_location_id', 'dest_location_id', 'origin_location_name', 'dest_location_name', 'transfer_date', 'reason', 'officer_name', 'transport', 'notes', 'created_at'],
  toRow: (x) => camelToSnake({ ...x }),
  fromRow: (r) => snakeToCamel<TransferRecord>(r, {
    id: 'id', livestockId: 'livestockId', tagId: 'tagId', originLocationId: 'originLocationId',
    originLocationName: 'originLocationName', destLocationId: 'destLocationId',
    destLocationName: 'destLocationName', transferDate: 'transferDate', reason: 'reason',
    officerName: 'officerName', transport: 'transport', notes: 'notes', createdAt: 'createdAt',
  }),
};

// ---------------------------------------------------------------------------
// SALES / FEED / FINANCE
// ---------------------------------------------------------------------------
const SALES_DEF: TableDef<SalesRecord> = {
  table: 'sales_records',
  columns: ['id', 'invoice_no', 'date', 'buyer_name', 'buyer_phone', 'livestock_ids', 'weight_total_kg', 'price_total', 'acquisition_cost_total', 'payment_method', 'payment_status', 'location_id', 'location_name', 'proof_url', 'doc_url', 'sales_rep', 'transaction_status', 'linked_finance_transaction_ids', 'pre_sale_livestock_snapshots', 'voided_at', 'voided_by', 'void_reason', 'notes', 'created_by', 'created_at'],
  toRow: (x) => camelToSnake({ ...x }),
  fromRow: (r) => snakeToCamel<SalesRecord>(r, {
    id: 'id', invoiceNo: 'invoiceNo', date: 'date', buyerName: 'buyerName',
    buyerPhone: 'buyerPhone', livestockIds: 'livestockIds', weightTotalKg: 'weightTotalKg',
    priceTotal: 'priceTotal', acquisitionCostTotal: 'acquisitionCostTotal',
    paymentMethod: 'paymentMethod', paymentStatus: 'paymentStatus', locationId: 'locationId',
    locationName: 'locationName',
    proofUrl: 'proofUrl', docUrl: 'docUrl', salesRep: 'salesRep',
    transactionStatus: 'transactionStatus', linkedFinanceTransactionIds: 'linkedFinanceTransactionIds',
    preSaleLivestockSnapshots: 'preSaleLivestockSnapshots', voidedAt: 'voidedAt',
    voidedBy: 'voidedBy', voidReason: 'voidReason', notes: 'notes', createdBy: 'createdBy',
    createdAt: 'createdAt',
  }),
};

const FEED_DEF: TableDef<FeedInventory> = {
  table: 'feed_inventory',
  columns: ['id', 'location_id', 'location_name', 'feed_type', 'stock_qty', 'stock_in', 'stock_out', 'unit', 'min_stock', 'unit_price', 'supplier', 'archived_at', 'archived_by', 'updated_at'],
  toRow: (x) => camelToSnake({ ...x }),
  fromRow: (r) => snakeToCamel<FeedInventory>(r, {
    id: 'id', locationId: 'locationId', locationName: 'locationName', feedType: 'feedType', stockQty: 'stockQty',
    stockIn: 'stockIn', stockOut: 'stockOut', unit: 'unit', minStock: 'minStock',
    unitPrice: 'unitPrice', supplier: 'supplier', archivedAt: 'archivedAt',
    archivedBy: 'archivedBy', updatedAt: 'updatedAt',
  }),
};

const FINANCE_DEF: TableDef<FinancialTransaction> = {
  table: 'financial_transactions',
  columns: ['id', 'invoice_no', 'date', 'type', 'category', 'description', 'location_id', 'location_name', 'amount', 'payment_method', 'payee_payer', 'proof_url', 'created_by', 'notes', 'created_at'],
  toRow: (x) => camelToSnake({ ...x }),
  fromRow: (r) => snakeToCamel<FinancialTransaction>(r, {
    id: 'id', invoiceNo: 'invoiceNo', date: 'date', type: 'type', category: 'category',
    description: 'description', locationId: 'locationId', locationName: 'locationName', amount: 'amount',
    paymentMethod: 'paymentMethod', payeePayer: 'payeePayer', proofUrl: 'proofUrl',
    createdBy: 'createdBy', notes: 'notes', createdAt: 'createdAt',
  }),
};

// ---------------------------------------------------------------------------
// DAILY REPORTS / NOTIFICATIONS / AUDIT
// ---------------------------------------------------------------------------
const REPORTS_DEF: TableDef<DailyReport> = {
  table: 'daily_reports',
  columns: ['id', 'date', 'location_id', 'location_name', 'pop_initial', 'pop_purchase', 'pop_birth', 'pop_transfer_in', 'pop_sales', 'pop_death', 'pop_transfer_out', 'pop_final', 'healthy_count', 'sick_count', 'isolation_count', 'in_treatment_count', 'activities_text', 'expenses_list', 'photos', 'officer_notes', 'report_status', 'created_by', 'submitted_at', 'reviewed_by', 'reviewed_at', 'archived_at', 'archived_by', 'created_at'],
  toRow: (x) => camelToSnake({ ...x }),
  fromRow: (r) => snakeToCamel<DailyReport>(r, {
    id: 'id', date: 'date', locationId: 'locationId', locationName: 'locationName', popInitial: 'popInitial',
    popPurchase: 'popPurchase', popBirth: 'popBirth', popTransferIn: 'popTransferIn',
    popSales: 'popSales', popDeath: 'popDeath', popTransferOut: 'popTransferOut',
    popFinal: 'popFinal', healthyCount: 'healthyCount', sickCount: 'sickCount',
    isolationCount: 'isolationCount', inTreatmentCount: 'inTreatmentCount',
    activitiesText: 'activitiesText', expensesList: 'expensesList', photos: 'photos',
    officerNotes: 'officerNotes', reportStatus: 'reportStatus', createdBy: 'createdBy',
    submittedAt: 'submittedAt', reviewedBy: 'reviewedBy', reviewedAt: 'reviewedAt',
    archivedAt: 'archivedAt', archivedBy: 'archivedBy', createdAt: 'createdAt',
  }),
};

const NOTIFICATIONS_DEF: TableDef<NotificationItem> = {
  table: 'notifications',
  columns: ['id', 'title', 'message', 'severity', 'category', 'location_id', 'is_read', 'created_at'],
  toRow: (x) => camelToSnake({ ...x }),
  fromRow: (r) => snakeToCamel<NotificationItem>(r, {
    id: 'id', title: 'title', message: 'message', severity: 'severity',
    category: 'category', locationId: 'locationId', isRead: 'isRead', createdAt: 'createdAt',
  }),
};

const AUDIT_DEF: TableDef<AuditLogItem> = {
  table: 'audit_logs',
  columns: ['id', 'user_id', 'user_name', 'user_role', 'module', 'action', 'target_id', 'target_name', 'before_value', 'after_value', 'created_at'],
  toRow: (x) => camelToSnake({ ...x, timestamp: undefined }),
  fromRow: (r) => {
    const base = snakeToCamel<AuditLogItem>(r, {
      id: 'id', userId: 'userId', userName: 'userName', userRole: 'userRole',
      module: 'module', action: 'action', targetId: 'targetId', targetName: 'targetName',
      beforeValue: 'beforeValue', afterValue: 'afterValue',
    });
    return { ...base, timestamp: String(r.created_at ?? new Date().toISOString()) };
  },
};

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

type StoreKeyGetter = () => Record<string, unknown[]>;

interface SyncMapping {
  key: string;
  def: TableDef<never>;
  get: () => unknown[];
  set: (items: unknown[]) => void;
  /** Pull hanya mengganti lokal jika DB berisi data. */
}

const MAPPINGS: SyncMapping[] = [
  { key: STORAGE_KEYS.LOCATIONS, def: LOCATIONS_DEF as unknown as TableDef<never>, get: () => storeService.locations, set: (v) => { storeService.locations = v as never; } },
  { key: STORAGE_KEYS.PENS, def: PENS_DEF as unknown as TableDef<never>, get: () => storeService.pens, set: (v) => { storeService.pens = v as never; } },
  { key: STORAGE_KEYS.LIVESTOCK, def: LIVESTOCK_DEF as unknown as TableDef<never>, get: () => storeService.livestock, set: (v) => { storeService.livestock = v as never; } },
  { key: STORAGE_KEYS.WEIGHT, def: WEIGHT_DEF as unknown as TableDef<never>, get: () => storeService.weightRecords, set: (v) => { storeService.weightRecords = v as never; } },
  { key: STORAGE_KEYS.HEALTH, def: HEALTH_DEF as unknown as TableDef<never>, get: () => storeService.healthRecords, set: (v) => { storeService.healthRecords = v as never; } },
  { key: STORAGE_KEYS.BREEDING, def: BREEDING_DEF as unknown as TableDef<never>, get: () => storeService.breedingRecords, set: (v) => { storeService.breedingRecords = v as never; } },
  { key: STORAGE_KEYS.BIRTHS, def: BIRTHS_DEF as unknown as TableDef<never>, get: () => storeService.birthRecords, set: (v) => { storeService.birthRecords = v as never; } },
  { key: STORAGE_KEYS.DEATHS, def: DEATHS_DEF as unknown as TableDef<never>, get: () => storeService.deathRecords, set: (v) => { storeService.deathRecords = v as never; } },
  { key: STORAGE_KEYS.TRANSFERS, def: TRANSFERS_DEF as unknown as TableDef<never>, get: () => storeService.transferRecords, set: (v) => { storeService.transferRecords = v as never; } },
  { key: STORAGE_KEYS.SALES, def: SALES_DEF as unknown as TableDef<never>, get: () => storeService.salesRecords, set: (v) => { storeService.salesRecords = v as never; } },
  { key: STORAGE_KEYS.FEED, def: FEED_DEF as unknown as TableDef<never>, get: () => storeService.feedInventory, set: (v) => { storeService.feedInventory = v as never; } },
  { key: STORAGE_KEYS.FINANCE, def: FINANCE_DEF as unknown as TableDef<never>, get: () => storeService.financialTransactions, set: (v) => { storeService.financialTransactions = v as never; } },
  { key: STORAGE_KEYS.DAILY_REPORTS, def: REPORTS_DEF as unknown as TableDef<never>, get: () => storeService.dailyReports, set: (v) => { storeService.dailyReports = v as never; } },
  { key: STORAGE_KEYS.NOTIFICATIONS, def: NOTIFICATIONS_DEF as unknown as TableDef<never>, get: () => storeService.notifications, set: (v) => { storeService.notifications = v as never; } },
  { key: STORAGE_KEYS.AUDIT_LOGS, def: AUDIT_DEF as unknown as TableDef<never>, get: () => storeService.auditLogs, set: (v) => { storeService.auditLogs = v as never; } },
];

// ---------------------------------------------------------------------------
// MAPPING STORE KEDUA: agroStore (divisi kebun/perikanan/satwa/inventory/HR/
// finance-control). Pola berbeda dari storeService: satu object AgroState
// dengan 20 koleksi; sync per-koleksi ke tabel DB masing-masing.
// fromRow dipakai generik camelToSnake/snakeToCamel per-koleksi.
// ---------------------------------------------------------------------------

type AgroCollection = keyof AgroState;

function agroMapping<K extends AgroCollection>(
  table: string,
  collection: K,
  camelMap: Record<string, keyof AgroState[K][number]>,
  pullFilter?: TableDef<never>['pullFilter'],
): SyncMapping {
  // Peta snake_case kolom DB -> properti camelCase objek aplikasi.
  const rowMap: Record<string, keyof AgroState[K][number]> = {};
  for (const [camel, prop] of Object.entries(camelMap)) {
    rowMap[camel.replace(/[A-Z]/g, (m) => '_' + m.toLowerCase())] = prop;
  }
  const def: TableDef<never> = {
    table,
    columns: Object.keys(camelMap).map((c) => c.replace(/[A-Z]/g, (m) => '_' + m.toLowerCase())),
    toRow: (item: never) => camelToSnake(item as unknown as Record<string, unknown>),
    fromRow: (row: Record<string, unknown>) => snakeToCamel(row, rowMap) as never,
    pullFilter,
  };
  return {
    key: `agro:${table}`,
    def,
    get: () => agroStore.snapshot()[collection] as unknown[],
    set: (v) => agroStore.replaceCollection(collection, v as never),
  };
}

// Financial documents (pengajuan dana & invoice + audit/alerts) disimpan
// sebagai DOKUMEN JSONB: 1 row per dokumen, isi lengkap di kolom `payload`.
// Kolom meta tabel (type/title/invoice_no/date) tetap diisi dari dokumen agar
// constraint NOT NULL/CHECK terpenuhi dan row mudah dibedakan saat query SQL.
function finDocMapping(table: 'approval_requests' | 'invoices', key: string, list: () => unknown[], setter: (v: unknown[]) => void): SyncMapping {
  // columns HARUS mencakup semua kolom meta yang diisi toRow — pushKey hanya
  // mengirim kolom yang terdaftar di sini.
  const columns = table === 'approval_requests'
    ? ['id', 'payload', 'type', 'title', 'reference_no', 'requester', 'requested_at', 'status']
    : ['id', 'payload', 'invoice_no', 'doc_type', 'date', 'party_name', 'status', 'description'];
  const def: TableDef<never> = {
    table,
    columns,
    toRow: (item: never) => {
      const obj = item as unknown as Record<string, unknown>;
      const row: Record<string, unknown> = { id: String(obj.id), payload: obj };
      if (table === 'approval_requests') {
        // FundRequest: type check-in ('Pengajuan Dana'), title dari purpose/notes.
        row.type = 'Pengajuan Dana';
        row.title = String(obj.purpose ?? obj.notes ?? 'Pengajuan Dana');
        row.reference_no = obj.requestNo ?? null;
        row.requester = obj.requesterName ?? null;
        row.requested_at = obj.createdAt ?? null;
        row.status = mapFindocStatus(String(obj.status ?? 'Draft'));
      } else {
        // Invoice finance-control: invoice_no/date NOT NULL di tabel.
        row.invoice_no = String(obj.invoiceNo ?? obj.id);
        row.doc_type = 'Invoice';
        row.date = String(obj.issueDate ?? '').slice(0, 10) || null;
        row.party_name = obj.partyName ?? null;
        row.status = mapInvoiceStatus(String(obj.paymentStatus ?? 'Belum Dibayar'));
        row.description = obj.notes ?? null;
      }
      return row;
    },
    fromRow: (row: Record<string, unknown>) => (row.payload ?? {}) as never,
    pullFilter: (q) => q.not('payload', 'is', null),
  };
  return { key, def, get: list, set: setter };
}

// Map status aplikasi -> status DB (check constraint longgar di sisi DB).
function mapFindocStatus(s: string): string {
  if (s === 'Disetujui Owner' || s === 'Dicairkan' || s === 'Selesai') return 'Disetujui';
  if (s === 'Ditolak' || s === 'Dibatalkan' || s === 'Perlu Revisi') return 'Ditolak';
  return 'Menunggu';
}
function mapInvoiceStatus(s: string): string {
  if (s === 'Lunas') return 'Lunas';
  if (s === 'Sebagian') return 'Sebagian';
  if (s === 'Ditolak') return 'Ditolak';
  return 'Belum Bayar';
}

const AGRO_MAPPINGS: SyncMapping[] = [
  agroMapping('crop_records', 'crops', { id: 'id', name: 'name', division: 'division', variety: 'variety', locationId: 'locationId', locationName: 'locationName', plotAreaM2: 'plotAreaM2', plantedDate: 'plantedDate', estimatedHarvestDate: 'estimatedHarvestDate', status: 'status', notes: 'notes', createdAt: 'createdAt', updatedAt: 'updatedAt' }),
  agroMapping('crop_activities', 'cropActivities', { id: 'id', cropId: 'cropId', cropName: 'cropName', activityType: 'activityType', date: 'date', officerName: 'officerName', materialUsed: 'materialUsed', quantity: 'quantity', unit: 'unit', notes: 'notes', createdAt: 'createdAt' }),
  agroMapping('garden_documents', 'gardenDocuments', { id: 'id', docType: 'docType', title: 'title', date: 'date', partyName: 'partyName', fileName: 'fileName', notes: 'notes', createdAt: 'createdAt' }),
  agroMapping('ponds', 'ponds', { id: 'id', name: 'name', locationId: 'locationId', locationName: 'locationName', type: 'type', species: 'species', areaM2: 'areaM2', volumeM3: 'volumeM3', stockingDate: 'stockingDate', stockingCount: 'stockingCount', estimatedHarvestDate: 'estimatedHarvestDate', status: 'status', notes: 'notes', createdAt: 'createdAt', updatedAt: 'updatedAt' }),
  agroMapping('water_quality_records', 'waterQuality', { id: 'id', pondId: 'pondId', pondName: 'pondName', date: 'date', ph: 'ph', dissolvedOxygen: 'dissolvedOxygen', temperature: 'temperature', ammonia: 'ammonia', nitrite: 'nitrite', officerName: 'officerName', notes: 'notes', createdAt: 'createdAt' }),
  agroMapping('fish_feed_logs', 'fishFeeds', { id: 'id', pondId: 'pondId', pondName: 'pondName', date: 'date', feedType: 'feedType', feedAmountKg: 'feedAmountKg', biomassKg: 'biomassKg', fcr: 'fcr', officerName: 'officerName', notes: 'notes', createdAt: 'createdAt' }),
  agroMapping('fish_harvest_records', 'fishHarvests', { id: 'id', pondId: 'pondId', pondName: 'pondName', harvestDate: 'harvestDate', totalWeightKg: 'totalWeightKg', totalFishCount: 'totalFishCount', averageWeightKg: 'averageWeightKg', buyerName: 'buyerName', pricePerKg: 'pricePerKg', totalRevenue: 'totalRevenue', notes: 'notes', createdAt: 'createdAt' }),
  agroMapping('wildlife_records', 'wildlife', { id: 'id', name: 'name', category: 'category', species: 'species', count: 'count', locationId: 'locationId', locationName: 'locationName', acquisitionDate: 'acquisitionDate', healthStatus: 'healthStatus', notes: 'notes', createdAt: 'createdAt' }),
  agroMapping('wildlife_feed_schedules', 'wildlifeFeeds', { id: 'id', wildlifeId: 'wildlifeId', wildlifeName: 'wildlifeName', scheduleTime: 'scheduleTime', feedType: 'feedType', feedAmount: 'feedAmount', status: 'status', lastFedAt: 'lastFedAt', officerName: 'officerName', notes: 'notes', createdAt: 'createdAt' }),
  agroMapping('inventory_items', 'inventory', { id: 'id', sku: 'sku', name: 'name', category: 'category', unit: 'unit', stockQty: 'stockQty', minStock: 'minStock', unitPrice: 'unitPrice', locationId: 'locationId', locationName: 'locationName', supplier: 'supplier', updatedAt: 'updatedAt' }),
  agroMapping('stock_mutations', 'stockMutations', { id: 'id', itemId: 'itemId', itemName: 'itemName', type: 'type', quantity: 'quantity', date: 'date', reason: 'reason', officerName: 'officerName', notes: 'notes', createdAt: 'createdAt' }),
  agroMapping('purchase_requests', 'purchaseRequests', { id: 'id', requestNo: 'requestNo', itemName: 'itemName', category: 'category', quantity: 'quantity', unit: 'unit', reason: 'reason', requestedBy: 'requestedBy', requestDate: 'requestDate', status: 'status', approvedBy: 'approvedBy', approvedAt: 'approvedAt', notes: 'notes', createdAt: 'createdAt' }),
  agroMapping('purchase_orders', 'purchaseOrders', { id: 'id', poNo: 'poNo', supplierName: 'supplierName', itemName: 'itemName', quantity: 'quantity', unit: 'unit', unitPrice: 'unitPrice', totalAmount: 'totalAmount', orderDate: 'orderDate', expectedDeliveryDate: 'expectedDeliveryDate', status: 'status', notes: 'notes', createdAt: 'createdAt' }),
  agroMapping('tasks', 'tasks', { id: 'id', title: 'title', description: 'description', assignee: 'assignee', assigneeRole: 'assigneeRole', dueDate: 'dueDate', priority: 'priority', status: 'status', relatedModule: 'relatedModule', createdAt: 'createdAt' }),
  agroMapping('attendance_records', 'attendance', { id: 'id', workerName: 'workerName', division: 'division', date: 'date', checkInTime: 'checkInTime', checkOutTime: 'checkOutTime', status: 'status', notes: 'notes', createdAt: 'createdAt' }),
  agroMapping('kpi_scores', 'kpis', { id: 'id', workerName: 'workerName', division: 'division', period: 'period', attendanceScore: 'attendanceScore', productivityScore: 'productivityScore', disciplineScore: 'disciplineScore', totalScore: 'totalScore', notes: 'notes', createdAt: 'createdAt' }),
  agroMapping('cash_transactions', 'cashTransactions', { id: 'id', referenceNo: 'referenceNo', date: 'date', type: 'type', category: 'category', description: 'description', amount: 'amount', sourceDivision: 'sourceDivision', paymentMethod: 'paymentMethod', officerName: 'officerName', notes: 'notes', createdAt: 'createdAt' }),
  agroMapping('lpj_reports', 'lpjReports', { id: 'id', referenceNo: 'referenceNo', fundRequestId: 'fundRequestId', title: 'title', division: 'division', periodStart: 'periodStart', periodEnd: 'periodEnd', totalAllocated: 'totalAllocated', totalSpent: 'totalSpent', remaining: 'remaining', status: 'status', items: 'items', submittedBy: 'submittedBy', createdAt: 'createdAt' }),
  // approval_requests juga dipakai findoc:fundRequests (payload JSONB).
  // Legacy approvals = row TANPA payload -> filter saat pull agar tidak saling
  // menimpa dengan dokumen JSONB.
  agroMapping('approval_requests', 'approvals', { id: 'id', referenceNo: 'referenceNo', type: 'type', title: 'title', requester: 'requester', requestedAt: 'requestedAt', status: 'status', approvedBy: 'approvedBy', approvedAt: 'approvedAt', notes: 'notes' }, (q) => q.is('payload', null)),
  agroMapping('master_data', 'masterData', { id: 'id', category: 'category', name: 'name', value: 'value', isActive: 'isActive', createdAt: 'createdAt' }),
  // Finance-control workflow (fund requests & invoices) sebagai JSONB docs
  finDocMapping('approval_requests', 'findoc:fundRequests', () => financialDocumentsStore.snapshot().fundRequests, (v) => financialDocumentsStore.replaceCollection('fundRequests', v as never)),
  finDocMapping('invoices', 'findoc:invoices', () => financialDocumentsStore.snapshot().invoices, (v) => financialDocumentsStore.replaceCollection('invoices', v as never)),
];

const ALL_MAPPINGS: SyncMapping[] = [...MAPPINGS, ...AGRO_MAPPINGS];

const PUSH_DEBOUNCE_MS = 400;

/** Snapshot terakhir yang diketahui tersinkron, per storage key. */
const lastSynced = new Map<string, string>(); // key -> JSON array tersinkron

function serialize<T>(items: T[], def: TableDef<T>): string {
  return JSON.stringify(items.map((x) => def.toRow(x)));
}

class DataSync {
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private pendingWhilePulling = new Set<string>();
  private pulling = false;
  public enabled = false;

  /** Aktifkan sync setelah login Supabase sukses. */
  async enable(): Promise<void> {
    if (!hasSupabase() || this.enabled) return;
    this.enabled = true;
    await this.pullAll();
    this.subscribeRealtime();
  }

  disable(): void {
    this.enabled = false;
    lastSynced.clear();
  }

  /** PULL: tabel DB berisi data -> menang; tabel kosong -> biarkan lokal. */
  async pullAll(): Promise<void> {
    const client = supabase();
    if (!client || this.pulling) return;
    this.pulling = true;
    syncState.paused = true; // set/filter saat pull tidak boleh memicu push
    try {
      let changed = false;
      for (const m of ALL_MAPPINGS) {
        try {
          // FLUSH-FIRST: bila ada perubahan lokal yang belum ter-push untuk
          // tabel ini, dorong dulu ke DB SEBELUM pull. Tanpa ini, pull bisa
          // menimpa input pengguna yang masih hidup hanya di lokal (gejala:
          // "pengajuan baru hilang begitu saja dari daftar").
          const syncedJson = lastSynced.get(m.key);
          if (syncedJson !== undefined) {
            const localJson = serialize(m.get() as never[], m.def as TableDef<never>);
            if (localJson !== syncedJson) {
              await this.pushKey(m);
              const localAfter = serialize(m.get() as never[], m.def as TableDef<never>);
              if (localAfter !== lastSynced.get(m.key)) {
                // Flush gagal (jaringan/RLS): JANGAN timpa lokal dgn data DB —
                // biarkan perubahan pengguna tetap hidup utk retry berikutnya.
                console.warn(`[dataSync] pull ${m.def.table} ditunda: ada perubahan lokal belum ter-push`);
                continue;
              }
            }
          }
          let query = client.from(m.def.table).select('*');
          if (m.def.pullFilter) query = m.def.pullFilter(query);
          const { data, error } = await query;
          if (error) { console.warn(`[dataSync] pull ${m.def.table}:`, error.message); continue; }
          if (!data || data.length === 0) {
            // DB kosong = sumber kebenaran produksi. Selalu kosongkan lokal
            // apa pun adanya: data lama perangkat tidak boleh bangkit kembali
            // (perilaku lama "pertahankan lokal" membuat dummy muncul lagi
            // setelah refresh dan bisa ter-push balik ke DB saat mutasi).
            m.set([] as never[]);
            lastSynced.set(m.key, '[]');
            changed = true;
            continue;
          }
          const rows = data as Record<string, unknown>[];
          const items = rows.map((r) => (m.def as TableDef<never>).fromRow(r));
          m.set(items as never[]);
          lastSynced.set(m.key, JSON.stringify(rows));
          changed = true;
        } catch (e) {
          console.warn(`[dataSync] pull ${m.def.table} exception:`, e);
        }
      }
      if (changed) storeService.notifyListeners();
    } finally {
      syncState.paused = false;
      this.pulling = false;
      // Push ulang koleksi yang berubah LOKAL saat pull sedang berjalan.
      // Tanpa ini, perubahan yang dibuat pengguna selama/di ambang pull
      // (atau push yang belum selesai) tertimpa hasil pull -> data
      // "hilang" di daftar tanpa pernah sampai ke DB.
      if (this.pendingWhilePulling.size > 0) {
        const keys = [...this.pendingWhilePulling];
        this.pendingWhilePulling.clear();
        for (const key of keys) this.onCollectionChanged(key);
      }
    }
  }

  /** Dipanggil dari saveStorage (storeService) / agroStore / financialDocuments. */
  onCollectionChanged(key: string): void {
    if (!this.enabled || !supabase() || syncState.paused) {
      // Jangan buang notifikasi saat pull berjalan: catat agar di-push
      // ulang setelah pull selesai (lihat finally di pullAll).
      if (this.enabled && syncState.paused && this.pulling) {
        this.pendingWhilePulling.add(key);
      }
      return;
    }
    const m = ALL_MAPPINGS.find((x) => x.key === key);
    if (!m) return;
    const existing = this.timers.get(key);
    if (existing) clearTimeout(existing);
    this.timers.set(key, setTimeout(() => {
      this.timers.delete(key);
      void this.pushKey(m);
    }, PUSH_DEBOUNCE_MS));
  }

  private async pushKey(m: SyncMapping): Promise<void> {
    const client = supabase();
    if (!client) return;
    const def = m.def as TableDef<never>;
    const items = m.get();
    const currentRows = items.map((x) => def.toRow(x as never));
    const currentJson = JSON.stringify(currentRows);
    const prevJson = lastSynced.get(m.key);

    // Tidak ada perubahan sejak sinkron terakhir -> skip.
    if (prevJson !== undefined) {
      if (prevJson === currentJson) return;
    }

    const prevRows: Record<string, unknown>[] = prevJson ? JSON.parse(prevJson) : [];
    const prevById = new Map(prevRows.map((r) => [String(r.id), r]));
    const currentIds = new Set(currentRows.map((r) => String(r.id)));

    // 1) Upsert row baru / berubah
    const changed = currentRows.filter((r) => {
      const prev = prevById.get(String(r.id));
      return !prev || JSON.stringify(prev) !== JSON.stringify(r);
    });
    // 2) Delete row yang hilang (livestock pakai soft-delete, tidak pernah hard delete)
    const removedIds = prevRows
      .map((r) => String(r.id))
      .filter((id) => !currentIds.has(id))
      .filter((id) => def.table !== 'livestock');

    try {
      if (changed.length > 0) {
        const payload = changed.map((r) => {
          const row: Record<string, unknown> = {};
          for (const col of def.columns) row[col] = r[col] === undefined ? null : r[col];
          return row;
        });
        const { error } = await client.from(def.table).upsert(payload, { onConflict: 'id' });
        if (error) { console.warn(`[dataSync] upsert ${def.table}:`, error.message); return; }
      }
      if (removedIds.length > 0) {
        const { error } = await client.from(def.table).delete().in('id', removedIds);
        if (error) { console.warn(`[dataSync] delete ${def.table}:`, error.message); return; }
      }
      lastSynced.set(m.key, currentJson);
      // Tandai push terakhir per tabel utk guard echo realtime (3 dtk).
      this.recentSelfPush[def.table] = Date.now();
    } catch (e) {
      console.warn(`[dataSync] push ${def.table} exception:`, e);
    }
  }

  /** Force-push semua key (dipakai tombol import manual Owner). */
  async pushAll(): Promise<void> {
    for (const m of ALL_MAPPINGS) {
      lastSynced.delete(m.key); // paksa diff terhadap undefined => push penuh
      await this.pushKey(m);
    }
  }

  // -------------------------------------------------------------------------
  // REALTIME: subscribe perubahan dari Supabase Realtime channel.
  // Saat perangkat lain mengubah data, event masuk -> pull ulang koleksi
  // terkait (pullAll) dan UI re-render. Guard `remoteEvent` mencegah loop
  // push balik (pull menandai snapshot sehingga pushKey no-op).
  // -------------------------------------------------------------------------
  private channel: ReturnType<NonNullable<ReturnType<typeof supabase>>['channel']> | null = null;
  private remoteEvent = false;
  /** Tabel -> timestamp push terakhir dari device ini (guard realtime echo). */
  private recentSelfPush: Record<string, number> = {};

  subscribeRealtime(): void {
    const client = supabase();
    if (!client || this.channel) return;
    const tables = [...new Set(ALL_MAPPINGS.map((m) => m.def.table))];
    const channel = client.channel('data-sync');
    for (const table of tables) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table } as never, () => {
        // Abaikan event hasil push device ini sendiri: realtime channel
        // menerima perubahan yang dilakukan klien ini juga. Tanpa ini setiap
        // push memicu pull balik (boros + memperluas jendela race pull-vs-input).
        if (this.recentSelfPush[table] && Date.now() - this.recentSelfPush[table] < 3000) return;
        void this.pullAll();
      });
    }
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') console.info('[dataSync] realtime aktif');
    });
    this.channel = channel;
  }

  unsubscribeRealtime(): void {
    const client = supabase();
    if (client && this.channel) {
      client.removeChannel(this.channel);
      this.channel = null;
    }
  }
}

export const dataSync = new DataSync();
