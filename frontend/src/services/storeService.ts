import {
  LivestockItem, LocationItem, WeightRecord, HealthRecord, BreedingRecord,
  DeathRecord, TransferRecord, SalesRecord, FeedInventory,
  FinancialTransaction, DailyReport, NotificationItem, AuditLogItem,
  BusinessSettings, UserProfile, PenItem, BirthRecord, ManagedUser, UserRole
} from '../types';

// Initial Demo Seed Data
// Helper: tanggal dalam bulan berjalan (agar data seed selalu muncul di filter periode default).
const nowDate = new Date();
const thisMonth = `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, '0')}`;
const demoDay = (day: number) => `${thisMonth}-${String(day).padStart(2, '0')}`;

const INITIAL_LOCATIONS: LocationItem[] = [
  {
    id: 'loc-kulim',
    name: 'Kulim',
    address: 'Jl. Lintas Kulim No. 45, Riau',
    picName: 'Budi Santoso',
    picPhone: '081234567890',
    livestockTypes: ['Sapi', 'Kerbau'],
    penCount: 6,
    status: 'Aktif',
    notes: 'Kandang utama penggemukan sapi BX & Simmental',
    createdAt: '2026-01-10T08:00:00Z'
  },
  {
    id: 'loc-sontang',
    name: 'Sontang',
    address: 'Desa Sontang, Kab. Rokan Hulu',
    picName: 'Rahmat Hidayat',
    picPhone: '081398765432',
    livestockTypes: ['Sapi'],
    penCount: 4,
    status: 'Aktif',
    notes: 'Kandang breeding & pembibitan sapi lokal',
    createdAt: '2026-01-15T08:00:00Z'
  },
  {
    id: 'loc-ras',
    name: 'RAS',
    address: 'Kawasan Agrowisata RAS, Siak',
    picName: 'Hendra Wijaya',
    picPhone: '081122334455',
    livestockTypes: ['Sapi', 'Kerbau'],
    penCount: 5,
    status: 'Aktif',
    notes: 'Kandang penggemukan khusus ternak qurban & potong',
    createdAt: '2026-02-01T08:00:00Z'
  }
];

const INITIAL_PENS: PenItem[] = [
  { id: 'pen-k1', locationId: 'loc-kulim', name: 'Kandang A1 (Penggemukan Jantan)', capacity: 20 },
  { id: 'pen-k2', locationId: 'loc-kulim', name: 'Kandang A2 (Indukan Bunting)', capacity: 15 },
  { id: 'pen-s1', locationId: 'loc-sontang', name: 'Kandang S1 (Pembibitan)', capacity: 15 },
  { id: 'pen-r1', locationId: 'loc-ras', name: 'Kandang R1 (Siap Jual)', capacity: 25 },
];

const INITIAL_LIVESTOCK: LivestockItem[] = [
  {
    id: 'ls-001',
    tagId: 'SP-0023',
    qrCode: 'QR-SP-0023',
    type: 'Sapi',
    breed: 'Simmental',
    gender: 'Jantan',
    dob: '2024-03-12',
    estimatedAgeMonths: 29,
    colorTraits: 'Coklat keemasan, kepala putih',
    locationId: 'loc-kulim',
    locationName: 'Kulim',
    penId: 'pen-k1',
    penName: 'Kandang A1 (Penggemukan Jantan)',
    ownershipStatus: 'Milik Mandiri',
    source: 'Pembelian',
    entryDate: '2025-01-10',
    acquisitionPrice: 18500000,
    initialWeightKg: 290,
    currentWeightKg: 334,
    healthStatus: 'Sehat',
    breedingStatus: 'Belum Dikawinkan',
    conditionCategory: 'Baik',
    status: 'Aktif',
    notes: 'Perkembangan bobot sangat memuaskan, siap kontes/potong.',
    createdAt: '2025-01-10T10:00:00Z',
    updatedAt: '2026-08-02T10:00:00Z'
  },
  {
    id: 'ls-002',
    tagId: 'SP-0024',
    qrCode: 'QR-SP-0024',
    type: 'Sapi',
    breed: 'Limosin',
    gender: 'Jantan',
    dob: '2024-05-18',
    estimatedAgeMonths: 27,
    colorTraits: 'Merah gelap mengkilap',
    locationId: 'loc-kulim',
    locationName: 'Kulim',
    penId: 'pen-k1',
    penName: 'Kandang A1 (Penggemukan Jantan)',
    ownershipStatus: 'Milik Mandiri',
    source: 'Pembelian',
    entryDate: '2025-01-10',
    acquisitionPrice: 19000000,
    initialWeightKg: 310,
    currentWeightKg: 342,
    healthStatus: 'Sakit',
    breedingStatus: 'Belum Dikawinkan',
    conditionCategory: 'Kurang Baik',
    status: 'Sakit',
    notes: 'Nafsu makan menurun sejak 2 hari lalu. Mengalami flu ringan.',
    createdAt: '2025-01-10T10:00:00Z',
    updatedAt: '2026-08-09T10:00:00Z'
  },
  {
    id: 'ls-003',
    tagId: 'SP-0025',
    qrCode: 'QR-SP-0025',
    type: 'Sapi',
    breed: 'Brahman Cross',
    gender: 'Betina',
    dob: '2023-08-10',
    estimatedAgeMonths: 36,
    colorTraits: 'Abu-abu keperakan',
    locationId: 'loc-sontang',
    locationName: 'Sontang',
    penId: 'pen-s1',
    penName: 'Kandang S1 (Pembibitan)',
    ownershipStatus: 'Milik Mandiri',
    source: 'Kelahiran Kandang',
    entryDate: '2023-08-10',
    acquisitionPrice: 0,
    initialWeightKg: 180,
    currentWeightKg: 385,
    healthStatus: 'Sehat',
    breedingStatus: 'Bunting',
    conditionCategory: 'Baik',
    status: 'Aktif',
    notes: 'Bunting 7 bulan, estimasi melahirkan pertengahan Oktober 2026.',
    createdAt: '2023-08-10T10:00:00Z',
    updatedAt: '2026-08-01T10:00:00Z'
  },
  {
    id: 'ls-004',
    tagId: 'KB-0008',
    qrCode: 'QR-KB-0008',
    type: 'Kerbau',
    breed: 'Kerbau Lumpur',
    gender: 'Jantan',
    dob: '2024-01-20',
    estimatedAgeMonths: 31,
    colorTraits: 'Hitam keabuan khas',
    locationId: 'loc-ras',
    locationName: 'RAS',
    penId: 'pen-r1',
    penName: 'Kandang R1 (Siap Jual)',
    ownershipStatus: 'Mitra',
    source: 'Pembelian',
    entryDate: '2025-02-15',
    acquisitionPrice: 22000000,
    initialWeightKg: 350,
    currentWeightKg: 410,
    healthStatus: 'Sehat',
    breedingStatus: 'Belum Dikawinkan',
    conditionCategory: 'Baik',
    status: 'Aktif',
    notes: 'Kondisi tubuh besar, siap untuk dipasarkan.',
    createdAt: '2025-02-15T10:00:00Z',
    updatedAt: '2026-08-05T10:00:00Z'
  },
  {
    id: 'ls-005',
    tagId: 'SP-0026',
    qrCode: 'QR-SP-0026',
    type: 'Sapi',
    breed: 'PO (Pesisir/Ongole)',
    gender: 'Betina',
    dob: '2024-02-14',
    estimatedAgeMonths: 30,
    colorTraits: 'Putih bersih dengan punuk sedang',
    locationId: 'loc-sontang',
    locationName: 'Sontang',
    penId: 'pen-s1',
    penName: 'Kandang S1 (Pembibitan)',
    ownershipStatus: 'Milik Mandiri',
    source: 'Kelahiran Kandang',
    entryDate: '2024-02-14',
    acquisitionPrice: 0,
    initialWeightKg: 150,
    currentWeightKg: 295,
    healthStatus: 'Isolasi',
    breedingStatus: 'Menunggu Pemeriksaan',
    conditionCategory: 'Standar',
    status: 'Isolasi',
    notes: 'Isolasi sementara pasca penanganan parasit usus.',
    createdAt: '2024-02-14T10:00:00Z',
    updatedAt: '2026-08-08T10:00:00Z'
  }
];

const INITIAL_WEIGHT_RECORDS: WeightRecord[] = [
  {
    id: 'w-001',
    livestockId: 'ls-001',
    tagId: 'SP-0023',
    weighDate: '2026-06-12',
    weightKg: 310,
    previousWeightKg: 290,
    gainKg: 20,
    officerName: 'Agus Setiawan',
    notes: 'Pertumbuhan normal',
    createdAt: '2026-06-12T09:00:00Z'
  },
  {
    id: 'w-002',
    livestockId: 'ls-001',
    tagId: 'SP-0023',
    weighDate: '2026-07-15',
    weightKg: 324,
    previousWeightKg: 310,
    gainKg: 14,
    officerName: 'Agus Setiawan',
    notes: 'Nafsu makan tinggi',
    createdAt: '2026-07-15T09:00:00Z'
  },
  {
    id: 'w-003',
    livestockId: 'ls-001',
    tagId: 'SP-0023',
    weighDate: '2026-08-02',
    weightKg: 334,
    previousWeightKg: 324,
    gainKg: 10,
    officerName: 'Agus Setiawan',
    notes: 'Penimbangan rutin bulanan',
    createdAt: '2026-08-02T09:00:00Z'
  },
  {
    id: 'w-004',
    livestockId: 'ls-002',
    tagId: 'SP-0024',
    weighDate: '2026-08-09',
    weightKg: 342,
    previousWeightKg: 348,
    gainKg: -6,
    officerName: 'Agus Setiawan',
    notes: 'Bobot mengalami penurunan 6 kg karena kurang nafsu makan.',
    createdAt: '2026-08-09T09:00:00Z'
  }
];

const INITIAL_HEALTH_RECORDS: HealthRecord[] = [
  {
    id: 'h-001',
    livestockId: 'ls-002',
    tagId: 'SP-0024',
    recordDate: '2026-08-09',
    condition: 'Flu & Demam Ringan',
    symptoms: 'Nafsu makan berkurang, bersin, lesu',
    actionTaken: 'Injeksi vitamin B-Complex dan antipiretik',
    medicineName: 'Vet-Flu & Flunixin',
    dosage: '10 ml',
    officerName: 'Budi Santoso',
    vetName: 'drh. Fitriani',
    followUpDate: '2026-08-12',
    status: 'Sakit',
    notes: 'Perlu pemantauan suhu tubuh tiap pagi.',
    createdAt: '2026-08-09T11:00:00Z'
  }
];

const INITIAL_BREEDING_RECORDS: BreedingRecord[] = [
  {
    id: 'b-001',
    motherId: 'ls-003',
    motherTag: 'SP-0025',
    fatherTag: 'Pejantan Limosin A1',
    matingDate: '2026-01-15',
    method: 'Inseminasi Buatan (IB)',
    pregCheckDate: '2026-03-20',
    pregCheckResult: 'Positif Bunting (USG)',
    pregStatus: 'Positif',
    estBirthDate: '2026-10-20',
    offspringCount: 1,
    notes: 'Kondisi induk sangat sehat, suplemen kalsium diberikan rutin.',
    createdAt: '2026-01-15T08:00:00Z'
  }
];

const INITIAL_FINANCE: FinancialTransaction[] = [
  {
    id: 'fin-001',
    invoiceNo: `TRX-IN-${thisMonth.replace('-', '')}-01`,
    date: demoDay(1),
    type: 'income',
    category: 'Penjualan Ternak',
    description: 'DP Penjualan Sapi Limosin SP-0019',
    locationId: 'loc-kulim',
    locationName: 'Kulim',
    amount: 15000000,
    paymentMethod: 'Transfer Bank',
    payeePayer: 'H. Suwandi (Pembeli)',
    createdBy: 'Penjualan Staff',
    createdAt: '2026-08-05T10:00:00Z'
  },
  {
    id: 'fin-002',
    invoiceNo: `TRX-OUT-${thisMonth.replace('-', '')}-01`,
    date: demoDay(2),
    type: 'expense',
    category: 'Pakan',
    description: 'Pembelian 5 Ton Konsentrat Pakan Sapi',
    locationId: 'loc-kulim',
    locationName: 'Kulim',
    amount: 12500000,
    paymentMethod: 'Transfer Bank',
    payeePayer: 'PT Feedmill Nusantara',
    createdBy: 'Keuangan Staff',
    createdAt: '2026-08-08T14:00:00Z'
  },
  {
    id: 'fin-003',
    invoiceNo: `TRX-OUT-${thisMonth.replace('-', '')}-02`,
    date: demoDay(3),
    type: 'expense',
    category: 'Obat & Vitamin',
    description: 'Pembelian Vaksin & Antibiotik Peternakan',
    locationId: 'loc-sontang',
    locationName: 'Sontang',
    amount: 2350000,
    paymentMethod: 'Tunai',
    payeePayer: 'Apotek Vet Riau',
    createdBy: 'Rahmat Hidayat',
    createdAt: '2026-08-09T16:00:00Z'
  }
];

const INITIAL_SALES: SalesRecord[] = [
  {
    id: 'sales-001',
    invoiceNo: 'INV-SALE-0001',
    date: demoDay(2),
    buyerName: 'H. Suwandi',
    buyerPhone: '0812-1111-2222',
    livestockIds: ['liv-001', 'liv-002'],
    weightTotalKg: 850,
    priceTotal: 30000000,
    acquisitionCostTotal: 22000000,
    paymentMethod: 'Transfer Bank',
    paymentStatus: 'Lunas',
    locationId: 'loc-kulim',
    locationName: 'Kulim',
    salesRep: 'Owner',
    transactionStatus: 'Selesai',
    createdBy: 'Owner',
    createdAt: '2026-08-05T10:00:00Z'
  }
];

const INITIAL_FEED: FeedInventory[] = [
  {
    id: 'feed-001',
    locationId: 'loc-kulim',
    locationName: 'Kulim',
    feedType: 'Konsentrat Gemuk',
    stockQty: 3200,
    unit: 'kg',
    minStock: 1000,
    unitPrice: 3800,
    supplier: 'PT Feedmill Nusantara',
    updatedAt: '2026-08-08T10:00:00Z'
  },
  {
    id: 'feed-002',
    locationId: 'loc-kulim',
    locationName: 'Kulim',
    feedType: 'Silase Rumput Gajah',
    stockQty: 450,
    unit: 'kg',
    minStock: 800, // Trigger low stock warning!
    unitPrice: 1200,
    supplier: 'Kelompok Tani Kulim',
    updatedAt: '2026-08-09T10:00:00Z'
  },
  {
    id: 'feed-003',
    locationId: 'loc-sontang',
    locationName: 'Sontang',
    feedType: 'Konsentrat Pembibitan',
    stockQty: 1800,
    unit: 'kg',
    minStock: 500,
    unitPrice: 4200,
    supplier: 'PT Agro Feed',
    updatedAt: '2026-08-07T10:00:00Z'
  }
];

const INITIAL_DAILY_REPORTS: DailyReport[] = [
  {
    id: 'rpt-001',
    date: '2026-08-09',
    locationId: 'loc-kulim',
    locationName: 'Kulim',
    popInitial: 78,
    popPurchase: 0,
    popBirth: 0,
    popTransferIn: 0,
    popSales: 1,
    popDeath: 0,
    popTransferOut: 0,
    popFinal: 77, // 78 - 1 = 77
    healthyCount: 76,
    sickCount: 1,
    isolationCount: 0,
    inTreatmentCount: 1,
    activitiesText: 'Pemberian pakan konsentrat pagi & sore. Pembersihan sanitasi kandang A1 dan A2. Penimbangan 1 ternak.',
    expensesList: [
      { category: 'Pakan', amount: 500000, description: 'Tambahan rumput segar', hasProof: true }
    ],
    photos: [],
    officerNotes: 'Kondisi sapi SP-0024 flu, sudah ditangani dokter hewan.',
    reportStatus: 'Dikirim',
    createdBy: 'Budi Santoso',
    createdAt: '2026-08-09T17:30:00Z',
    submittedAt: '2026-08-09T17:35:00Z'
  }
];

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-001',
    title: 'Ternak Sakit Membutuhkan Perhatian',
    message: 'Sapi SP-0024 di Kulim mengalami flu & penurunan bobot 6 kg.',
    severity: 'critical',
    category: 'Kesehatan',
    locationId: 'loc-kulim',
    isRead: false,
    createdAt: '2026-08-09T11:05:00Z'
  },
  {
    id: 'notif-002',
    title: 'Stok Pakan Di Bawah Minimum',
    message: 'Silase Rumput Gajah di lokasi Kulim sisa 450 kg (Batas minimum: 800 kg).',
    severity: 'warning',
    category: 'Pakan',
    locationId: 'loc-kulim',
    isRead: false,
    createdAt: '2026-08-09T12:00:00Z'
  },
  {
    id: 'notif-003',
    title: 'Pemeriksaan Kebuntingan Jatuh Tempo',
    message: '5 ekor sapi indukan di Sontang dijadwalkan pemeriksaan kebuntingan minggu ini.',
    severity: 'warning',
    category: 'Breeding',
    locationId: 'loc-sontang',
    isRead: false,
    createdAt: '2026-08-10T08:00:00Z'
  }
];

const INITIAL_AUDIT_LOGS: AuditLogItem[] = [
  {
    id: 'aud-001',
    userId: 'u-admin-1',
    userName: 'Rina (Admin)',
    userRole: 'ADMIN',
    timestamp: '2026-08-09T09:15:00Z',
    module: 'Monitoring Bobot',
    action: 'Input Penimbangan',
    targetId: 'ls-002',
    targetName: 'SP-0024',
    beforeValue: 'Bobot: 348 kg',
    afterValue: 'Bobot: 342 kg (Gain: -6 kg)'
  },
  {
    id: 'aud-002',
    userId: 'u-petugas-1',
    userName: 'Budi Santoso',
    userRole: 'USER',
    timestamp: '2026-08-09T11:00:00Z',
    module: 'Kesehatan',
    action: 'Status Kesehatan Berubah',
    targetId: 'ls-002',
    targetName: 'SP-0024',
    beforeValue: 'Status: Sehat',
    afterValue: 'Status: Sakit (Flu & Demam)'
  }
];

const INITIAL_SETTINGS: BusinessSettings = {
  companyName: 'PT TERNAK MONITOR INDONESIA',
  tagline: 'Sistem Monitoring & Manajemen Peternakan Terpadu',
  address: 'Jl. Sudirman No. 100, Pekanbaru, Riau',
  phone: '0812-3456-7890',
  ownerName: 'Bapak H. Hendra Owner',
  currency: 'IDR',
  timezone: 'Asia/Jakarta',
  expenseCategories: [
    'Pembelian Ternak', 'Pakan', 'Obat & Vitamin', 'Tenaga Kerja',
    'Transportasi', 'Kandang & Aset', 'Listrik & Air', 'Administrasi',
    'Marketing', 'Operasional Lainnya'
  ],
  incomeCategories: [
    'Penjualan Ternak', 'Sewa Aset Kandang', 'Penjualan Pupuk Organik', 'Pendapatan Lainnya'
  ]
};

// Local Storage Helper keys
export const STORAGE_KEYS = {
  // v3: version bump agar cache localStorage lama perangkat manapun (v1/v2,
  // berisi seed/data demo) tidak pernah dimuat lagi — produksi selalu mulai
  // dari DB Supabase (sumber kebenaran). CURRENT_USER/SETTINGS/USERS sengaja
  // tidak di-bump agar sesi login & konfigurasi perangkat tetap berlaku.
  LOCATIONS: 'ternak_locations_v3',
  PENS: 'ternak_pens_v3',
  LIVESTOCK: 'ternak_livestock_v3',
  WEIGHT: 'ternak_weight_v3',
  HEALTH: 'ternak_health_v3',
  BREEDING: 'ternak_breeding_v3',
  BIRTHS: 'ternak_births_v3',
  DEATHS: 'ternak_deaths_v3',
  TRANSFERS: 'ternak_transfers_v3',
  SALES: 'ternak_sales_v3',
  FEED: 'ternak_feed_v3',
  FINANCE: 'ternak_finance_v3',
  DAILY_REPORTS: 'ternak_daily_reports_v3',
  NOTIFICATIONS: 'ternak_notifications_v3',
  AUDIT_LOGS: 'ternak_audit_logs_v3',
  SETTINGS: 'ternak_settings',
  CURRENT_USER: 'ternak_current_user',
  USERS: 'ternak_users'
};

// Flag untuk dataSync: saat pull dari DB sedang berjalan, mutasi array lokal
// (penggantian array penuh) tidak boleh memicu push balik ke DB.
export const syncState = { paused: false };

// 5 akun production (sinkron dengan auth.users di Supabase).
// Role mengikuti raw_app_meta_data.role — lihat supabase/set_roles.sql.
const INITIAL_USERS: ManagedUser[] = [
  { uid: 'u-owner-1', displayName: 'Owner Pimpinan', email: 'Ptdanpusat@gmail.com', role: 'OWNER', locationIds: [], phone: '', status: 'Aktif', createdAt: '2026-09-23T19:46:47Z' },
  { uid: 'u-owner-2', displayName: 'Owner Papi Farm', email: 'Papifarmriau@gmail.com', role: 'OWNER', locationIds: [], phone: '', status: 'Aktif', createdAt: '2026-09-23T19:47:26Z' },
  { uid: 'u-manager-1', displayName: 'Manager Aziz', email: 'Azizf400@gmail.com', role: 'MANAGER', locationIds: ['loc-kulim'], phone: '', status: 'Aktif', createdAt: '2026-09-23T19:47:46Z' },
  { uid: 'u-akuntan-1', displayName: 'Keuangan', email: 'Financeptdan@gmail.com', role: 'ACCOUNTANT', locationIds: [], phone: '', status: 'Aktif', createdAt: '2026-09-23T19:48:05Z' },
  { uid: 'u-mitra-1', displayName: 'Mitra', email: 'Istriistrisholehah@gmail.com', role: 'MITRA', locationIds: ['loc-sontang'], phone: '', status: 'Aktif', createdAt: '2026-09-23T19:48:33Z' },
];

function loadStorage<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

// [DIHAPUS] loadArrayStorage — dulu menyatukan kembali seed demo ke data
// tersimpan ("item seed baru tetap muncul"), penyebab data dummy bangkit
// lagi setelah dihapus. Produksi kini memakai loadStorage + seedOrEmpty.

function saveStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("Failed to save to localStorage:", e);
  }
  // Sinkronisasi ke Supabase (debounced per-key). No-op bila sync nonaktif.
  import('./dataSync').then(({ dataSync }) => dataSync.onCollectionChanged(key)).catch(() => {});
}

/** Deteksi environment test (vitest) — seed demo hanya dipakai sebagai fixture test. */
const IS_TEST_ENV = typeof process !== 'undefined' && process.env?.npm_lifecycle_event === 'test';

/**
 * Produksi: seluruh seed demo dikosongkan — dashboard selalu mulai kosong dan
 * mengambil data dari DB Supabase (sumber kebenaran). Mode test vitest
 * mempertahankan seed sebagai fixture. resetToSeed() (test-only) tetap memakai
 * array penuh.
 */
function seedOrEmpty<T>(items: T[]): T[] {
  return IS_TEST_ENV ? items : [];
}

class StoreService {
  private listeners: (() => void)[] = [];

  // State
  public currentUser: UserProfile = loadStorage(STORAGE_KEYS.CURRENT_USER, {
    uid: 'u-owner-1',
    displayName: 'Owner Pimpinan',
    email: 'Ptdanpusat@gmail.com',
    role: 'OWNER',
    locationIds: [],
    status: 'Aktif'
  });

  public locations: LocationItem[] = loadStorage(STORAGE_KEYS.LOCATIONS, seedOrEmpty(INITIAL_LOCATIONS));
  public users: ManagedUser[] = loadStorage(STORAGE_KEYS.USERS, INITIAL_USERS);
  public pens: PenItem[] = loadStorage(STORAGE_KEYS.PENS, seedOrEmpty(INITIAL_PENS));
  public livestock: LivestockItem[] = loadStorage(STORAGE_KEYS.LIVESTOCK, seedOrEmpty(INITIAL_LIVESTOCK));
  public weightRecords: WeightRecord[] = loadStorage(STORAGE_KEYS.WEIGHT, seedOrEmpty(INITIAL_WEIGHT_RECORDS));
  public healthRecords: HealthRecord[] = loadStorage(STORAGE_KEYS.HEALTH, seedOrEmpty(INITIAL_HEALTH_RECORDS));
  public breedingRecords: BreedingRecord[] = loadStorage(STORAGE_KEYS.BREEDING, seedOrEmpty(INITIAL_BREEDING_RECORDS));
  public birthRecords: BirthRecord[] = loadStorage(STORAGE_KEYS.BIRTHS, []);
  public deathRecords: DeathRecord[] = loadStorage(STORAGE_KEYS.DEATHS, []);
  public transferRecords: TransferRecord[] = loadStorage(STORAGE_KEYS.TRANSFERS, []);
  public salesRecords: SalesRecord[] = loadStorage(STORAGE_KEYS.SALES, seedOrEmpty(INITIAL_SALES));
  public feedInventory: FeedInventory[] = loadStorage(STORAGE_KEYS.FEED, seedOrEmpty(INITIAL_FEED));
  public financialTransactions: FinancialTransaction[] = loadStorage(STORAGE_KEYS.FINANCE, seedOrEmpty(INITIAL_FINANCE));
  public dailyReports: DailyReport[] = loadStorage(STORAGE_KEYS.DAILY_REPORTS, seedOrEmpty(INITIAL_DAILY_REPORTS));
  public notifications: NotificationItem[] = loadStorage(STORAGE_KEYS.NOTIFICATIONS, seedOrEmpty(INITIAL_NOTIFICATIONS));
  public auditLogs: AuditLogItem[] = loadStorage(STORAGE_KEYS.AUDIT_LOGS, seedOrEmpty(INITIAL_AUDIT_LOGS));
  public settings: BusinessSettings = loadStorage(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);

  public activeLocationId: string = 'ALL'; // 'ALL' or locationId

  public subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  /** Dipakai dataSync untuk me-render ulang setelah pull mengganti array. */
  public notifyListeners() {
    this.notify();
  }

  // Audit Log helper
  public addAuditLog(module: string, action: string, targetId: string, targetName: string, beforeVal?: string, afterVal?: string) {
    const log: AuditLogItem = {
      id: `aud-${Date.now()}`,
      userId: this.currentUser.uid,
      userName: this.currentUser.displayName,
      userRole: this.currentUser.role,
      timestamp: new Date().toISOString(),
      module,
      action,
      targetId,
      targetName,
      beforeValue: beforeVal,
      afterValue: afterVal
    };
    this.auditLogs = [log, ...this.auditLogs];
    saveStorage(STORAGE_KEYS.AUDIT_LOGS, this.auditLogs);
    this.notify();
  }

  // Authenticated user
  public setCurrentUser(user: UserProfile) {
    this.currentUser = user;
    saveStorage(STORAGE_KEYS.CURRENT_USER, this.currentUser);
    this.notify();
  }

  public setActiveLocation(locId: string) {
    this.activeLocationId = locId;
    this.notify();
  }

  // Managed users (demo/local fallback when no backend users API is available)
  public getManagedUsers(): ManagedUser[] {
    return this.users;
  }

  public createManagedUser(data: Partial<ManagedUser> & { displayName: string; email: string; role: UserRole }): ManagedUser {
    const user: ManagedUser = {
      uid: `u-${Date.now()}`,
      displayName: data.displayName,
      email: data.email,
      role: data.role,
      locationIds: data.locationIds ?? [],
      phone: data.phone,
      status: data.status ?? 'Aktif',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.users = [user, ...this.users];
    saveStorage(STORAGE_KEYS.USERS, this.users);
    this.notify();
    return user;
  }

  public updateManagedUser(uid: string, updates: Partial<ManagedUser>): ManagedUser | undefined {
    let updated: ManagedUser | undefined;
    this.users = this.users.map(item => {
      if (item.uid !== uid) return item;
      updated = { ...item, ...updates, updatedAt: new Date().toISOString() };
      return updated;
    });
    if (updated) {
      saveStorage(STORAGE_KEYS.USERS, this.users);
      this.notify();
    }
    return updated;
  }

  public resetManagedUserPassword(uid: string, password: string): boolean {
    // Demo mode has no real credential store; the reset is acknowledged locally.
    const exists = this.users.some(item => item.uid === uid);
    if (exists) {
      this.addAuditLog('Pengguna', 'Reset Password', uid, this.users.find(item => item.uid === uid)?.displayName ?? uid);
    }
    return exists;
  }

  // Location CRUD
  public addLocation(loc: Omit<LocationItem, 'id' | 'createdAt'>) {
    const newLoc: LocationItem = {
      ...loc,
      id: `loc-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    this.locations = [...this.locations, newLoc];
    saveStorage(STORAGE_KEYS.LOCATIONS, this.locations);
    this.addAuditLog('Master Lokasi', 'Tambah Lokasi', newLoc.id, newLoc.name);
    this.notify();
    return newLoc;
  }

  public updateLocation(id: string, updates: Partial<Omit<LocationItem, 'id' | 'createdAt'>>): boolean {
    const location = this.locations.find(item => item.id === id);
    if (!location) return false;
    this.locations = this.locations.map(item => item.id === id ? { ...item, ...updates } : item);
    saveStorage(STORAGE_KEYS.LOCATIONS, this.locations);
    this.addAuditLog('Master Lokasi', 'Edit Lokasi', id, updates.name ?? location.name);
    this.notify();
    return true;
  }

  public deactivateLocation(id: string): { ok: boolean; reason?: string } {
    const location = this.locations.find(item => item.id === id);
    if (!location || location.status === 'Nonaktif') return { ok: false, reason: 'Lokasi tidak ditemukan atau sudah nonaktif.' };
    const activeLivestock = this.getActiveLivestock().filter(item => item.locationId === id).length;
    const transactions = this.salesRecords.filter(item => item.locationId === id && item.transactionStatus !== 'Batal').length
      + this.financialTransactions.filter(item => item.locationId === id).length;
    const reports = this.dailyReports.filter(item => item.locationId === id && !item.archivedAt).length;
    if (activeLivestock || transactions || reports) return { ok: false, reason: `Lokasi masih dipakai: ${activeLivestock} ternak aktif, ${transactions} transaksi, ${reports} laporan.` };
    this.locations = this.locations.map(item => item.id === id ? { ...item, status: 'Nonaktif' } : item);
    saveStorage(STORAGE_KEYS.LOCATIONS, this.locations);
    this.addAuditLog('Master Lokasi', 'Nonaktifkan Lokasi', id, location.name);
    this.notify();
    return { ok: true };
  }

  // Livestock CRUD
  public addLivestock(item: Omit<LivestockItem, 'id' | 'createdAt' | 'updatedAt'>) {
    const loc = this.locations.find(l => l.id === item.locationId);
    const createdAt = new Date().toISOString();
    const newLivestock: LivestockItem = {
      ...item,
      id: `ls-${Date.now()}`,
      locationName: loc ? loc.name : item.locationName,
      priceHistory: [{
        id: `price-${Date.now()}`,
        changedAt: createdAt,
        newPurchasePrice: item.acquisitionPrice,
        newSellingPrice: item.sellingPrice ?? 0,
        changedBy: this.currentUser.displayName,
        note: 'Harga awal saat ternak didaftarkan'
      }],
      createdAt,
      updatedAt: createdAt
    };
    this.livestock = [newLivestock, ...this.livestock];
    saveStorage(STORAGE_KEYS.LIVESTOCK, this.livestock);
    this.addAuditLog('Database Ternak', 'Tambah Ternak', newLivestock.id, newLivestock.tagId);
    this.notify();
    return newLivestock;
  }

  public updateLivestock(id: string, updates: Partial<LivestockItem>, priceChangeNote = 'Pembaruan harga ternak') {
    const old = this.livestock.find(l => l.id === id);
    if (!old) return;
    const nextPurchasePrice = updates.acquisitionPrice ?? old.acquisitionPrice;
    const nextSellingPrice = updates.sellingPrice ?? old.sellingPrice ?? 0;
    const priceChanged = nextPurchasePrice !== old.acquisitionPrice
      || nextSellingPrice !== (old.sellingPrice ?? 0);
    this.livestock = this.livestock.map(l => {
      if (l.id === id) {
        const updated: LivestockItem = {
          ...l,
          ...updates,
          priceHistory: priceChanged
            ? [
                ...(l.priceHistory ?? []),
                {
                  id: `price-${Date.now()}`,
                  changedAt: new Date().toISOString(),
                  oldPurchasePrice: l.acquisitionPrice,
                  newPurchasePrice: nextPurchasePrice,
                  oldSellingPrice: l.sellingPrice ?? 0,
                  newSellingPrice: nextSellingPrice,
                  changedBy: this.currentUser.displayName,
                  note: priceChangeNote.trim() || 'Pembaruan harga ternak'
                }
              ]
            : l.priceHistory,
          updatedAt: new Date().toISOString()
        };
        if (updates.locationId) {
          const loc = this.locations.find(x => x.id === updates.locationId);
          if (loc) updated.locationName = loc.name;
        }
        return updated;
      }
      return l;
    });
    saveStorage(STORAGE_KEYS.LIVESTOCK, this.livestock);
    this.addAuditLog('Database Ternak', 'Edit Ternak', id, old.tagId);
    if (priceChanged) {
      this.addAuditLog(
        'Database Ternak',
        'Perubahan Harga Ternak',
        id,
        old.tagId,
        `Beli: Rp ${old.acquisitionPrice.toLocaleString('id-ID')}; Jual: Rp ${(old.sellingPrice ?? 0).toLocaleString('id-ID')}`,
        `Beli: Rp ${nextPurchasePrice.toLocaleString('id-ID')}; Jual: Rp ${nextSellingPrice.toLocaleString('id-ID')}; Alasan: ${priceChangeNote}`
      );
    }
    this.notify();
  }

  public softDeleteLivestock(id: string, reason: string) {
    const item = this.livestock.find(l => l.id === id);
    if (!item) return;
    this.livestock = this.livestock.map(l => {
      if (l.id === id) {
        return {
          ...l,
          status: 'Keluar',
          deletedAt: new Date().toISOString(),
          deletedBy: this.currentUser.displayName,
          notes: `${l.notes || ''} [Soft Deleted: ${reason}]`
        };
      }
      return l;
    });
    saveStorage(STORAGE_KEYS.LIVESTOCK, this.livestock);
    this.addAuditLog('Database Ternak', 'Hapus/Arsip Ternak', id, item.tagId, undefined, reason);
    this.notify();
  }

  // Weight Records
  private recalculateWeightHistory(livestockId: string) {
    const livestock = this.livestock.find(item => item.id === livestockId);
    if (!livestock) return;

    const orderedRecords = this.weightRecords
      .filter(record => record.livestockId === livestockId)
      .sort((a, b) => {
        const dateComparison = a.weighDate.localeCompare(b.weighDate);
        return dateComparison !== 0 ? dateComparison : a.createdAt.localeCompare(b.createdAt);
      });

    let previousWeight = livestock.initialWeightKg;
    const recalculated = new Map<string, WeightRecord>();
    orderedRecords.forEach(record => {
      const updatedRecord = {
        ...record,
        previousWeightKg: previousWeight,
        gainKg: record.weightKg - previousWeight
      };
      recalculated.set(record.id, updatedRecord);
      previousWeight = record.weightKg;
    });

    this.weightRecords = this.weightRecords.map(record => recalculated.get(record.id) ?? record);
    saveStorage(STORAGE_KEYS.WEIGHT, this.weightRecords);

    this.livestock = this.livestock.map(item => item.id === livestockId
      ? {
          ...item,
          currentWeightKg: orderedRecords.length > 0 ? previousWeight : item.initialWeightKg,
          updatedAt: new Date().toISOString()
        }
      : item);
    saveStorage(STORAGE_KEYS.LIVESTOCK, this.livestock);
  }

  public addWeightRecord(rec: Omit<WeightRecord, 'id' | 'createdAt'>) {
    const newRec: WeightRecord = {
      ...rec,
      id: `w-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    this.weightRecords = [newRec, ...this.weightRecords];
    saveStorage(STORAGE_KEYS.WEIGHT, this.weightRecords);
    this.recalculateWeightHistory(rec.livestockId);

    // Check for weight drop alert
    if (rec.gainKg < 0) {
      this.addNotification({
        title: 'Peringatan Penurunan Bobot',
        message: `Ternak ${rec.tagId} mengalami penurunan bobot ${Math.abs(rec.gainKg)} kg. Harap lakukan pemeriksaan kesehatan.`,
        severity: 'warning',
        category: 'Bobot'
      });
    }

    this.addAuditLog('Monitoring Bobot', 'Input Penimbangan', newRec.id, rec.tagId, `Bobot lama: ${rec.previousWeightKg} kg`, `Bobot baru: ${rec.weightKg} kg (Gain: ${rec.gainKg} kg)`);
    this.notify();
    return newRec;
  }

  public updateWeightRecord(id: string, rec: Omit<WeightRecord, 'id' | 'createdAt'>) {
    const oldRecord = this.weightRecords.find(record => record.id === id);
    if (!oldRecord) return;

    this.weightRecords = this.weightRecords.map(record => record.id === id
      ? { ...record, ...rec }
      : record);
    saveStorage(STORAGE_KEYS.WEIGHT, this.weightRecords);

    this.recalculateWeightHistory(oldRecord.livestockId);
    if (oldRecord.livestockId !== rec.livestockId) {
      this.recalculateWeightHistory(rec.livestockId);
    }

    this.addAuditLog(
      'Monitoring Bobot',
      'Edit Penimbangan',
      id,
      rec.tagId,
      `${oldRecord.weightKg} kg (${oldRecord.weighDate})`,
      `${rec.weightKg} kg (${rec.weighDate})`
    );
    this.notify();
  }

  public deleteWeightRecord(id: string) {
    const record = this.weightRecords.find(item => item.id === id);
    if (!record) return;

    this.weightRecords = this.weightRecords.filter(item => item.id !== id);
    saveStorage(STORAGE_KEYS.WEIGHT, this.weightRecords);
    this.recalculateWeightHistory(record.livestockId);
    this.addAuditLog(
      'Monitoring Bobot',
      'Hapus Penimbangan',
      id,
      record.tagId,
      `${record.weightKg} kg (${record.weighDate})`
    );
    this.notify();
  }

  // Health Records
  private syncLivestockHealthStatus(livestockId: string) {
    const latestRecord = this.healthRecords
      .filter(record => record.livestockId === livestockId)
      .sort((a, b) => {
        const dateComparison = b.recordDate.localeCompare(a.recordDate);
        return dateComparison !== 0 ? dateComparison : b.createdAt.localeCompare(a.createdAt);
      })[0];

    const healthStatus = latestRecord?.status ?? 'Sehat';
    const livestockStatus = healthStatus === 'Isolasi'
      ? 'Isolasi'
      : healthStatus === 'Sakit' || healthStatus === 'Kritis'
        ? 'Sakit'
        : 'Aktif';

    this.livestock = this.livestock.map(item => item.id === livestockId
      ? {
          ...item,
          healthStatus,
          status: livestockStatus,
          updatedAt: new Date().toISOString()
        }
      : item);
    saveStorage(STORAGE_KEYS.LIVESTOCK, this.livestock);
  }

  public addHealthRecord(rec: Omit<HealthRecord, 'id' | 'createdAt'>) {
    const newRec: HealthRecord = {
      ...rec,
      id: `h-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    this.healthRecords = [newRec, ...this.healthRecords];
    saveStorage(STORAGE_KEYS.HEALTH, this.healthRecords);

    this.syncLivestockHealthStatus(rec.livestockId);

    if (rec.status === 'Sakit' || rec.status === 'Isolasi' || rec.status === 'Kritis') {
      this.addNotification({
        title: `Kondisi Kesehatan Ternak (${rec.status})`,
        message: `Ternak ${rec.tagId} dilaporkan ${rec.status} (${rec.condition}).`,
        severity: rec.status === 'Kritis' ? 'critical' : 'warning',
        category: 'Kesehatan'
      });
    }

    this.addAuditLog('Kesehatan', 'Input Rekam Kesehatan', newRec.id, rec.tagId, undefined, `Kondisi: ${rec.condition}, Status: ${rec.status}`);
    this.notify();
    return newRec;
  }

  public updateHealthRecord(id: string, rec: Omit<HealthRecord, 'id' | 'createdAt'>) {
    const oldRecord = this.healthRecords.find(record => record.id === id);
    if (!oldRecord) return;

    this.healthRecords = this.healthRecords.map(record => record.id === id
      ? { ...record, ...rec }
      : record);
    saveStorage(STORAGE_KEYS.HEALTH, this.healthRecords);

    this.syncLivestockHealthStatus(oldRecord.livestockId);
    if (oldRecord.livestockId !== rec.livestockId) {
      this.syncLivestockHealthStatus(rec.livestockId);
    }

    this.addAuditLog(
      'Kesehatan',
      'Edit Rekam Kesehatan',
      id,
      rec.tagId,
      `Kondisi: ${oldRecord.condition}, Status: ${oldRecord.status}`,
      `Kondisi: ${rec.condition}, Status: ${rec.status}`
    );
    this.notify();
  }

  public deleteHealthRecord(id: string) {
    const record = this.healthRecords.find(item => item.id === id);
    if (!record) return;

    this.healthRecords = this.healthRecords.filter(item => item.id !== id);
    saveStorage(STORAGE_KEYS.HEALTH, this.healthRecords);
    this.syncLivestockHealthStatus(record.livestockId);

    this.addAuditLog(
      'Kesehatan',
      'Hapus Rekam Kesehatan',
      id,
      record.tagId,
      `Kondisi: ${record.condition}, Status: ${record.status}`
    );
    this.notify();
  }

  public addBreedingRecord(rec: Omit<BreedingRecord, 'id' | 'createdAt'>) {
    const newRec: BreedingRecord = {
      ...rec,
      id: `b-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    this.breedingRecords = [newRec, ...this.breedingRecords];
    saveStorage(STORAGE_KEYS.BREEDING, this.breedingRecords);
    this.syncBreedingStatus(newRec.motherId);
    this.addAuditLog('Breeding', 'Input Perkawinan', newRec.id, newRec.motherTag);
    this.notify();
    return newRec;
  }

  private syncBreedingStatus(motherId: string) {
    const latest = this.breedingRecords
      .filter(record => record.motherId === motherId)
      .sort((a, b) => `${b.matingDate}${b.createdAt}`.localeCompare(`${a.matingDate}${a.createdAt}`))[0];
    if (!latest) {
      this.updateLivestock(motherId, { breedingStatus: 'Belum Dikawinkan' });
      return;
    }
    this.updateLivestock(motherId, {
      breedingStatus: latest.pregStatus === 'Positif' ? 'Bunting' : latest.pregStatus === 'Negatif' ? 'Tidak Bunting' : 'Menunggu Pemeriksaan'
    });
  }

  public updateBreedingRecord(id: string, rec: Omit<BreedingRecord, 'id' | 'createdAt'>): boolean {
    const existing = this.breedingRecords.find(record => record.id === id);
    if (!existing) return false;
    this.breedingRecords = this.breedingRecords.map(record => record.id === id ? { ...record, ...rec } : record);
    saveStorage(STORAGE_KEYS.BREEDING, this.breedingRecords);
    this.syncBreedingStatus(existing.motherId);
    if (existing.motherId !== rec.motherId) this.syncBreedingStatus(rec.motherId);
    this.addAuditLog('Breeding', 'Edit Perkawinan', id, rec.motherTag);
    this.notify();
    return true;
  }

  public deleteBreedingRecord(id: string): boolean {
    const record = this.breedingRecords.find(item => item.id === id);
    if (!record) return false;
    this.breedingRecords = this.breedingRecords.filter(item => item.id !== id);
    saveStorage(STORAGE_KEYS.BREEDING, this.breedingRecords);
    this.syncBreedingStatus(record.motherId);
    this.addAuditLog('Breeding', 'Hapus Perkawinan', id, record.motherTag);
    this.notify();
    return true;
  }

  // Birth Record -> Auto creates new offspring livestock
  public addBirthRecord(input: Omit<BirthRecord, 'id' | 'offspringId' | 'offspringTag' | 'createdAt'>): BirthRecord {
    const { motherId, motherTag, locationId, gender, birthWeightKg, condition, birthDate } = input;
    const loc = this.locations.find(l => l.id === locationId);
    const newTag = `ANAK-${motherTag}-${Math.floor(100 + Math.random() * 900)}`;

    const newOffspring = this.addLivestock({
      tagId: newTag,
      qrCode: `QR-${newTag}`,
      type: 'Sapi',
      breed: 'Lokal/Persilangan',
      gender,
      dob: birthDate,
      estimatedAgeMonths: 0,
      colorTraits: `Anakan dari ${motherTag}`,
      locationId,
      locationName: loc ? loc.name : '',
      ownershipStatus: 'Milik Mandiri',
      source: 'Kelahiran Kandang',
      entryDate: birthDate,
      acquisitionPrice: 0,
      initialWeightKg: birthWeightKg,
      currentWeightKg: birthWeightKg,
      healthStatus: 'Sehat',
      breedingStatus: 'Belum Dikawinkan',
      motherId,
      motherTag,
      conditionCategory: 'Baik',
      status: 'Aktif',
      notes: `Lahir dari induk ${motherTag}. Kondisi: ${condition}`
    });

    const birthRecord: BirthRecord = { ...input, id: `birth-${Date.now()}`, offspringId: newOffspring.id, offspringTag: newTag, createdAt: new Date().toISOString() };
    this.birthRecords = [birthRecord, ...this.birthRecords];
    saveStorage(STORAGE_KEYS.BIRTHS, this.birthRecords);
    this.addNotification({
      title: 'Kelahiran Ternak Baru!',
      message: `Anakan sapi (${gender}) baru lahir dari induk ${motherTag} dengan bobot ${birthWeightKg} kg di ${loc ? loc.name : ''}.`,
      severity: 'info',
      category: 'Kelahiran'
    });

    this.addAuditLog('Kelahiran', 'Input Kelahiran', newOffspring.id, newTag, `Induk: ${motherTag}`, `Bobot lahir: ${birthWeightKg} kg`);
    this.notify();
    return birthRecord;
  }

  public voidBirthRecord(id: string, reason: string): boolean {
    const record = this.birthRecords.find(item => item.id === id);
    if (!record || record.voidedAt || !reason.trim()) return false;
    const now = new Date().toISOString();
    this.birthRecords = this.birthRecords.map(item => item.id === id ? { ...item, voidedAt: now, voidedBy: this.currentUser.displayName, voidReason: reason.trim() } : item);
    this.livestock = this.livestock.map(item => item.id === record.offspringId ? { ...item, status: 'Keluar', deletedAt: now, deletedBy: this.currentUser.displayName, notes: `Diarsipkan karena kelahiran dibatalkan: ${reason.trim()}`, updatedAt: now } : item);
    saveStorage(STORAGE_KEYS.BIRTHS, this.birthRecords);
    saveStorage(STORAGE_KEYS.LIVESTOCK, this.livestock);
    this.addAuditLog('Kelahiran', 'Void Kelahiran', id, record.offspringTag, undefined, reason.trim());
    this.notify();
    return true;
  }

  // Death Record -> Auto sets status to MATI and excludes from active population
  public addDeathRecord(rec: Omit<DeathRecord, 'id' | 'createdAt'>) {
    const livestock = this.livestock.find(item => item.id === rec.livestockId);
    if (!livestock) return;

    const newRec: DeathRecord = {
      ...rec,
      previousLivestockState: {
        status: livestock.status,
        healthStatus: livestock.healthStatus,
        notes: livestock.notes
      },
      id: `d-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    this.deathRecords = [newRec, ...this.deathRecords];
    saveStorage(STORAGE_KEYS.DEATHS, this.deathRecords);

    // Update livestock status to MATI
    this.updateLivestock(rec.livestockId, {
      status: 'Mati',
      healthStatus: 'Sakit',
      notes: `MATI pada ${rec.deathDate}. Penyebab: ${rec.suspectedCause}`
    });

    this.addNotification({
      title: '🚨 LAPORAN KEMATIAN TERNAK',
      message: `Ternak ${rec.tagId} dilaporkan MATI pada ${rec.deathDate}. Dugaan: ${rec.suspectedCause}.`,
      severity: 'critical',
      category: 'Kematian',
      locationId: rec.locationId
    });

    this.addAuditLog('Kematian', 'Input Kematian Ternak', newRec.id, rec.tagId, 'Status: Aktif/Sakit', `Status: MATI (${rec.suspectedCause})`);
    this.notify();
  }

  public voidDeathRecord(id: string, reason: string): boolean {
    const record = this.deathRecords.find(item => item.id === id);
    if (!record || record.voidedAt || !record.previousLivestockState || !reason.trim()) return false;

    this.livestock = this.livestock.map(item => item.id === record.livestockId
      ? {
          ...item,
          status: record.previousLivestockState!.status,
          healthStatus: record.previousLivestockState!.healthStatus,
          notes: record.previousLivestockState!.notes,
          updatedAt: new Date().toISOString()
        }
      : item);
    this.deathRecords = this.deathRecords.map(item => item.id === id
      ? { ...item, voidedAt: new Date().toISOString(), voidedBy: this.currentUser.displayName, voidReason: reason.trim() }
      : item);
    saveStorage(STORAGE_KEYS.LIVESTOCK, this.livestock);
    saveStorage(STORAGE_KEYS.DEATHS, this.deathRecords);
    this.addAuditLog('Kematian', 'Void Kematian Ternak', id, record.tagId, `Status: Mati (${record.suspectedCause})`, `Dipulihkan; alasan: ${reason.trim()}`);
    this.addNotification({
      title: 'Laporan Kematian Dibatalkan',
      message: `Laporan kematian ${record.tagId} dibatalkan dan status ternak dipulihkan.`,
      severity: 'info',
      category: 'Kematian',
      locationId: record.locationId
    });
    return true;
  }

  public updateDeathRecord(id: string, updates: Partial<Pick<DeathRecord, 'deathDate' | 'suspectedCause' | 'symptomsBefore' | 'handlingNote' | 'officerName' | 'vetName'>>): boolean {
    const record = this.deathRecords.find(item => item.id === id);
    if (!record || record.voidedAt) return false;
    this.deathRecords = this.deathRecords.map(item => item.id === id ? { ...item, ...updates } : item);
    saveStorage(STORAGE_KEYS.DEATHS, this.deathRecords);
    this.addAuditLog('Kematian', 'Koreksi Laporan Kematian', id, record.tagId);
    this.notify();
    return true;
  }

  // Transfer Record
  public addTransferRecord(rec: Omit<TransferRecord, 'id' | 'createdAt'>) {
    const newRec: TransferRecord = {
      ...rec,
      id: `tf-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    this.transferRecords = [newRec, ...this.transferRecords];
    saveStorage(STORAGE_KEYS.TRANSFERS, this.transferRecords);

    // Update livestock location
    const livestock = this.livestock.find(l => l.id === rec.livestockId);
    if (livestock) {
      const historyItem = {
        date: rec.transferDate,
        fromLocationName: rec.originLocationName,
        toLocationName: rec.destLocationName,
        reason: rec.reason,
        officerName: rec.officerName
      };

      this.updateLivestock(rec.livestockId, {
        locationId: rec.destLocationId,
        locationName: rec.destLocationName,
        status: 'Aktif',
        locationHistory: [...(livestock.locationHistory || []), historyItem]
      });
    }

    this.addAuditLog('Mutasi', 'Transfer Lokasi', newRec.id, rec.tagId, `Dari: ${rec.originLocationName}`, `Ke: ${rec.destLocationName}`);
    this.notify();
  }

  // Financial Transactions
  public addFinancialTransaction(tx: Omit<FinancialTransaction, 'id' | 'createdAt'>) {
    const loc = this.locations.find(l => l.id === tx.locationId);
    const newTx: FinancialTransaction = {
      ...tx,
      id: `fin-${Date.now()}`,
      locationName: loc ? loc.name : tx.locationName,
      createdAt: new Date().toISOString()
    };
    this.financialTransactions = [newTx, ...this.financialTransactions];
    saveStorage(STORAGE_KEYS.FINANCE, this.financialTransactions);
    this.addAuditLog('Keuangan', 'Tambah Transaksi Keuangan', newTx.id, newTx.invoiceNo, undefined, `${tx.type.toUpperCase()}: Rp ${tx.amount.toLocaleString('id-ID')} (${tx.category})`);
    this.notify();
    return newTx;
  }

  public updateFinancialTransaction(id: string, tx: Omit<FinancialTransaction, 'id' | 'createdAt'>) {
    const oldTransaction = this.financialTransactions.find(item => item.id === id);
    if (!oldTransaction) return;
    const loc = this.locations.find(location => location.id === tx.locationId);
    const updatedTransaction: FinancialTransaction = {
      ...oldTransaction,
      ...tx,
      locationName: loc?.name ?? tx.locationName
    };

    this.financialTransactions = this.financialTransactions.map(item =>
      item.id === id ? updatedTransaction : item
    );
    saveStorage(STORAGE_KEYS.FINANCE, this.financialTransactions);
    this.addAuditLog(
      'Keuangan',
      'Edit Transaksi Keuangan',
      id,
      updatedTransaction.invoiceNo,
      `${oldTransaction.type.toUpperCase()}: Rp ${oldTransaction.amount.toLocaleString('id-ID')} (${oldTransaction.category})`,
      `${updatedTransaction.type.toUpperCase()}: Rp ${updatedTransaction.amount.toLocaleString('id-ID')} (${updatedTransaction.category})`
    );
    this.notify();
  }

  public deleteFinancialTransaction(id: string) {
    const transaction = this.financialTransactions.find(item => item.id === id);
    if (!transaction) return;

    this.financialTransactions = this.financialTransactions.filter(item => item.id !== id);
    saveStorage(STORAGE_KEYS.FINANCE, this.financialTransactions);
    this.addAuditLog(
      'Keuangan',
      'Hapus Transaksi Keuangan',
      id,
      transaction.invoiceNo,
      `${transaction.type.toUpperCase()}: Rp ${transaction.amount.toLocaleString('id-ID')} (${transaction.category})`
    );
    this.notify();
  }

  public addFeedInventory(item: Omit<FeedInventory, 'id' | 'updatedAt'>) {
    const newItem: FeedInventory = {
      ...item,
      id: `feed-${Date.now()}`,
      updatedAt: new Date().toISOString()
    };
    this.feedInventory = [newItem, ...this.feedInventory];
    saveStorage(STORAGE_KEYS.FEED, this.feedInventory);
    this.addAuditLog('Pakan', 'Tambah Stok Pakan', newItem.id, newItem.feedType);
    this.notify();
    return newItem;
  }

  public updateFeedInventory(id: string, updates: Omit<FeedInventory, 'id' | 'updatedAt'>) {
    const oldItem = this.feedInventory.find(item => item.id === id);
    if (!oldItem) return;

    this.feedInventory = this.feedInventory.map(item => item.id === id
      ? { ...item, ...updates, updatedAt: new Date().toISOString() }
      : item);
    saveStorage(STORAGE_KEYS.FEED, this.feedInventory);
    this.addAuditLog(
      'Pakan',
      'Edit Stok Pakan',
      id,
      updates.feedType,
      `Stok: ${oldItem.stockQty} ${oldItem.unit}`,
      `Masuk: ${updates.stockIn ?? 0}, Keluar: ${updates.stockOut ?? 0}, Sisa: ${updates.stockQty} ${updates.unit}`
    );
    this.notify();
  }

  public archiveFeedInventory(id: string): boolean {
    const item = this.feedInventory.find(feed => feed.id === id);
    if (!item || item.archivedAt) return false;

    this.feedInventory = this.feedInventory.map(feed => feed.id === id
      ? { ...feed, archivedAt: new Date().toISOString(), archivedBy: this.currentUser.displayName, updatedAt: new Date().toISOString() }
      : feed);
    saveStorage(STORAGE_KEYS.FEED, this.feedInventory);
    this.addAuditLog('Pakan', 'Arsip Stok Pakan', id, item.feedType, `Stok: ${item.stockQty} ${item.unit}`);
    this.notify();
    return true;
  }

  public getActiveFeedInventory(): FeedInventory[] {
    return this.feedInventory.filter(item => !item.archivedAt);
  }

  public updateSettings(settings: BusinessSettings) {
    this.settings = settings;
    saveStorage(STORAGE_KEYS.SETTINGS, this.settings);
    this.addAuditLog('Pengaturan', 'Perbarui Profil Usaha', 'business-settings', settings.companyName);
    this.notify();
  }

  // Sales Transactions
  public addSalesTransaction(tx: Omit<SalesRecord, 'id' | 'createdAt'>) {
    if (tx.paymentStatus === 'DP') throw new Error('Pembayaran DP belum didukung sampai nominal uang muka dimodelkan.');
    const preSaleLivestockSnapshots = tx.livestockIds.map(livestockId => {
      const item = this.livestock.find(livestock => livestock.id === livestockId);
      return item ? { livestockId, status: item.status, notes: item.notes } : undefined;
    }).filter((item): item is NonNullable<typeof item> => Boolean(item));
    const newTx: SalesRecord = {
      ...tx,
      linkedFinanceTransactionIds: [],
      preSaleLivestockSnapshots,
      id: `sales-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    this.salesRecords = [newTx, ...this.salesRecords];
    saveStorage(STORAGE_KEYS.SALES, this.salesRecords);

    // If transaction completed, set livestock status to TERJUAL
    if (tx.transactionStatus === 'Selesai') {
      tx.livestockIds.forEach(id => {
        this.updateLivestock(id, {
          status: 'Dijual',
          notes: `Terjual pada ${tx.date} kepada ${tx.buyerName} (${tx.invoiceNo})`
        });
      });
    }

    // A completed, paid sale produces linked revenue and HPP ledger entries.
    // Keeping both IDs on the sale makes a later void atomic and traceable.
    if (tx.paymentStatus === 'Lunas') {
      const revenue = this.addFinancialTransaction({
        invoiceNo: tx.invoiceNo,
        date: tx.date,
        type: 'income',
        category: 'Penjualan Ternak',
        description: `Penjualan ${tx.livestockIds.length} ternak (${tx.invoiceNo}) - ${tx.paymentStatus}`,
        locationId: tx.locationId,
        locationName: tx.locationName,
        amount: tx.priceTotal,
        paymentMethod: tx.paymentMethod,
        payeePayer: tx.buyerName,
        proofUrl: tx.proofUrl,
        createdBy: tx.createdBy
      });
      const linkedFinanceTransactionIds = [revenue.id];

      if (tx.transactionStatus === 'Selesai') {
        const acquisitionCost = tx.acquisitionCostTotal ?? tx.livestockIds.reduce((total, livestockId) => {
          const livestock = this.livestock.find(item => item.id === livestockId);
          return total + (livestock?.acquisitionPrice ?? 0);
        }, 0);
        if (acquisitionCost > 0) {
          const hpp = this.addFinancialTransaction({
            invoiceNo: tx.invoiceNo,
            date: tx.date,
            type: 'expense',
            category: 'Pembelian Ternak',
            description: `Harga beli/HPP ternak terjual (${tx.invoiceNo})`,
            locationId: tx.locationId,
            locationName: tx.locationName,
            amount: acquisitionCost,
            paymentMethod: 'Harga Perolehan',
            payeePayer: 'Persediaan Ternak',
            createdBy: tx.createdBy
          });
          linkedFinanceTransactionIds.push(hpp.id);
        }
      }

      newTx.linkedFinanceTransactionIds = linkedFinanceTransactionIds;
      this.salesRecords = this.salesRecords.map(item => item.id === newTx.id ? newTx : item);
      saveStorage(STORAGE_KEYS.SALES, this.salesRecords);
    }

    this.addAuditLog('Penjualan', 'Input Transaksi Penjualan', newTx.id, tx.invoiceNo, undefined, `Total: Rp ${tx.priceTotal.toLocaleString('id-ID')} (${tx.paymentStatus})`);
    this.notify();
    return newTx;
  }

  public voidSalesTransaction(id: string, reason: string): boolean {
    const sale = this.salesRecords.find(item => item.id === id);
    if (!sale || sale.transactionStatus === 'Batal' || !reason.trim() || !sale.preSaleLivestockSnapshots) return false;
    const now = new Date().toISOString();
    const snapshots = new Map(sale.preSaleLivestockSnapshots.map(item => [item.livestockId, item]));
    this.livestock = this.livestock.map(item => {
      const snapshot = snapshots.get(item.id);
      return snapshot ? { ...item, status: snapshot.status, notes: snapshot.notes, updatedAt: now } : item;
    });
    const linkedIds = new Set(sale.linkedFinanceTransactionIds ?? []);
    this.financialTransactions = this.financialTransactions.filter(item => !linkedIds.has(item.id));
    this.salesRecords = this.salesRecords.map(item => item.id === id ? { ...item, transactionStatus: 'Batal', voidedAt: now, voidedBy: this.currentUser.displayName, voidReason: reason.trim() } : item);
    saveStorage(STORAGE_KEYS.LIVESTOCK, this.livestock);
    saveStorage(STORAGE_KEYS.FINANCE, this.financialTransactions);
    saveStorage(STORAGE_KEYS.SALES, this.salesRecords);
    this.addAuditLog('Penjualan', 'Void Penjualan', id, sale.invoiceNo, `Rp ${sale.priceTotal.toLocaleString('id-ID')}`, reason.trim());
    this.notify();
    return true;
  }

  // Daily Farm Reports
  public addDailyReport(rpt: Omit<DailyReport, 'id' | 'createdAt' | 'popFinal'>) {
    // Formula check: Initial + Purchase + Birth + TransferIn - Sales - Death - TransferOut
    const popFinal = (rpt.popInitial + rpt.popPurchase + rpt.popBirth + rpt.popTransferIn) - (rpt.popSales + rpt.popDeath + rpt.popTransferOut);

    const newRpt: DailyReport = {
      ...rpt,
      id: `rpt-${Date.now()}`,
      popFinal: Math.max(0, popFinal),
      createdAt: new Date().toISOString()
    };
    this.dailyReports = [newRpt, ...this.dailyReports];
    saveStorage(STORAGE_KEYS.DAILY_REPORTS, this.dailyReports);

    this.addAuditLog('Laporan Harian', 'Kirim Laporan Harian', newRpt.id, `Laporan ${rpt.locationName} (${rpt.date})`, undefined, `Populasi Akhir: ${popFinal} ekor`);
    this.notify();
    return newRpt;
  }

  public updateDailyReport(id: string, updates: Partial<Omit<DailyReport, 'id' | 'createdAt'>>): boolean {
    const report = this.dailyReports.find(item => item.id === id);
    if (!report || report.reportStatus === 'Disetujui' || report.archivedAt) return false;
    const updated = { ...report, ...updates };
    updated.popFinal = Math.max(0, updated.popInitial + updated.popPurchase + updated.popBirth + updated.popTransferIn - updated.popSales - updated.popDeath - updated.popTransferOut);
    this.dailyReports = this.dailyReports.map(item => item.id === id ? updated : item);
    saveStorage(STORAGE_KEYS.DAILY_REPORTS, this.dailyReports);
    this.addAuditLog('Laporan Harian', 'Edit Laporan Harian', id, `Laporan ${updated.locationName} (${updated.date})`);
    this.notify();
    return true;
  }

  public archiveDailyReport(id: string): boolean {
    const report = this.dailyReports.find(item => item.id === id);
    if (!report || report.reportStatus === 'Disetujui' || report.archivedAt) return false;
    this.dailyReports = this.dailyReports.map(item => item.id === id ? { ...item, archivedAt: new Date().toISOString(), archivedBy: this.currentUser.displayName } : item);
    saveStorage(STORAGE_KEYS.DAILY_REPORTS, this.dailyReports);
    this.addAuditLog('Laporan Harian', 'Arsip Laporan Harian', id, `Laporan ${report.locationName} (${report.date})`);
    this.notify();
    return true;
  }

  public updateDailyReportStatus(id: string, status: DailyReport['reportStatus'], reviewerName: string) {
    const report = this.dailyReports.find(item => item.id === id);
    if (!report || report.archivedAt) return false;
    this.dailyReports = this.dailyReports.map(r => {
      if (r.id === id) {
        return {
          ...r,
          reportStatus: status,
          reviewedBy: reviewerName,
          reviewedAt: new Date().toISOString()
        };
      }
      return r;
    });
    saveStorage(STORAGE_KEYS.DAILY_REPORTS, this.dailyReports);
    this.addAuditLog('Laporan Harian', `Approval Laporan: ${status}`, id, status);
    this.notify();
    return true;
  }

  // Notifications
  public addNotification(item: Omit<NotificationItem, 'id' | 'isRead' | 'createdAt'>) {
    const newNotif: NotificationItem = {
      ...item,
      id: `notif-${Date.now()}`,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    this.notifications = [newNotif, ...this.notifications];
    saveStorage(STORAGE_KEYS.NOTIFICATIONS, this.notifications);
    this.notify();
  }

  public markNotificationRead(id: string) {
    this.notifications = this.notifications.map(n => n.id === id ? { ...n, isRead: true } : n);
    saveStorage(STORAGE_KEYS.NOTIFICATIONS, this.notifications);
    this.notify();
  }

  // Reset / Clear Demo Seed
  public resetForDemo() {
    this.resetToSeed();
  }

  /** Test-only: muat ulang seed demo sebagai fixture vitest. Melempar error di produksi. */
  public resetToSeed() {
    if (!IS_TEST_ENV) {
      throw new Error('resetToSeed hanya untuk environment test; produksi tidak pernah memuat seed.');
    }
    this.locations = INITIAL_LOCATIONS;
    this.pens = INITIAL_PENS;
    this.livestock = INITIAL_LIVESTOCK;
    this.weightRecords = INITIAL_WEIGHT_RECORDS;
    this.healthRecords = INITIAL_HEALTH_RECORDS;
    this.breedingRecords = INITIAL_BREEDING_RECORDS;
    this.birthRecords = [];
    this.deathRecords = [];
    this.transferRecords = [];
    this.salesRecords = [];
    this.feedInventory = INITIAL_FEED;
    this.financialTransactions = INITIAL_FINANCE;
    this.dailyReports = INITIAL_DAILY_REPORTS;
    this.notifications = INITIAL_NOTIFICATIONS;
    this.auditLogs = INITIAL_AUDIT_LOGS;
    this.settings = INITIAL_SETTINGS;

    Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
    this.notify();
  }

  public clearAllDemoData() {
    this.locations = [];
    this.pens = [];
    this.livestock = [];
    this.weightRecords = [];
    this.healthRecords = [];
    this.breedingRecords = [];
    this.birthRecords = [];
    this.deathRecords = [];
    this.transferRecords = [];
    this.salesRecords = [];
    this.feedInventory = [];
    this.financialTransactions = [];
    this.dailyReports = [];
    this.notifications = [];
    this.auditLogs = [];
    saveStorage(STORAGE_KEYS.LOCATIONS, this.locations);
    saveStorage(STORAGE_KEYS.PENS, this.pens);
    saveStorage(STORAGE_KEYS.LIVESTOCK, this.livestock);
    saveStorage(STORAGE_KEYS.WEIGHT, this.weightRecords);
    saveStorage(STORAGE_KEYS.HEALTH, this.healthRecords);
    saveStorage(STORAGE_KEYS.BREEDING, this.breedingRecords);
    saveStorage(STORAGE_KEYS.BIRTHS, this.birthRecords);
    saveStorage(STORAGE_KEYS.DEATHS, this.deathRecords);
    saveStorage(STORAGE_KEYS.TRANSFERS, this.transferRecords);
    saveStorage(STORAGE_KEYS.SALES, this.salesRecords);
    saveStorage(STORAGE_KEYS.FEED, this.feedInventory);
    saveStorage(STORAGE_KEYS.FINANCE, this.financialTransactions);
    saveStorage(STORAGE_KEYS.DAILY_REPORTS, this.dailyReports);
    saveStorage(STORAGE_KEYS.NOTIFICATIONS, this.notifications);
    saveStorage(STORAGE_KEYS.AUDIT_LOGS, this.auditLogs);
    this.notify();
  }

  // Filtered queries based on activeLocationId
  public getActiveLivestock(locId?: string): LivestockItem[] {
    const targetLoc = locId || this.activeLocationId;
    return this.livestock.filter(l => {
      if (l.deletedAt) return false;
      if (l.status === 'Mati' || l.status === 'Dijual' || l.status === 'Keluar') return false;
      if (targetLoc && targetLoc !== 'ALL') return l.locationId === targetLoc;
      return true;
    });
  }

  public getDashboardMetrics(locId?: string) {
    const targetLoc = locId || this.activeLocationId;
    const activeLivestock = this.getActiveLivestock(targetLoc);
    const monthPrefix = new Date().toISOString().slice(0, 7);
    const today = new Date().toISOString().slice(0, 10);
    const matchesLocation = (locationId?: string) => targetLoc === 'ALL' || locationId === targetLoc;

    const healthy = activeLivestock.filter(l => l.healthStatus === 'Sehat').length;
    const sick = activeLivestock.filter(l => l.healthStatus === 'Sakit' || l.healthStatus === 'Kritis').length;
    const isolation = activeLivestock.filter(l => l.healthStatus === 'Isolasi').length;

    // Finance calculations
    const filteredTx = this.financialTransactions.filter(t => targetLoc === 'ALL' || t.locationId === targetLoc);
    const income = filteredTx.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
    const expenses = filteredTx.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);

    return {
      totalActive: activeLivestock.length,
      healthy,
      sick,
      isolation,
      births: this.livestock.filter(l =>
        l.source === 'Kelahiran Kandang' && l.entryDate.startsWith(monthPrefix) && matchesLocation(l.locationId)
      ).length,
      deaths: this.deathRecords.filter(d => d.deathDate.startsWith(monthPrefix) && matchesLocation(d.locationId)).length,
      purchases: this.livestock.filter(l =>
        l.source === 'Pembelian' && l.entryDate.startsWith(monthPrefix) && matchesLocation(l.locationId)
      ).length,
      sales: this.salesRecords.filter(s => s.date.startsWith(monthPrefix) && matchesLocation(s.locationId)).length,
      income,
      expenses,
      netProfit: income - expenses,
      submittedReports: this.dailyReports.filter(r => r.date === today && matchesLocation(r.locationId)).length,
      totalLocations: this.locations.length,
      alertsCount: this.notifications.filter(n => !n.isRead && (!n.locationId || matchesLocation(n.locationId))).length
    };
  }
}

export const storeService = new StoreService();
