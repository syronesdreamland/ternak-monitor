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
// Permission matrix sesuai dokumen RBAC.
// Owner = penuh; Manager = kelola operasional ternak (bukan edit/hapus ternak,
// bukan keuangan, bukan kelola user); Finance = kelola keuangan (view+input+
// edit/hapus transaksi), ternak terbatas; Mitra = read-only data mitra.
// ============================================================================

// Module ternak (livestock/feed/weight/health/births) — Finance TIDAK akses, Mitra akses read-only.
const LIVESTOCK_MODULES: WorkspaceModule[] = [
  'livestock', 'feed', 'weight', 'health', 'births-deaths', 'livestock-docs',
];

// Module keuangan — hanya OWNER & ACCOUNTANT (Finance).
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

const FULL_ACCESS: WorkspaceModule[] = [
  'dashboard',
  ...LIVESTOCK_MODULES,
  ...FINANCE_MODULES,
  ...SYSTEM_MODULES,
  ...OPERATIONAL_MODULES,
];

// Manager: akses penuh operasional, TAPI tidak boleh kelola user/system.
// 'finance' (Laporan Laba Rugi) diizinkan READ-ONLY: canCreate/canEditModule/
// canDelete tetap menolak Manager untuk FINANCE_MODULES, dan RLS DB hanya
// memberi SELECT financial_transactions untuk MANAGER.
// 'invoices' (Pengajuan Dana & Invoice) diizinkan: Manager membuat pengajuan
// dana sesuai workflow (verifikasi/pencairan tetap Akuntan/Owner).
// Sidebar allowedRoles HARUS konsisten dengan matrix ini — jika tidak, klik
// menu akan diam-diam di-bounce kembali ke Dashboard oleh guard canAccess.
const MANAGER_ACCESS: WorkspaceModule[] = FULL_ACCESS.filter(
  module => !SYSTEM_MODULES.includes(module)
    && !(FINANCE_MODULES.includes(module) && module !== 'finance' && module !== 'invoices'),
);

// Finance (ACCOUNTANT): fokus keuangan + dashboard, ternak terbatas (tidak akses data ternak).
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
  OWNER: FULL_ACCESS,
  MANAGER: MANAGER_ACCESS,
  ACCOUNTANT: ACCOUNTANT_ACCESS,
  MITRA: MITRA_ACCESS,
  ADMIN: FULL_ACCESS,
  USER: [],
  DEVELOPER: FULL_ACCESS,
};

export function canAccess(role: UserRole, module: WorkspaceModule): boolean {
  return ROLE_ACCESS[role]?.includes(module) ?? false;
}

// ============================================================================
// Edit permission — granular per module (sesuai dokumen).
// ============================================================================

/**
 * Boleh MENAMBAH data di module tertentu.
 * - Owner/Developer: semua.
 * - Manager: boleh tambah data ternak & operasional (BUKAN keuangan, BUKAN user).
 * - Finance: boleh input transaksi keuangan.
 * - Mitra: TIDAK boleh tambah apa pun (read-only).
 */
export function canCreate(role: UserRole, module: WorkspaceModule): boolean {
  if (role === 'OWNER' || role === 'DEVELOPER' || role === 'ADMIN') return true;
  if (role === 'MANAGER') return !FINANCE_MODULES.includes(module) && !SYSTEM_MODULES.includes(module);
  if (role === 'ACCOUNTANT') return FINANCE_MODULES.includes(module);
  return false; // MITRA / USER
}

/**
 * Boleh MENGEDIT data di module tertentu.
 * - Owner/Developer: semua.
 * - Finance: boleh edit transaksi keuangan.
 * - Manager: TIDAK boleh edit ternak (sesuai dokumen "Edit data ternak ✗").
 * - Mitra: TIDAK boleh edit.
 */
export function canEditModule(role: UserRole, module: WorkspaceModule): boolean {
  if (role === 'OWNER' || role === 'DEVELOPER' || role === 'ADMIN') return true;
  if (role === 'ACCOUNTANT') return FINANCE_MODULES.includes(module);
  return false; // MANAGER tidak bisa edit (dokumen: edit ternak ✗), MITRA read-only
}

/**
 * Boleh MENGHAPUS data di module tertentu.
 * - Owner/Developer: semua.
 * - Finance: boleh hapus transaksi keuangan.
 * - Lainnya: tidak.
 */
export function canDelete(role: UserRole, module: WorkspaceModule): boolean {
  if (role === 'OWNER' || role === 'DEVELOPER' || role === 'ADMIN') return true;
  if (role === 'ACCOUNTANT') return FINANCE_MODULES.includes(module);
  return false;
}

/**
 * Legacy helper (broad "can edit anything") — dipakai untuk gate tombol global
 * seperti "Catat Data" dan modal add. Pertahankan untuk OWNER/DEVELOPER + Finance.
 * Manager diperbolehkan buat tambah (create) tapi bukan edit/hapus.
 */
export function canEdit(role: UserRole): boolean {
  return role === 'OWNER' || role === 'DEVELOPER' || role === 'ADMIN' || role === 'ACCOUNTANT';
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
