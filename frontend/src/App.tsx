import React, { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { Loader2, LogIn } from 'lucide-react';
import { LoginPage } from './components/auth/LoginPage';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { BottomNav } from './components/layout/BottomNav';
import { MobileNavigationDrawer } from './components/layout/MobileNavigationDrawer';
import { getNavigationLabel } from './components/layout/Sidebar';
import { DutaAgriNusantaraLogo } from './components/brand/DutaAgriNusantaraLogo';
import { SalesCatalogView } from './components/catalog/SalesCatalogView';
import { canAccess, canEdit } from './services/permissions';

import { storeService } from './services/storeService';
import { authAPI, authSession } from './services/api';
import { supabaseSignIn, supabaseRestore, supabaseSignOut } from './services/supabase';
import { dataSync } from './services/dataSync';
import { LivestockItem, UserProfile } from './types';

const DashboardOverview = lazy(() => import('./components/dashboard/DashboardOverview').then(module => ({ default: module.DashboardOverview })));
const LivestockDatabaseView = lazy(() => import('./components/livestock/LivestockDatabaseView').then(module => ({ default: module.LivestockDatabaseView })));
const LivestockFormModal = lazy(() => import('./components/livestock/LivestockFormModal').then(module => ({ default: module.LivestockFormModal })));
const LivestockDetailModal = lazy(() => import('./components/livestock/LivestockDetailModal').then(module => ({ default: module.LivestockDetailModal })));
const LivestockImportModal = lazy(() => import('./components/livestock/LivestockImportModal').then(module => ({ default: module.LivestockImportModal })));
const HealthManagementView = lazy(() => import('./components/health/HealthManagementView').then(module => ({ default: module.HealthManagementView })));
const BirthsDeathsView = lazy(() => import('./components/births-deaths/BirthsDeathsView').then(module => ({ default: module.BirthsDeathsView })));
const PurchasesSalesView = lazy(() => import('./components/transactions/PurchasesSalesView').then(module => ({ default: module.PurchasesSalesView })));
const SalesResultsView = lazy(() => import('./components/sales-results/SalesResultsView').then(module => ({ default: module.SalesResultsView })));
const ExpenseManagementView = lazy(() => import('./components/expenses/ExpenseManagementView').then(module => ({ default: module.ExpenseManagementView })));
const FeedManagementView = lazy(() => import('./components/feed/FeedManagementView').then(module => ({ default: module.FeedManagementView })));
const WeightMonitoringView = lazy(() => import('./components/weight/WeightMonitoringView').then(module => ({ default: module.WeightMonitoringView })));
const NotificationsView = lazy(() => import('./components/notifications/NotificationsView').then(module => ({ default: module.NotificationsView })));
const FinanceView = lazy(() => import('./components/finance/FinanceView').then(module => ({ default: module.FinanceView })));
const DailyReportsView = lazy(() => import('./components/daily-reports/DailyReportsView').then(module => ({ default: module.DailyReportsView })));
const ReportsExportView = lazy(() => import('./components/reports/ReportsExportView').then(module => ({ default: module.ReportsExportView })));
const UserManagementView = lazy(() => import('./components/users/UserManagementView').then(module => ({ default: module.UserManagementView })));
const SettingsView = lazy(() => import('./components/settings/SettingsView').then(module => ({ default: module.SettingsView })));
const FinancialDocumentsView = lazy(() => import('./components/finance/FinancialDocumentsView').then(module => ({ default: module.FinancialDocumentsView })));
const QuickActionsModal = lazy(() => import('./components/layout/QuickActionsModal').then(module => ({ default: module.QuickActionsModal })));
// Divisi baru (agro multi-divisi)
const FinanceDashboardView = lazy(() => import('./components/agro/FinanceDashboardView').then(module => ({ default: module.FinanceDashboardView })));
const ApprovalCenterView = lazy(() => import('./components/agro/ApprovalCenterView').then(module => ({ default: module.ApprovalCenterView })));
const CashFlowView = lazy(() => import('./components/agro/CashFlowView').then(module => ({ default: module.CashFlowView })));
const LpjView = lazy(() => import('./components/agro/LpjView').then(module => ({ default: module.LpjView })));
const CropLongTermView = lazy(() => import('./components/agro/CropLongTermView').then(module => ({ default: module.CropLongTermView })));
const CropShortTermView = lazy(() => import('./components/agro/CropShortTermView').then(module => ({ default: module.CropShortTermView })));
const CropActivityView = lazy(() => import('./components/agro/CropActivityView').then(module => ({ default: module.CropActivityView })));
const GardenDocumentsView = lazy(() => import('./components/agro/GardenDocumentsView').then(module => ({ default: module.GardenDocumentsView })));
const LivestockDocumentsView = lazy(() => import('./components/agro/LivestockDocumentsView').then(module => ({ default: module.LivestockDocumentsView })));
const PondsView = lazy(() => import('./components/agro/PondsView').then(module => ({ default: module.PondsView })));
const WaterQualityView = lazy(() => import('./components/agro/WaterQualityView').then(module => ({ default: module.WaterQualityView })));
const FishFeedView = lazy(() => import('./components/agro/FishFeedView').then(module => ({ default: module.FishFeedView })));
const FishHarvestView = lazy(() => import('./components/agro/FishHarvestView').then(module => ({ default: module.FishHarvestView })));
const FishDocumentsView = lazy(() => import('./components/agro/FishDocumentsView').then(module => ({ default: module.FishDocumentsView })));
const WildlifeView = lazy(() => import('./components/agro/WildlifeView').then(module => ({ default: module.WildlifeView })));
const WildlifeFeedView = lazy(() => import('./components/agro/WildlifeFeedView').then(module => ({ default: module.WildlifeFeedView })));
const InventoryView = lazy(() => import('./components/agro/InventoryView').then(module => ({ default: module.InventoryView })));
const PurchaseRequestView = lazy(() => import('./components/agro/PurchaseRequestView').then(module => ({ default: module.PurchaseRequestView })));
const PurchaseOrderView = lazy(() => import('./components/agro/PurchaseOrderView').then(module => ({ default: module.PurchaseOrderView })));
const DailyReportView = lazy(() => import('./components/agro/DailyReportView').then(module => ({ default: module.DailyReportView })));
const TaskManagementView = lazy(() => import('./components/agro/TaskManagementView').then(module => ({ default: module.TaskManagementView })));
const AttendanceView = lazy(() => import('./components/agro/AttendanceView').then(module => ({ default: module.AttendanceView })));
const KpiView = lazy(() => import('./components/agro/KpiView').then(module => ({ default: module.KpiView })));
const MasterDataView = lazy(() => import('./components/agro/MasterDataView').then(module => ({ default: module.MasterDataView })));
const AuditTrailView = lazy(() => import('./components/agro/AuditTrailView').then(module => ({ default: module.AuditTrailView })));

const PageLoader = () => (
  <div className="flex min-h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white/70 text-[#123D18]">
    <div className="text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /><p className="mt-2 text-xs font-bold text-slate-500">Memuat modul...</p></div>
  </div>
);

type AuthState = 'checking' | 'authenticated' | 'guest';

export function App() {
  const workspaceMainRef = useRef<HTMLElement>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [currentUser, setCurrentUser] = useState(storeService.currentUser);
  const [globalSearch, setGlobalSearch] = useState('');
  const [authState, setAuthState] = useState<AuthState>('checking');
  const [showPublicCatalog, setShowPublicCatalog] = useState(false);
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [isAddLivestockOpen, setIsAddLivestockOpen] = useState(false);
  const [editLivestockItem, setEditLivestockItem] = useState<LivestockItem | null>(null);
  const [detailLivestockItem, setDetailLivestockItem] = useState<LivestockItem | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = storeService.subscribe(() => {
      setCurrentUser(storeService.currentUser);
    });
    const handleUnauthorized = () => setAuthState('guest');
    window.addEventListener('auth:unauthorized', handleUnauthorized);

    const restoreSession = async () => {
      // 1) Supabase session (persisted by supabase-js in localStorage).
      const supabaseResult = await supabaseRestore();
      if (supabaseResult?.ok) {
        storeService.setCurrentUser(supabaseResult.user);
        void dataSync.enable();
        setActiveTab(supabaseResult.user.role === 'MITRA' ? 'livestock' : 'dashboard');
        setAuthState('authenticated');
        return;
      }

      // 2) Backend legacy token (tanpa fallback demo statis).
      const token = authSession.getToken();
      if (!token) {
        setAuthState('guest');
        return;
      }
      try {
        const response = await authAPI.getProfile();
        const profile = response.data?.data as UserProfile | undefined;
        if (!profile?.uid || !profile.role) throw new Error('Respons profil pengguna tidak valid.');
        storeService.setCurrentUser(profile);
        setAuthState('authenticated');
      } catch {
        authSession.clear();
        setAuthState('guest');
      }
    };
    void restoreSession();

    return () => {
      unsubscribe();
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  useEffect(() => {
    if (currentUser.role === 'USER' && activeTab !== 'catalog') {
      setActiveTab('catalog');
    } else if (currentUser.role !== 'USER' && activeTab === 'catalog') {
      setActiveTab('dashboard');
    } else if (currentUser.role !== 'USER' && !canAccess(currentUser.role, activeTab as never)) {
      const firstAllowed = ['dashboard', 'livestock', 'finance', 'feed'].find(tab => canAccess(currentUser.role, tab as never));
      if (firstAllowed && activeTab !== firstAllowed) setActiveTab(firstAllowed);
    }
  }, [activeTab, currentUser.role]);

  useEffect(() => {
    workspaceMainRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  }, [activeTab]);

  const handleLogin = async (email: string, password: string) => {
    // 1) Supabase Auth (email + password sungguhan).
    const supabaseResult = await supabaseSignIn(email, password);
    if (supabaseResult) {
      if (supabaseResult.ok) {
        authSession.setToken(supabaseResult.token);
        storeService.setCurrentUser(supabaseResult.user);
        void dataSync.enable();
        setActiveTab(supabaseResult.user.role === 'MITRA' ? 'livestock' : 'dashboard');
        setAuthState('authenticated');
        return;
      }
      throw new Error((supabaseResult as { ok: false; error: string }).error);
    }

    // 2) Backend legacy (dinonaktifkan pada produksi Supabase; tanpa fallback demo).
    try {
      const response = await authAPI.login(email, password);
      const { token, user } = response.data.data as { token: string; user: UserProfile };
      authSession.setToken(token);
      storeService.setCurrentUser(user);
      setActiveTab(user.role === 'USER' ? 'catalog' : 'dashboard');
      setAuthState('authenticated');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Tidak dapat terhubung ke server. Periksa koneksi lalu coba kembali.';
      throw new Error(message);
    }
  };

  const handleLogout = async () => {
    try {
      await supabaseSignOut();
      await authAPI.logout();
    } catch {
      // Local session must still be cleared when the server cannot be reached.
    } finally {
      authSession.clear();
      setActiveTab('dashboard');
      setIsMobileMenuOpen(false);
      setAuthState('guest');
    }
  };

  const handleSelectQuickAction = (actionKey: string) => {
    if (actionKey === 'add-daily-report') {
      setActiveTab('daily-reports');
    } else if (actionKey === 'add-health') {
      setActiveTab('health');
    } else if (actionKey === 'add-birth') {
      setActiveTab('births-deaths');
    } else if (actionKey === 'add-death') {
      setActiveTab('births-deaths');
    } else if (actionKey === 'add-weight') {
      setActiveTab('weight');
    } else if (actionKey === 'add-feed') {
      setActiveTab('feed');
    } else if (actionKey === 'add-finance') {
      setActiveTab('finance');
    } else if (actionKey === 'add-livestock') {
      setEditLivestockItem(null);
      setIsAddLivestockOpen(true);
    }
  };

  if (authState === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-[#123D18]">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin" />
          <p className="mt-3 text-xs font-bold">Memeriksa sesi pengguna...</p>
        </div>
      </div>
    );
  }

  if (authState === 'guest') {
    if (showPublicCatalog) {
      return (
        <div className="app-surface min-h-screen font-sans text-slate-800 antialiased">
          <header className="sticky top-0 z-30 border-b border-[#123D18]/8 bg-white/92 shadow-sm backdrop-blur-xl">
            <div className="mx-auto flex h-[4.5rem] max-w-screen-2xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
              <DutaAgriNusantaraLogo />
              <button
                type="button"
                onClick={() => setShowPublicCatalog(false)}
                className="flex min-h-10 items-center gap-2 rounded-xl bg-[#123D18] px-3.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#1B5E20] sm:px-4"
              >
                <LogIn className="h-4 w-4" /> <span className="hidden sm:inline">Login Pengelola</span><span className="sm:hidden">Login</span>
              </button>
            </div>
          </header>
          <main className="mx-auto w-full max-w-screen-2xl p-4 sm:p-6 lg:p-8">
            <SalesCatalogView />
          </main>
        </div>
      );
    }
    return <LoginPage onLogin={handleLogin} onOpenCatalog={() => setShowPublicCatalog(true)} />;
  }

  if (currentUser.role === 'USER') {
    return (
      <div className="app-surface min-h-screen font-sans text-slate-800 antialiased">
        <Navbar
          pageTitle="Katalog Penjualan"
          onOpenQuickAction={() => undefined}
          onSearchChange={query => setGlobalSearch(query)}
        onOpenUsers={() => undefined}
          onLogout={handleLogout}
        />
        <main className="mx-auto w-full max-w-screen-2xl p-4 sm:p-6 lg:p-8">
          <SalesCatalogView globalSearchQuery={globalSearch} />
        </main>
      </div>
    );
  }

  return (
    <div className="app-surface flex h-dvh min-h-screen flex-col overflow-hidden font-sans text-slate-800 antialiased selection:bg-[#123D18] selection:text-white">
      
      {/* Top Navbar */}
      <Navbar
        pageTitle={getNavigationLabel(activeTab)}
        onOpenMenu={() => setIsMobileMenuOpen(true)}
        onOpenQuickAction={() => setIsQuickActionOpen(true)}
        onSearchChange={query => setGlobalSearch(query)}
        onOpenUsers={() => setActiveTab('users')}
        onLogout={handleLogout}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Left Desktop Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          role={currentUser.role}
        />

        {/* Main Content Area */}
        <main ref={workspaceMainRef} className="workspace-main scrollbar-subtle min-w-0 flex-1 overflow-y-auto px-3 py-4 pb-28 sm:px-5 sm:py-5 lg:px-7 lg:py-6 lg:pb-8 2xl:px-10">
          <div className="mx-auto w-full max-w-[94rem]">
          <Suspense fallback={<PageLoader />}>
          
          {activeTab === 'dashboard' && (
            <DashboardOverview
              onOpenQuickAction={() => setIsQuickActionOpen(true)}
              onNavigateTab={tab => setActiveTab(tab)}
            />
          )}

          {activeTab === 'livestock' && (
            <LivestockDatabaseView
              onOpenAddModal={() => {
                setEditLivestockItem(null);
                setIsAddLivestockOpen(true);
              }}
              onOpenEditModal={item => {
                setEditLivestockItem(item);
                setIsAddLivestockOpen(true);
              }}
              onOpenImportModal={() => setIsImportModalOpen(true)}
              onOpenDetailModal={item => setDetailLivestockItem(item)}
              globalSearchQuery={globalSearch}
            />
          )}

          {activeTab === 'health' && <HealthManagementView />}
          {activeTab === 'births-deaths' && <BirthsDeathsView />}
          {activeTab === 'transactions' && canAccess(currentUser.role, 'transactions') && (
            <PurchasesSalesView
              onOpenAddLivestock={() => {
                setEditLivestockItem(null);
                setIsAddLivestockOpen(true);
              }}
            />
          )}
          {activeTab === 'sales-results' && canAccess(currentUser.role, 'sales-results') && <SalesResultsView />}
          {activeTab === 'expenses' && canAccess(currentUser.role, 'expenses') && <ExpenseManagementView onOpenFinance={() => setActiveTab('finance')} />}
          {activeTab === 'feed' && canAccess(currentUser.role, 'feed') && <FeedManagementView />}
          {activeTab === 'weight' && canAccess(currentUser.role, 'weight') && <WeightMonitoringView />}
          {activeTab === 'notifications' && canAccess(currentUser.role, 'notifications') && <NotificationsView />}
          {activeTab === 'finance' && canAccess(currentUser.role, 'finance') && <FinanceView />}
          {activeTab === 'daily-reports' && canAccess(currentUser.role, 'daily-reports') && <DailyReportsView />}
          {activeTab === 'reports' && canAccess(currentUser.role, 'reports') && <ReportsExportView />}
          {activeTab === 'users' && canAccess(currentUser.role, 'users') && <UserManagementView />}
          {activeTab === 'settings' && currentUser.role === 'OWNER' && <SettingsView />}
          {activeTab === 'invoices' && canAccess(currentUser.role, 'invoices') && <FinancialDocumentsView initialTab="funding" />}
          {/* Divisi baru (agro multi-divisi) */}
          {activeTab === 'finance-dashboard' && canAccess(currentUser.role, 'finance-dashboard') && <FinanceDashboardView />}
          {activeTab === 'approval-center' && canAccess(currentUser.role, 'approval-center') && <ApprovalCenterView />}
          {activeTab === 'cash-flow' && canAccess(currentUser.role, 'cash-flow') && <CashFlowView />}
          {activeTab === 'lpj' && canAccess(currentUser.role, 'lpj') && <LpjView />}
          {activeTab === 'crop-longterm' && canAccess(currentUser.role, 'crop-longterm') && <CropLongTermView />}
          {activeTab === 'crop-shortterm' && canAccess(currentUser.role, 'crop-shortterm') && <CropShortTermView />}
          {activeTab === 'crop-activity' && canAccess(currentUser.role, 'crop-activity') && <CropActivityView />}
          {activeTab === 'garden-docs' && canAccess(currentUser.role, 'garden-docs') && <GardenDocumentsView />}
          {activeTab === 'livestock-docs' && canAccess(currentUser.role, 'livestock-docs') && <LivestockDocumentsView />}
          {activeTab === 'ponds' && canAccess(currentUser.role, 'ponds') && <PondsView />}
          {activeTab === 'water-quality' && canAccess(currentUser.role, 'water-quality') && <WaterQualityView />}
          {activeTab === 'fish-feed' && canAccess(currentUser.role, 'fish-feed') && <FishFeedView />}
          {activeTab === 'fish-harvest' && canAccess(currentUser.role, 'fish-harvest') && <FishHarvestView />}
          {activeTab === 'fish-docs' && canAccess(currentUser.role, 'fish-docs') && <FishDocumentsView />}
          {activeTab === 'wildlife' && canAccess(currentUser.role, 'wildlife') && <WildlifeView />}
          {activeTab === 'wildlife-feed' && canAccess(currentUser.role, 'wildlife-feed') && <WildlifeFeedView />}
          {activeTab === 'inventory' && canAccess(currentUser.role, 'inventory') && <InventoryView />}
          {activeTab === 'purchase-request' && canAccess(currentUser.role, 'purchase-request') && <PurchaseRequestView />}
          {activeTab === 'purchase-order' && canAccess(currentUser.role, 'purchase-order') && <PurchaseOrderView />}
          {activeTab === 'daily-report' && canAccess(currentUser.role, 'daily-report') && <DailyReportView />}
          {activeTab === 'task-management' && canAccess(currentUser.role, 'task-management') && <TaskManagementView />}
          {activeTab === 'attendance' && canAccess(currentUser.role, 'attendance') && <AttendanceView />}
          {activeTab === 'kpi' && canAccess(currentUser.role, 'kpi') && <KpiView />}
          {activeTab === 'master-data' && canAccess(currentUser.role, 'master-data') && <MasterDataView />}
          {activeTab === 'audit-trail' && canAccess(currentUser.role, 'audit-trail') && <AuditTrailView />}
          </Suspense>

          <footer className="mt-8 flex flex-col items-center gap-1 border-t border-[#E2E8F0] pt-5 pb-2 text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#1B5E20]">PT DUTA AGRI NUSANTARA</p>
            <p className="text-[10px] text-slate-400">One Land. One System. One Future.</p>
          </footer>

          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenQuickAction={() => setIsQuickActionOpen(true)}
        role={currentUser.role}
      />

      <MobileNavigationDrawer
        isOpen={isMobileMenuOpen}
        activeTab={activeTab}
        currentUser={currentUser}
        onClose={() => setIsMobileMenuOpen(false)}
        onNavigate={setActiveTab}
        onSearchChange={setGlobalSearch}
        onLogout={handleLogout}
      />

      {/* MODALS */}
      <Suspense fallback={null}>
        {isQuickActionOpen && canEdit(currentUser.role) && <QuickActionsModal isOpen onClose={() => setIsQuickActionOpen(false)} onSelectAction={handleSelectQuickAction} />}
        {isAddLivestockOpen && canEdit(currentUser.role) && <LivestockFormModal isOpen onClose={() => setIsAddLivestockOpen(false)} editItem={editLivestockItem} />}
        {detailLivestockItem && <LivestockDetailModal isOpen onClose={() => setDetailLivestockItem(null)} livestock={detailLivestockItem} />}
        {isImportModalOpen && canEdit(currentUser.role) && <LivestockImportModal isOpen onClose={() => setIsImportModalOpen(false)} />}
      </Suspense>

    </div>
  );
}

export default App;
