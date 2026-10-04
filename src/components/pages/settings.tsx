'use client';

import { useState, useEffect } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Building2, Sliders, Bell, Wifi, ShieldAlert,
  Save, RefreshCw, CheckCircle2, Cloud
} from 'lucide-react';

export function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    gstin: '',
    address: '',
    phone: '',
    email: '',
    currency: 'INR',
    operationalSettings: {
      reorderThresholdDays: 7,
      safetyStockMultiplier: 1.5,
      festivalBufferPct: 25,
      autoApproveLowValuePO: false,
      autoApproveLimit: 10000,
      offlineSyncEnabled: true,
      notifications: {
        stockoutAlerts: true,
        poStatusAlerts: true,
        soundEnabled: true,
        dailyDigest: false,
      },
    },
  });

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/settings');
      const data = await res.json();
      if (data.settings) {
        setFormData({
          name: data.settings.name || '',
          code: data.settings.code || '',
          gstin: data.settings.gstin || '',
          address: data.settings.address || '',
          phone: data.settings.phone || '',
          email: data.settings.email || '',
          currency: data.settings.currency || 'INR',
          operationalSettings: data.settings.operationalSettings || formData.operationalSettings,
        });
      }
    } catch (e: any) {
      toast({
        title: 'Error loading settings',
        description: e.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/v1/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.error) {
        toast({
          title: 'Update failed',
          description: data.error,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Settings saved',
          description: 'Tenant profile and operational parameters updated successfully.',
        });
      }
    } catch (e: any) {
      toast({
        title: 'Network error',
        description: e.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-28 bg-muted/40 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-64 bg-muted/40 rounded-lg" />
          <div className="h-64 bg-muted/40 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Top Banner & Status */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border bg-card/60 backdrop-blur-sm shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">System & Tenant Settings</h1>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
              Tenant ID: {formData.code || 'DEMO'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure store metadata, automated reorder thresholds, festival demand buffers, and sync mode.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadSettings}
            disabled={saving}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Reload
          </Button>
          <Button type="submit" size="sm" disabled={saving}>
            <Save className="w-3.5 h-3.5 mr-1.5" />
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Store Profile & Operational Parameters */}
        <div className="lg:col-span-2 space-y-6">
          {/* Store / Entity Profile */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                Store & Enterprise Profile
              </CardTitle>
              <CardDescription>
                Business identification details printed on purchase orders and tax invoices.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Company / Business Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="e.g. RetailMart India Pvt Ltd"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Store / Tenant Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm uppercase focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="e.g. DEMO-001"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">GSTIN (India GST Number)</label>
                  <input
                    type="text"
                    value={formData.gstin || ''}
                    onChange={e => setFormData({ ...formData, gstin: e.target.value })}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm uppercase font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="e.g. 27ABCDE1234F1Z5"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Operational Currency</label>
                  <select
                    value={formData.currency}
                    onChange={e => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="INR">₹ INR (Indian Rupee)</option>
                    <option value="USD">$ USD (US Dollar)</option>
                    <option value="EUR">€ EUR (Euro)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Contact Email</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="manager@store.in"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phone || ''}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Store Address</label>
                <textarea
                  rows={2}
                  value={formData.address || ''}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className="w-full p-2.5 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Plot 42, Commercial Sector, Bengaluru, Karnataka"
                />
              </div>
            </CardContent>
          </Card>

          {/* Reorder & Optimization Parameters */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sliders className="w-4 h-4 text-primary" />
                Inventory & Reorder Optimization Rules
              </CardTitle>
              <CardDescription>
                Control thresholds used by the ML engine to recommend purchase quantities.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-medium text-foreground">Reorder Review Horizon</label>
                    <span className="text-xs font-mono text-primary font-bold">
                      {formData.operationalSettings.reorderThresholdDays} Days
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    step="1"
                    value={formData.operationalSettings.reorderThresholdDays}
                    onChange={e => setFormData({
                      ...formData,
                      operationalSettings: {
                        ...formData.operationalSettings,
                        reorderThresholdDays: Number(e.target.value),
                      },
                    })}
                    className="w-full accent-primary"
                  />
                  <p className="text-xs text-muted-foreground">
                    Number of days of anticipated sales demand to cover when stock hits reorder point.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-medium text-foreground">Safety Stock Buffer Multiplier</label>
                    <span className="text-xs font-mono text-primary font-bold">
                      {formData.operationalSettings.safetyStockMultiplier}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="2.5"
                    step="0.1"
                    value={formData.operationalSettings.safetyStockMultiplier}
                    onChange={e => setFormData({
                      ...formData,
                      operationalSettings: {
                        ...formData.operationalSettings,
                        safetyStockMultiplier: Number(e.target.value),
                      },
                    })}
                    className="w-full accent-primary"
                  />
                  <p className="text-xs text-muted-foreground">
                    Multiplier applied over lead-time demand volatility to guard against unexpected stockouts.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2 border-t">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-medium text-foreground">Default Festival Uplift Buffer</label>
                    <span className="text-xs font-mono text-primary font-bold">
                      +{formData.operationalSettings.festivalBufferPct}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="80"
                    step="5"
                    value={formData.operationalSettings.festivalBufferPct}
                    onChange={e => setFormData({
                      ...formData,
                      operationalSettings: {
                        ...formData.operationalSettings,
                        festivalBufferPct: Number(e.target.value),
                      },
                    })}
                    className="w-full accent-primary"
                  />
                  <p className="text-xs text-muted-foreground">
                    Baseline festive inventory boost applied to confectionery, gift items, and Pooja goods during major festivals.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-foreground">Auto-Approval Threshold</label>
                    <span className="text-xs font-mono text-primary font-bold">
                      ₹{formData.operationalSettings.autoApproveLimit.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="autoApproveToggle"
                      checked={formData.operationalSettings.autoApproveLowValuePO}
                      onChange={e => setFormData({
                        ...formData,
                        operationalSettings: {
                          ...formData.operationalSettings,
                          autoApproveLowValuePO: e.target.checked,
                        },
                      })}
                      className="rounded border-input text-primary focus:ring-primary w-4 h-4"
                    />
                    <label htmlFor="autoApproveToggle" className="text-xs text-muted-foreground cursor-pointer">
                      Auto-approve draft POs below threshold without manual manager signature
                    </label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column (1 Col): System Sync, Offline & Notifications */}
        <div className="space-y-6">
          {/* Hybrid Offline Resilience Card */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Wifi className="w-4 h-4 text-primary" />
                Hybrid Offline Resilience
              </CardTitle>
              <CardDescription>
                StockPilot continues operational billing and draft reorders even when internet cuts off.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3.5">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-background/80 border text-xs">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Local Store SQLite / Cache
                </span>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                  Online & Active
                </Badge>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-background/80 border text-xs">
                <span className="flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-primary" />
                  Supabase Cloud Backend
                </span>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[10px]">
                  Sync Ready
                </Badge>
              </div>

              <div className="pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Automatic Delta Sync</span>
                  <input
                    type="checkbox"
                    checked={formData.operationalSettings.offlineSyncEnabled}
                    onChange={e => setFormData({
                      ...formData,
                      operationalSettings: {
                        ...formData.operationalSettings,
                        offlineSyncEnabled: e.target.checked,
                      },
                    })}
                    className="rounded border-input text-primary focus:ring-primary w-4 h-4"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Replays queued store actions and reconciles stockout alerts immediately when connection is restored.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Alert & Sound Notifications */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Customize triggers and channels for urgent operational alerts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b">
                <div>
                  <div className="font-medium">Critical Stockout Warnings</div>
                  <div className="text-[11px] text-muted-foreground">Alert when stock falls below lead-time demand</div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.operationalSettings.notifications.stockoutAlerts}
                  onChange={e => setFormData({
                    ...formData,
                    operationalSettings: {
                      ...formData.operationalSettings,
                      notifications: {
                        ...formData.operationalSettings.notifications,
                        stockoutAlerts: e.target.checked,
                      },
                    },
                  })}
                  className="rounded border-input text-primary focus:ring-primary w-4 h-4"
                />
              </div>

              <div className="flex items-center justify-between py-1.5 border-b">
                <div>
                  <div className="font-medium">PO Status & Approval Alerts</div>
                  <div className="text-[11px] text-muted-foreground">Notify when purchase orders require approval or change state</div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.operationalSettings.notifications.poStatusAlerts}
                  onChange={e => setFormData({
                    ...formData,
                    operationalSettings: {
                      ...formData.operationalSettings,
                      notifications: {
                        ...formData.operationalSettings.notifications,
                        poStatusAlerts: e.target.checked,
                      },
                    },
                  })}
                  className="rounded border-input text-primary focus:ring-primary w-4 h-4"
                />
              </div>

              <div className="flex items-center justify-between py-1.5 border-b">
                <div>
                  <div className="font-medium">Chime & Sound Effects</div>
                  <div className="text-[11px] text-muted-foreground">Play subtle chime on high-severity inventory alerts</div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.operationalSettings.notifications.soundEnabled}
                  onChange={e => setFormData({
                    ...formData,
                    operationalSettings: {
                      ...formData.operationalSettings,
                      notifications: {
                        ...formData.operationalSettings.notifications,
                        soundEnabled: e.target.checked,
                      },
                    },
                  })}
                  className="rounded border-input text-primary focus:ring-primary w-4 h-4"
                />
              </div>

              <div className="flex items-center justify-between py-1.5">
                <div>
                  <div className="font-medium">Daily Executive Digest</div>
                  <div className="text-[11px] text-muted-foreground">Morning summary of stock health & reorder needs</div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.operationalSettings.notifications.dailyDigest}
                  onChange={e => setFormData({
                    ...formData,
                    operationalSettings: {
                      ...formData.operationalSettings,
                      notifications: {
                        ...formData.operationalSettings.notifications,
                        dailyDigest: e.target.checked,
                      },
                    },
                  })}
                  className="rounded border-input text-primary focus:ring-primary w-4 h-4"
                />
              </div>
            </CardContent>
          </Card>

          {/* Quick Security Summary */}
          <Card className="border-border/60">
            <CardContent className="pt-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <div className="font-semibold text-foreground">Audit Logging Enabled</div>
                <div className="text-muted-foreground">All threshold changes and approvals are signed and logged immutably.</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
