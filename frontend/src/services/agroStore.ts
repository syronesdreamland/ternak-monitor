import {
  CropRecord, CropActivityRecord, GardenDocumentRecord,
  PondRecord, WaterQualityRecord, FishFeedLog, FishHarvestRecord,
  WildlifeRecord, WildlifeFeedSchedule,
  InventoryItem, StockMutation, PurchaseRequest, PurchaseOrder,
  TaskItem, AttendanceRecord, KpiScore,
  CashTransaction, LpjReport, ApprovalRequest, MasterDataItem,
} from '../types';

// ============================================================================
// Satu store terpadu untuk semua divisi baru (agro multi-divisi).
// Pola: snapshot() + subscribe(listener) — konsisten dengan financialDocumentsStore.
// Data disimpan ke localStorage; sinkron ke Supabase via dataSync.
// ============================================================================

const KEY = 'ternak_agro_v2';

/** Nama tabel DB untuk tiap koleksi (untuk key sync dataSync). */
const COLLECTION_TABLE: Record<string, string> = {
  crops: 'crop_records',
  cropActivities: 'crop_activities',
  gardenDocuments: 'garden_documents',
  ponds: 'ponds',
  waterQuality: 'water_quality_records',
  fishFeeds: 'fish_feed_logs',
  fishHarvests: 'fish_harvest_records',
  wildlife: 'wildlife_records',
  wildlifeFeeds: 'wildlife_feed_schedules',
  inventory: 'inventory_items',
  stockMutations: 'stock_mutations',
  purchaseRequests: 'purchase_requests',
  purchaseOrders: 'purchase_orders',
  tasks: 'tasks',
  attendance: 'attendance_records',
  kpis: 'kpi_scores',
  cashTransactions: 'cash_transactions',
  lpjReports: 'lpj_reports',
  approvals: 'approval_requests',
  masterData: 'master_data',
};

function agroKeyToTable(key: keyof AgroState): string {
  return COLLECTION_TABLE[key] ?? String(key);
}

const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export interface AgroState {
  crops: CropRecord[];
  cropActivities: CropActivityRecord[];
  gardenDocuments: GardenDocumentRecord[];
  ponds: PondRecord[];
  waterQuality: WaterQualityRecord[];
  fishFeeds: FishFeedLog[];
  fishHarvests: FishHarvestRecord[];
  wildlife: WildlifeRecord[];
  wildlifeFeeds: WildlifeFeedSchedule[];
  inventory: InventoryItem[];
  stockMutations: StockMutation[];
  purchaseRequests: PurchaseRequest[];
  purchaseOrders: PurchaseOrder[];
  tasks: TaskItem[];
  attendance: AttendanceRecord[];
  kpis: KpiScore[];
  cashTransactions: CashTransaction[];
  lpjReports: LpjReport[];
  approvals: ApprovalRequest[];
  masterData: MasterDataItem[];
}


function load(): AgroState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw) as AgroState;
      // Produksi: data tersimpan dipakai apa adanya (tanpa seed demo).
      return { ...emptyAgroState(), ...saved };
    }
  } catch { /* ignore */ }
  return emptyAgroState();
}

/** State kosong produksi (tanpa data dummy). */
function emptyAgroState(): AgroState {
  const keys = Object.keys(COLLECTION_TABLE) as (keyof AgroState)[];
  const out = {} as AgroState;
  for (const k of keys) (out[k] as unknown[]) = [];
  return out;
}

class AgroStore {
  private state: AgroState = load();
  private listeners = new Set<() => void>();

  snapshot(): AgroState {
    return this.state;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private commit() {
    try { localStorage.setItem(KEY, JSON.stringify(this.state)); } catch (e) { console.error(e); }
    // Sinkronisasi ke Supabase (debounced per koleksi). No-op bila sync nonaktif.
    import('./dataSync').then(({ dataSync }) => {
      for (const k of Object.keys(this.state)) dataSync.onCollectionChanged(`agro:${agroKeyToTable(k as keyof AgroState)}`);
    }).catch(() => {});
    this.listeners.forEach(l => l());
  }

  // ---- Generic helpers ----
  add<K extends keyof AgroState>(key: K, item: AgroState[K] extends (infer T)[] ? T : never) {
    (this.state[key] as unknown[]) = [item, ...(this.state[key] as unknown[])];
    this.commit();
  }

  update<K extends keyof AgroState>(key: K, id: string, patch: Record<string, unknown>) {
    const list = this.state[key] as Array<{ id: string }>;
    const idx = list.findIndex(x => x.id === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...patch };
      this.commit();
    }
  }

  remove<K extends keyof AgroState>(key: K, id: string) {
    (this.state[key] as unknown as Array<{ id: string }>) = (this.state[key] as unknown as Array<{ id: string }>).filter(x => x.id !== id);
    this.commit();
  }

  /** Ganti isi satu koleksi (dipakai dataSync saat pull dari DB / realtime). */
  replaceCollection<K extends keyof AgroState>(key: K, items: AgroState[K]) {
    this.state[key] = items;
    try { localStorage.setItem(KEY, JSON.stringify(this.state)); } catch { /* ignore */ }
    this.listeners.forEach(l => l());
  }
}

export const agroStore = new AgroStore();

export function makeId(prefix: string): string {
  return uid(prefix);
}
