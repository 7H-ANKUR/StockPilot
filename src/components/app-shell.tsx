'use client';

import { useState } from 'react';
import {
  LayoutDashboard,
  Package,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  MessageSquare,
  Calendar,
  Truck,
  ShoppingCart,
  BarChart3,
  Receipt,
  FileClock,
  Brain,
  Database,
  Store,
  Menu,
  X,
  Bell,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PageKey } from '@/app/page';

interface NavItem {
  key: PageKey;
  label: string;
  icon: any;
  group: 'main' | 'intelligence' | 'ops' | 'system';
  badge?: string;
}

const NAV: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'main' },
  { key: 'inventory', label: 'Inventory', icon: Package, group: 'main' },
  { key: 'forecasting', label: 'Forecasting', icon: TrendingUp, group: 'intelligence' },
  { key: 'risks', label: 'Risk Monitor', icon: AlertTriangle, group: 'intelligence' },
  { key: 'recommendations', label: 'Recommendations', icon: Sparkles, group: 'intelligence' },
  { key: 'agent', label: 'Agent Chat', icon: MessageSquare, group: 'intelligence' },
  { key: 'festivals', label: 'Festivals', icon: Calendar, group: 'ops' },
  { key: 'suppliers', label: 'Suppliers', icon: Truck, group: 'ops' },
  { key: 'purchase-orders', label: 'Purchase Orders', icon: ShoppingCart, group: 'ops' },
  { key: 'analytics', label: 'Analytics', icon: BarChart3, group: 'ops' },
  { key: 'gst', label: 'GST Module', icon: Receipt, group: 'ops' },
  { key: 'audit', label: 'Audit Logs', icon: FileClock, group: 'system' },
  { key: 'models', label: 'Model Health', icon: Brain, group: 'system' },
  { key: 'data', label: 'Data Sources', icon: Database, group: 'system' },
];

const GROUPS: { id: NavItem['group']; label: string }[] = [
  { id: 'main', label: 'Overview' },
  { id: 'intelligence', label: 'AI Intelligence' },
  { id: 'ops', label: 'Operations' },
  { id: 'system', label: 'System' },
];

export function AppShell({
  currentPage,
  onPageChange,
  children,
}: {
  currentPage: PageKey;
  onPageChange: (p: PageKey) => void;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-gradient-hero">
      {/* Sidebar - desktop */}
      <aside
        className={cn(
          'fixed lg:sticky top-0 left-0 z-40 h-screen w-72 shrink-0',
          'bg-sidebar text-sidebar-foreground',
          'border-r border-sidebar-border',
          'flex flex-col',
          'transition-transform duration-300',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-sidebar-border">
          <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <Store className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <div className="font-semibold text-sm leading-tight">AI Inventory</div>
            <div className="text-xs text-sidebar-foreground/60 leading-tight">Decision Agent</div>
          </div>
          <button
            className="ml-auto lg:hidden text-sidebar-foreground/70"
            onClick={() => setMobileOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-4">
          {GROUPS.map((g) => (
            <div key={g.id}>
              <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                {g.label}
              </div>
              <div className="space-y-0.5 mt-1">
                {NAV.filter((n) => n.group === g.id).map((item) => {
                  const Icon = item.icon;
                  const active = currentPage === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => {
                        onPageChange(item.key);
                        setMobileOpen(false);
                      }}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                        'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                        active && 'bg-sidebar-primary text-sidebar-primary-foreground font-medium hover:bg-sidebar-primary hover:text-sidebar-primary-foreground'
                      )}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="flex-1 text-left truncate">{item.label}</span>
                      {item.badge && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-sidebar-accent text-sidebar-accent-foreground">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-sidebar-border">
          <div className="px-3 py-2 rounded-md bg-sidebar-accent/50">
            <div className="text-xs font-medium text-sidebar-accent-foreground">Demo Manager</div>
            <div className="text-[10px] text-sidebar-foreground/60">manager@demo.in · MANAGER</div>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-20 h-16 border-b border-border bg-background/80 backdrop-blur-md flex items-center px-4 lg:px-6 gap-3">
          <button
            className="lg:hidden p-2 hover:bg-muted rounded-md"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="font-semibold text-base capitalize">
              {NAV.find((n) => n.key === currentPage)?.label}
            </h1>
          </div>
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-soft" />
            System Online
          </div>
          <button className="p-2 hover:bg-muted rounded-md relative">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-destructive" />
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
