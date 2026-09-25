import React from 'react';
import { Database, LayoutDashboard, Plus, ReceiptText, ShoppingCart, Wallet, WalletCards, Wheat } from 'lucide-react';
import type { UserRole } from '../../types';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenQuickAction: () => void;
  role: UserRole;
}

const roleItems = (role: UserRole) => {
  if (role === 'MITRA') return [
    { id: 'livestock', label: 'Ternak', icon: Database },
    { id: 'feed', label: 'Pakan', icon: Wheat },
    { id: 'invoices', label: 'Dana', icon: WalletCards },
  ];
  if (role === 'ACCOUNTANT') return [
    { id: 'dashboard', label: 'Beranda', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transaksi', icon: ShoppingCart },
    { id: 'invoices', label: 'Invoice', icon: ReceiptText },
    { id: 'finance', label: 'Laba Rugi', icon: Wallet },
  ];
  if (role === 'MANAGER') return [
    { id: 'dashboard', label: 'Beranda', icon: LayoutDashboard },
    { id: 'livestock', label: 'Ternak', icon: Database },
    { id: 'invoices', label: 'Dana', icon: WalletCards },
    { id: 'finance', label: 'Laba Rugi', icon: Wallet },
  ];
  return [
    { id: 'dashboard', label: 'Beranda', icon: LayoutDashboard },
    { id: 'livestock', label: 'Ternak', icon: Database },
    { id: 'daily-reports', label: 'Laporan', icon: ReceiptText },
    { id: 'invoices', label: 'Dana', icon: WalletCards },
  ];
};

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab, onOpenQuickAction, role }) => {
  const items = roleItems(role);
  const splitIndex = Math.min(2, items.length);
  const renderItem = (item: (typeof items)[number]) => {
    const Icon = item.icon; const isActive = activeTab === item.id;
    return <button key={item.id} type="button" onClick={() => setActiveTab(item.id)} aria-current={isActive ? 'page' : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-bold transition ${isActive ? 'text-[#1B5E20]' : 'text-slate-400'}`}><span className={`rounded-lg p-1 ${isActive ? 'bg-[#F1F5F9]' : ''}`}><Icon className="h-5 w-5" /></span><span>{item.label}</span></button>;
  };
  return <nav aria-label="Navigasi cepat" className="app-bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-[#1B5E20]/15 bg-white/95 px-2 pt-1.5 shadow-[0_-12px_30px_rgba(15,50,38,0.1)] backdrop-blur-xl lg:hidden">
    <div className="mx-auto grid max-w-lg grid-cols-5 items-end">
      {items.slice(0, splitIndex).map(renderItem)}
      <button type="button" onClick={onOpenQuickAction} className="group flex min-h-14 flex-col items-center justify-end gap-1 text-[10px] font-bold text-[#1B5E20]" aria-label="Tambah catatan baru"><span className="flex h-12 w-12 -translate-y-2 items-center justify-center rounded-2xl bg-[#1B5E20] text-white shadow-lg shadow-[#1B5E20]/20 ring-4 ring-[#FFFFFF] transition active:scale-95"><Plus className="h-6 w-6" /></span><span className="-mt-2">Tambah</span></button>
      {items.slice(splitIndex).map(renderItem)}
    </div>
  </nav>;
};
