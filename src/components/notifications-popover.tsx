'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Popover, PopoverContent, PopoverTrigger
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bell, Check, Trash2, AlertTriangle, AlertCircle,
  Info, Sparkles, Volume2, VolumeX, X
} from 'lucide-react';
import type { PageKey } from '@/app/page';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  isRead: boolean;
  resourceType?: string | null;
  resourceId?: string | null;
  createdAt: string;
}

export function NotificationsPopover({
  onNavigate,
}: {
  onNavigate?: (page: PageKey) => void;
}) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const prevUnreadRef = useRef(0);

  // Play pleasant synthesized chime using Web Audio API
  const playChime = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // AudioContext muted/unsupported
    }
  }, [soundEnabled]);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/notifications?limit=20');
      const data = await res.json();
      if (data.notifications) {
        setNotifications(data.notifications);
        setUnreadCount(data.totalUnread || 0);

        // If new notifications arrived, play gentle chime
        if (data.totalUnread > prevUnreadRef.current && prevUnreadRef.current > 0) {
          playChime();
        }
        prevUnreadRef.current = data.totalUnread || 0;

        // Cache locally for offline resilience
        try {
          localStorage.setItem('sp_cached_notifications', JSON.stringify(data.notifications));
          localStorage.setItem('sp_cached_unread', String(data.totalUnread));
        } catch {}
      }
    } catch {
      // Offline fallback: load from local storage
      try {
        const cached = localStorage.getItem('sp_cached_notifications');
        const cachedUnread = localStorage.getItem('sp_cached_unread');
        if (cached) {
          setNotifications(JSON.parse(cached));
          setUnreadCount(Number(cachedUnread) || 0);
        }
      } catch {}
    }
  }, [playChime]);

  useEffect(() => {
    loadNotifications();
    // Poll every 30s for background delta sync
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const handleMarkAllRead = async () => {
    // Optimistic UI update
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await fetch('/api/v1/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
    } catch {}
  };

  const handleClickItem = async (item: NotificationItem) => {
    if (!item.isRead) {
      setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, isRead: true } : n));
      setUnreadCount(c => Math.max(0, c - 1));
      try {
        await fetch('/api/v1/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: [item.id] }),
        });
      } catch {}
    }

    setOpen(false);

    // Deep-link navigation
    if (onNavigate) {
      if (item.resourceType === 'PRODUCT' || item.type === 'STOCKOUT_ALERT') {
        onNavigate('inventory');
      } else if (item.resourceType === 'RECOMMENDATION') {
        onNavigate('recommendations');
      } else if (item.resourceType === 'PURCHASE_ORDER') {
        onNavigate('purchase-orders');
      }
    }
  };

  const handleDismiss = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setNotifications(prev => prev.filter(n => n.id !== id));
    try {
      await fetch(`/api/v1/notifications?id=${id}`, { method: 'DELETE' });
    } catch {}
  };

  const handleClearRead = async () => {
    setNotifications(prev => prev.filter(n => !n.isRead));
    try {
      await fetch('/api/v1/notifications', { method: 'DELETE' });
    } catch {}
  };

  const getSeverityIcon = (severity: string, type: string) => {
    if (severity === 'CRITICAL') {
      return <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />;
    }
    if (severity === 'WARNING') {
      return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />;
    }
    if (type === 'SYSTEM') {
      return <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />;
    }
    return <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="p-2 hover:bg-muted rounded-md relative text-foreground/80 hover:text-foreground transition-colors cursor-pointer"
          aria-label="View notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-sm animate-pulse-soft">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-80 sm:w-96 p-0 shadow-lg border-border/80 bg-card/95 backdrop-blur-md"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/80">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                {unreadCount} new
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1 text-muted-foreground hover:text-foreground rounded"
              title={soundEnabled ? 'Mute sound alerts' : 'Enable sound alerts'}
            >
              {soundEnabled ? (
                <Volume2 className="w-3.5 h-3.5" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-muted-foreground/60" />
              )}
            </button>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllRead}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <Check className="w-3 h-3 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="max-h-[380px] overflow-y-auto divide-y divide-border/40">
          {notifications.map(item => (
            <div
              key={item.id}
              onClick={() => handleClickItem(item)}
              className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer text-left hover:bg-muted/50 ${
                !item.isRead ? 'bg-primary/5' : ''
              }`}
            >
              {getSeverityIcon(item.severity, item.type)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <h4 className={`text-xs truncate ${!item.isRead ? 'font-semibold text-foreground' : 'font-medium text-foreground/80'}`}>
                    {item.title}
                  </h4>
                  <button
                    onClick={e => handleDismiss(e, item.id)}
                    className="text-muted-foreground/50 hover:text-foreground p-0.5 rounded opacity-60 hover:opacity-100"
                    title="Dismiss"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                  {item.message}
                </p>
                <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground">
                  <span>
                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {item.resourceType && (
                    <span className="text-primary font-medium hover:underline">
                      View details →
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {notifications.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <div className="text-xs font-medium">No notifications</div>
              <div className="text-[11px] mt-0.5">Everything is operating smoothly.</div>
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.some(n => n.isRead) && (
          <div className="p-2 border-t border-border/80 bg-muted/20 text-center">
            <button
              onClick={handleClearRead}
              className="text-[11px] text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 w-full py-1"
            >
              <Trash2 className="w-3 h-3" />
              Clear read notifications
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
