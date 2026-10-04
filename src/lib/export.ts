import * as XLSX from 'xlsx';
import { db } from '@/lib/db';

export interface SheetDefinition {
  name: string;
  data: Record<string, any>[];
  columnWidths?: number[];
}

export function buildExcelBuffer(sheets: SheetDefinition[]): Buffer {
  const wb = XLSX.utils.book_new();

  for (const sheet of sheets) {
    const ws = XLSX.utils.json_to_sheet(sheet.data);
    if (sheet.columnWidths && sheet.columnWidths.length > 0) {
      ws['!cols'] = sheet.columnWidths.map(w => ({ wch: w }));
    }
    // Clean sheet name (max 31 chars, no invalid chars)
    const cleanName = sheet.name.replace(/[:\\/?*\[\]]/g, '').substring(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, cleanName);
  }

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

export async function generateInventoryExport(tenantId: string): Promise<Buffer> {
  const products = await db.product.findMany({
    where: { tenantId, isActive: true },
    include: {
      inventory: {
        orderBy: { snapshotDate: 'desc' },
        take: 1,
      }
    },
    orderBy: { category: 'asc' },
    take: 5000,
  });

  const rows = products.map((p) => {
    const snap = p.inventory[0];
    const onHand = snap ? snap.onHandQty : 0;
    const reorder = snap?.reorderPoint ?? 15;
    const maxStock = snap?.maxStock ?? 100;
    const value = +(onHand * p.sellingPrice).toFixed(2);
    const isRisk = onHand <= reorder;

    return {
      'SKU Code': p.sku,
      'Product Name': p.name,
      'Category': p.category || 'General',
      'Subcategory': p.subcategory || '-',
      'Selling Price (INR)': p.sellingPrice,
      'MRP (INR)': p.mrp,
      'GST Rate (%)': p.gstRate,
      'Stock On Hand': onHand,
      'Reorder Point': reorder,
      'Max Capacity': maxStock,
      'Inventory Value (INR)': value,
      'Perishable': p.isPerishable ? 'Yes' : 'No',
      'Shelf Life (Days)': p.shelfLifeDays || '-',
      'Stock Status': isRisk ? 'CRITICAL / LOW STOCK' : 'HEALTHY',
    };
  });

  return buildExcelBuffer([
    {
      name: 'Stock Inventory',
      data: rows,
      columnWidths: [15, 30, 20, 18, 16, 12, 12, 15, 14, 14, 20, 12, 16, 22],
    }
  ]);
}

export async function generatePurchaseOrdersExport(tenantId: string): Promise<Buffer> {
  const pos = await db.purchaseOrder.findMany({
    where: { tenantId },
    include: {
      supplier: true,
      store: true,
      lines: {
        include: { product: true }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 2000,
  });

  const poSummaryRows = pos.map((po) => ({
    'PO Number': po.poNumber,
    'Supplier': po.supplier.name,
    'Supplier GSTIN': po.supplier.gstin || 'N/A',
    'Destination Store': po.store.name,
    'Order Date': new Date(po.orderDate).toLocaleDateString('en-IN'),
    'Status': po.status,
    'Currency': po.currency,
    'Subtotal (INR)': po.subtotal,
    'Tax Amount (INR)': po.taxAmount,
    'Total Amount (INR)': po.estimatedTotal,
    'Line Items Count': po.lines.length,
  }));

  const poLinesRows: any[] = [];
  pos.forEach((po) => {
    po.lines.forEach((l) => {
      poLinesRows.push({
        'PO Number': po.poNumber,
        'SKU': l.product.sku,
        'Product Name': l.product.name,
        'Category': l.product.category || '-',
        'Order Quantity': l.quantity,
        'Unit Price (INR)': l.unitPrice,
        'Subtotal (INR)': l.subtotal,
        'GST Rate (%)': l.gstRate,
        'Tax (INR)': l.taxAmount,
        'Total (INR)': +(l.subtotal + l.taxAmount).toFixed(2),
      });
    });
  });

  return buildExcelBuffer([
    {
      name: 'Purchase Orders',
      data: poSummaryRows,
      columnWidths: [18, 28, 18, 25, 14, 16, 10, 15, 15, 18, 16],
    },
    {
      name: 'PO Line Items',
      data: poLinesRows,
      columnWidths: [18, 16, 30, 20, 14, 15, 15, 12, 12, 16],
    }
  ]);
}

export async function generateGstExport(tenantId: string): Promise<Buffer> {
  const txns = await db.gstTransaction.findMany({
    where: { tenantId },
    orderBy: { invoiceDate: 'desc' },
    take: 5000,
  });

  const rows = txns.map((t) => ({
    'Invoice Number': t.invoiceNumber || 'INV-DIRECT',
    'Invoice Date': new Date(t.invoiceDate).toLocaleDateString('en-IN'),
    'Type': t.transactionType,
    'Party GSTIN': t.partyGstin || 'URP (Unregistered)',
    'Party Name': t.partyName || 'Retail Customer',
    'Taxable Value (INR)': t.taxableValue,
    'GST Rate (%)': t.gstRate,
    'CGST (INR)': t.cgst,
    'SGST (INR)': t.sgst,
    'IGST (INR)': t.igst,
    'Total Invoice Amount (INR)': t.total,
  }));

  return buildExcelBuffer([
    {
      name: 'GSTR-1 & 3B Invoices',
      data: rows,
      columnWidths: [18, 14, 12, 18, 28, 18, 12, 12, 12, 12, 22],
    }
  ]);
}

export async function generateAbcXyzExport(tenantId: string): Promise<Buffer> {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const [products, sales] = await Promise.all([
    db.product.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, sku: true, name: true, category: true, sellingPrice: true },
    }),
    db.sale.findMany({
      where: {
        tenantId,
        saleTimestamp: { gte: ninetyDaysAgo },
      },
      select: { productId: true, netSales: true, quantity: true, saleTimestamp: true },
    })
  ]);

  const revMap = new Map<string, number>();
  const qtyMap = new Map<string, number>();
  const dailyMap = new Map<string, Map<string, number>>();

  for (const s of sales) {
    revMap.set(s.productId, (revMap.get(s.productId) || 0) + s.netSales);
    qtyMap.set(s.productId, (qtyMap.get(s.productId) || 0) + s.quantity);

    const dayKey = s.saleTimestamp.toISOString().split('T')[0];
    if (!dailyMap.has(s.productId)) {
      dailyMap.set(s.productId, new Map());
    }
    const pDays = dailyMap.get(s.productId)!;
    pDays.set(dayKey, (pDays.get(dayKey) || 0) + s.quantity);
  }

  let totalRev = 0;
  products.forEach(p => { totalRev += (revMap.get(p.id) || 0); });

  const sorted = products.map(p => {
    const rev = revMap.get(p.id) || 0;
    const pDays = dailyMap.get(p.id);
    let cv = 0.8;
    if (pDays && pDays.size > 2) {
      const vals = Array.from(pDays.values());
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const variance = vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / vals.length;
      const std = Math.sqrt(variance);
      cv = mean > 0 ? +(std / mean).toFixed(2) : 0;
    }
    return { ...p, revenue: rev, cv };
  }).sort((a, b) => b.revenue - a.revenue);

  let cumulative = 0;
  const rows = sorted.map(p => {
    cumulative += p.revenue;
    const share = totalRev > 0 ? (p.revenue / totalRev) * 100 : 0;
    const cumShare = totalRev > 0 ? (cumulative / totalRev) * 100 : 0;

    let abc = 'C';
    if (cumShare <= 80 || share > 2) abc = 'A';
    else if (cumShare <= 95 || share > 0.5) abc = 'B';

    let xyz = 'Z';
    if (p.cv <= 0.4) xyz = 'X';
    else if (p.cv <= 0.8) xyz = 'Y';

    const matrix = `${abc}${xyz}`;
    let policy = 'Order on demand';
    if (matrix === 'AX') policy = 'Automated continuous replenishment, tight safety buffer';
    else if (matrix === 'AY') policy = 'Weekly forecasting review, moderate safety stock';
    else if (matrix === 'AZ') policy = 'High safety buffer, supplier consignment buffer';
    else if (matrix === 'BX') policy = 'Standard reorder point system with monthly audit';
    else if (matrix === 'BY') policy = 'Bi-weekly dynamic reorders';
    else if (matrix === 'BZ') policy = 'Make/order to order or minimal batch sizing';
    else if (matrix === 'CX') policy = 'Bulk quarterly purchase for maximum vendor discount';
    else if (matrix === 'CY') policy = 'Periodic replenishment, monitor slow moving';
    else if (matrix === 'CZ') policy = 'Candidate for phase-out / discontinuation';

    return {
      'SKU Code': p.sku,
      'Product Name': p.name,
      'Category': p.category || 'General',
      '90-Day Revenue (INR)': +p.revenue.toFixed(2),
      'Revenue Share (%)': +share.toFixed(2),
      'Cumulative Share (%)': +cumShare.toFixed(2),
      'ABC Pareto Class': abc,
      'Sales CV (Volatility)': p.cv,
      'XYZ Volatility Class': xyz,
      '9-Cell Matrix': matrix,
      'Strategic Inventory Policy': policy,
    };
  });

  return buildExcelBuffer([
    {
      name: 'ABC-XYZ Matrix Analysis',
      data: rows,
      columnWidths: [15, 30, 20, 20, 16, 18, 15, 18, 18, 14, 40],
    }
  ]);
}

export async function generateSuppliersExport(tenantId: string): Promise<Buffer> {
  const suppliers = await db.supplier.findMany({
    where: { tenantId },
    include: {
      purchaseOrders: true,
      supplierProducts: true,
    },
    orderBy: { name: 'asc' },
  });

  const rows = suppliers.map(s => {
    const totalOrders = s.purchaseOrders.length;
    const fulfilled = s.purchaseOrders.filter(po => po.status === 'FULFILLED').length;
    const fulfillmentRate = totalOrders > 0 ? +((fulfilled / totalOrders) * 100).toFixed(1) : 100;
    const totalSpend = s.purchaseOrders.reduce((sum, po) => sum + (po.estimatedTotal || 0), 0);
    const reliability = +(s.reliabilityScore * 100).toFixed(0);

    let grade = 'B';
    if (reliability >= 95 && fulfillmentRate >= 95) grade = 'A+';
    else if (reliability >= 90) grade = 'A';
    else if (reliability >= 80) grade = 'B';
    else if (reliability >= 70) grade = 'C';
    else grade = 'D';

    return {
      'Supplier Code': s.code,
      'Supplier Name': s.name,
      'GSTIN': s.gstin || 'N/A',
      'Contract Lead Time (Days)': s.leadTimeDays,
      'Min Order Qty (MOQ)': s.minOrderQty,
      'Payment Terms': s.paymentTerms,
      'Catalog SKUs Count': s.supplierProducts.length,
      'Total Orders Placed': totalOrders,
      'Orders Fulfilled': fulfilled,
      'Fulfillment Rate (%)': fulfillmentRate,
      'Reliability Score (%)': reliability,
      'Performance Grade': grade,
      'Lifetime Spend (INR)': +totalSpend.toFixed(2),
    };
  });

  return buildExcelBuffer([
    {
      name: 'Supplier Performance',
      data: rows,
      columnWidths: [15, 28, 18, 22, 18, 16, 18, 18, 16, 18, 20, 16, 22],
    }
  ]);
}

export async function generateTransfersExport(tenantId: string): Promise<Buffer> {
  const transfers = await db.inventoryTransfer.findMany({
    where: { tenantId },
    include: {
      fromStore: true,
      toStore: true,
      lines: {
        include: { product: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  const rows: any[] = [];
  transfers.forEach(t => {
    t.lines.forEach(l => {
      rows.push({
        'Transfer #': t.transferNumber,
        'Source Store': t.fromStore.name,
        'Destination Store': t.toStore.name,
        'Status': t.status,
        'Request Date': new Date(t.requestDate).toLocaleDateString('en-IN'),
        'Completed Date': t.completedDate ? new Date(t.completedDate).toLocaleDateString('en-IN') : '-',
        'Requested By': t.requestedBy || 'Store User',
        'Approved By': t.approvedBy || '-',
        'SKU': l.product.sku,
        'Product Name': l.product.name,
        'Quantity': l.quantity,
        'Transfer Reason': l.reason || 'REBALANCE',
        'Logistics Notes': t.notes || '-',
      });
    });
  });

  return buildExcelBuffer([
    {
      name: 'Inter-Store Transfers',
      data: rows,
      columnWidths: [16, 25, 25, 14, 14, 15, 18, 18, 15, 28, 12, 20, 25],
    }
  ]);
}

export async function generateExpiryExport(tenantId: string): Promise<Buffer> {
  const batches = await db.inventoryBatch.findMany({
    where: { tenantId },
    include: {
      product: true,
      store: true,
    },
    orderBy: { expiryDate: 'asc' }
  });

  const now = new Date();
  const rows = batches.map(b => {
    const exp = new Date(b.expiryDate);
    const diff = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const totalValue = +(b.quantity * b.costPrice).toFixed(2);

    let status = 'ACTIVE';
    let recommendation = 'Standard FEFO Rotation';
    if (diff < 0) {
      status = 'EXPIRED';
      recommendation = 'Immediate Write-Off / Vendor Return';
    } else if (diff <= 7) {
      status = 'CRITICAL (≤ 7 Days)';
      recommendation = 'Urgent Clearance Discount 30-50%';
    } else if (diff <= 30) {
      status = 'WARNING (8-30 Days)';
      recommendation = 'Promote Front Display & Bundling';
    }

    return {
      'Batch Number': b.batchNumber,
      'Product Name': b.product.name,
      'SKU Code': b.product.sku,
      'Category': b.product.category || 'General',
      'Store Location': b.store.name,
      'Quantity On Hand': b.quantity,
      'Cost Price (INR)': b.costPrice,
      'Batch Value (INR)': totalValue,
      'Manufacture Date': b.manufactureDate ? new Date(b.manufactureDate).toLocaleDateString('en-IN') : '-',
      'Expiry Date': exp.toLocaleDateString('en-IN'),
      'Days to Expiry': diff,
      'Shelf Status': status,
      'Action Recommendation': recommendation,
    };
  });

  return buildExcelBuffer([
    {
      name: 'FEFO Expiry Batches',
      data: rows,
      columnWidths: [18, 28, 16, 20, 22, 16, 16, 18, 16, 14, 15, 22, 35],
    }
  ]);
}
