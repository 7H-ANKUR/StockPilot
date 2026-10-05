'use client';

import React, { useState } from 'react';
import { FileSpreadsheet, Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ExportButtonProps {
  type: 'inventory' | 'purchase-orders' | 'gst' | 'abc-xyz' | 'suppliers' | 'transfers' | 'expiry';
  label?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function ExportButton({
  type,
  label = 'Export XLSX',
  variant = 'outline',
  size = 'sm',
  className = '',
}: ExportButtonProps) {
  const [downloading, setDownloading] = useState(false);

  const handleExport = async () => {
    try {
      setDownloading(true);
      const res = await fetch(`/api/v1/export/${type}`);
      if (!res.ok) {
        throw new Error('Export generation failed');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const dateStr = new Date().toISOString().split('T')[0];
      a.download = `stockpilot_${type}_${dateStr}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Failed to export:', err);
      alert(err.message || 'Error exporting spreadsheet');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      disabled={downloading}
      onClick={handleExport}
      className={`gap-1.5 font-medium transition-all ${className}`}
    >
      {downloading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
      ) : (
        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
      )}
      <span>{downloading ? 'Generating...' : label}</span>
    </Button>
  );
}
