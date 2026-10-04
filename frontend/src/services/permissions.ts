import type { UserRole } from '../types';

export type WorkspaceModule =
  | 'dashboard' | 'livestock' | 'health' | 'births-deaths' | 'transactions'
  | 'sales-results' | 'finance' | 'expenses' | 'feed' | 'weight' | 'notifications' | 'daily-reports'
  | 'reports' | 'invoices' | 'users' | 'settings'
  // FINANCE CONTROL
  | 'finance-dashboard' | 'approval-center' | 'cash-flow' | 'lpj'
  // PETERNAKAN SAPI
  | 'livestock-docs'
  // KEBUN & PERTANIAN
  | 'crop-longterm' | 'crop-shortterm' | 'crop-activity' | 'garden-docs'
  // PERIKANAN & BIOFLOK
  | 'ponds' | 'water-quality' | 'fish-feed' | 'fish-harvest' | 'fish-docs'
  // SATWA & AVIARI
  | 'wildlife' | 'wildlife-feed'
  // INVENTORY & PURCHASING
  | 'inventory' | 'purchase-request' | 'purchase-order'
  // OPERASIONAL
  | 'daily-report' | 'task-management' | 'attendance' | 'kpi'
  // REPORT & SYSTEM
  | 'master-data' | 'audit-trail';

export const ROLE_LABELS: Record<UserRole, string> = {
  OWNER: 'Owner',
  MANAGER: 'Manager',
  ACCOUNTANT: 'Finance',
  MITRA: 'Mitra',
  ADMIN: 'Administrator',
  USER: 'Customer',
  DEVELOPER: 'Developer',
};

// ============================================================================
// MATRIX HAK AKSES v1.1 — "Two Pillars" (Owner = Monitor & Approval,
// Manager = Eksekusi & Input Data). Lihat dokumen revisi 2026-09-28.
//
// 1) OWNER  = pemantau & pengambil keputusan, BUKAN input harian:
//    akses LIHAT semua modul, tetapi input hanya via approval pengajuan dana
//    (approveFundRequest) + aksi pengawasan (batalkan invoice). Form tambah/
//    edit/hapus data dimatikan (canCreate/canEditModule/canDelete = false).
// 2) MANAGER = satu-satunya eksekutor & input data: seluruh modul operasional
//    DAN keuangan (kas masuk/keluar, pengeluaran, invoice, PO) bisa di-input.
//    Edit/hapus data transaksi tetap terbatas (koreksi via Owner/Developer).
// 3) FINANCE (ACCOUNTANT) = View Only khusus menu keuangan (lihat transaksi
//    tanpa form input), sesuai catatan tambahan dokumen revisi.
// 4) MITRA = tidak diubah pada v1.1 (read-only).
// Sidebar allowedRoles HARUS konsisten dengan matrix ini — jika tidak, klik
// menu akan diam-diam di-bounce kembali ke Dashboard oleh guard canAccess.
// ============================================================================

// Module ternak (livestock/feed/weight/health/births) — Finance TIDAK akses, Mitra akses read-only.
const LIVESTOCK_MODULES: WorkspaceModule[] = [
  'livestock', 'feed', 'weight', 'health', 'births-deaths', 'livestock-docs',
];

// Module keuangan.
// v1.1: Manager jadi inputer keuangan (masuk MATRIX_MANAGE); Owner & Finance
// tetap bisa MELIHAT semua menu keuangan, tapi Owner tidak menginput harian
// dan Finance view-only.
const FINANCE_MODULES: WorkspaceModule[] = [
  'finance', 'expenses', 'sales-results', 'transactions',
  'finance-dashboard', 'approval-center', 'cash-flow', 'lpj',
  'invoices', 'reports', 'inventory', 'purchase-request', 'purchase-order',
];

// Module system/kelola — hanya OWNER & DEVELOPER.
const SYSTEM_MODULES: WorkspaceModule[] = ['users', 'settings', 'master-data', 'audit-trail'];

// Module operasional lintas divisi (Manager + Mitra bisa akses).
const OPERATIONAL_MODULES: WorkspaceModule[] = [
  'notifications', 'daily-report', 'task-management', 'attendance', 'kpi', 'daily-reports',
  'crop-longterm', 'crop-shortterm', 'crop-activity', 'garden-docs',
  'ponds', 'water-quality', 'fish-feed', 'fish-harvest', 'fish-docs',
  'wildlife', 'wildlife-feed',
];

// v1.1: seluruh modul operasional + keuangan = area kerja Manager.
const FULL_ACCESS: WorkspaceModule[] = [
  'dashboard',
  ...LIVESTOCK_MODULES,
  ...FINANCE_MODULES,
  ...OPERATIONAL_MODULES,
];

// v1.1: Owner MEMANTAU semua (dashboard + operasional + keuangan) tapi bukan
// inputer. canCreate/canEditModule/canDelete di bawah mematikan form input.
const OWNER_ACCESS: WorkspaceModule[] = FULL_ACCESS;

// Manager: akses penuh operasional + keuangan, TAPI tidak boleh kelola user/system.
const MANAGER_ACCESS: WorkspaceModule[] = FULL_ACCESS;

// Finance (ACCOUNTANT): View Only khusus keuangan — dashboard, notifikasi,
// dan seluruh modul keuangan (baca), TANPA modul operasional/ternak.
const ACCOUNTANT_ACCESS: WorkspaceModule[] = [
  'dashboard', 'notifications',
  ...FINANCE_MODULES,
];

// Mitra: read-only data terkait mitra (dashboard + operasional divisi yang dikelola).
const MITRA_ACCESS: WorkspaceModule[] = [
  'dashboard', 'notifications',
  'livestock', 'feed', 'weight', 'invoices',
  'crop-longterm', 'crop-shortterm', 'crop-activity',
  'ponds', 'water-quality', 'fish-feed', 'fish-harvest',
  'wildlife', 'wildlife-feed',
  'daily-report', 'task-management',
];

const ROLE_ACCESS: Record<UserRole, WorkspaceModule[]> = {
  OWNER: OWNER_ACCESS,
  MANAGER: MANAGER_ACCESS,
  ACCOUNTANT: ACCOUNTANT_ACCESS,
  MITRA: MITRA_ACCESS,
  ADMIN: FULL_ACCESS,
  USER: [],
  DEVELOPER: ['dashboard', 'notifications', ...SYSTEM_MODULES, ...FULL_ACCESS],
};

export function canAccess(role: UserRole, module: WorkspaceModule): boolean {
  return ROLE_ACCESS[role]?.includes(module) ?? false;
}

// ============================================================================
// Edit permission — granular per module (v1.1: two pillars).
// ============================================================================

/**
 * Boleh MENAMBAH data di module tertentu.
 * v1.1: MANAGER = satu-satunya inputer (operasional + keuangan).
 * DEVELOPER/ADMIN = akses teknis penuh. OWNER & FINANCE tidak menginput
 * harian (Owner fokus approval; Finance view-only).
 * Mitra: TIDAK boleh tambah apa pun (read-only).
 */
export function canCreate(role: UserRole, module: WorkspaceModule): boolean {
  if (role === 'MANAGER' || role === 'DEVELOPER' || role === 'ADMIN') return !SYSTEM_MODULES.includes(module);
  return false;
}

/** Koreksi (edit) transaksi keuangan: RLS UPDATE financial_transactions = OWNER saja. */
export function canCorrectFinance(role: UserRole): boolean {
  return role === 'OWNER' || role === 'DEVELOPER' || role === 'ADMIN';
}

/**
 * Boleh MENGEDIT data di module tertentu.
 * v1.1: hanya MANAGER (di areanya) + DEVELOPER/ADMIN. Owner tidak mengedit
 * (monitor & approval), Finance view-only, Mitra read-only.
 */
export function canEditModule(role: UserRole, module: WorkspaceModule): boolean {
  if (role === 'DEVELOPER' || role === 'ADMIN') return true;
  if (role === 'MANAGER') return !SYSTEM_MODULES.includes(module);
  return false;
}

/**
 * Boleh MENGHAPUS data di module tertentu.
 * v1.1: hanya MANAGER (di areanya) + DEVELOPER/ADMIN.
 */
export function canDelete(role: UserRole, module: WorkspaceModule): boolean {
  if (role === 'DEVELOPER' || role === 'ADMIN') return true;
  if (role === 'MANAGER') return !SYSTEM_MODULES.includes(module);
  return false;
}

/**
 * Legacy helper (broad "can edit anything") — dipakai untuk gate tombol global
 * seperti "Catat Data" dan modal add. v1.1: hanya MANAGER + DEVELOPER/ADMIN
 * (Owner & Finance tidak lagi melihat tombol input global).
 */
export function canEdit(role: UserRole): boolean {
  return role === 'MANAGER' || role === 'DEVELOPER' || role === 'ADMIN';
}

export function canResetDemoData(role: UserRole): boolean {
  return role === 'OWNER' || role === 'DEVELOPER';
}

export function canManageUsers(role: UserRole): boolean {
  return role === 'OWNER' || role === 'DEVELOPER';
}

export function canManageMasterData(role: UserRole): boolean {
  return role === 'OWNER' || role === 'DEVELOPER';
}

export function getRoleLabel(role: UserRole): string {
  return ROLE_LABELS[role] ?? role;
}
